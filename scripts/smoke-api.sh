#!/usr/bin/env bash
set -euo pipefail

api_base="${API_BASE_URL:-http://127.0.0.1:8080/api/v1}"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

request() {
  local method="$1" path="$2" body="${3:-}" output="$4"
  if [[ -n "$body" ]]; then
    curl --fail --silent --show-error -X "$method" -H 'Content-Type: application/json' --data "$body" "$api_base$path" >"$output"
  else
    curl --fail --silent --show-error -X "$method" "$api_base$path" >"$output"
  fi
}

request GET /health '' "$work_dir/health.json"
jq -e '.status == "ok"' "$work_dir/health.json" >/dev/null
request GET /users/me '' "$work_dir/me.json"
traq_id="$(jq -r .traqId "$work_dir/me.json")"

create_flow_class() {
  local name="$1" type="$2" text="$3" output="$4"
  request POST /flow-classes "$(jq -cn --arg name "$name" --arg type "$type" --arg text "$text" \
    '{name:$name,type:$type,text:$text,listed:true,expectedRevision:0}')" "$output"
  jq -r .id "$output"
}

pre_id="$(create_flow_class '事前Flow' lecture_pre $'# 準備\n\n{{ lecture.name }}\n\n- [ ] 目的を確認する' "$work_dir/pre.json")"
main_id="$(create_flow_class '開催Flow' session_main $'# 開催\n\n{{ session.name }}\n\n- [ ] 実施する' "$work_dir/main.json")"
post_id="$(create_flow_class '事後Flow' lecture_post $'# 事後\n\n- [ ] 振り返る' "$work_dir/post.json")"
replacement_id="$(create_flow_class '開催Flow 改訂' session_main $'# 開催 改訂\n\n- [ ] 改訂内容を確認する' "$work_dir/replacement.json")"

lecture_body="$(jq -cn --arg pre "$pre_id" --arg main "$main_id" --arg post "$post_id" \
  '{name:"API smoke 講習会",lecturePreFlowClassId:$pre,sessionMainFlowClassId:$main,lecturePostFlowClassId:$post}')"
request POST /lectures "$lecture_body" "$work_dir/workspace.json"
lecture_id="$(jq -r .lecture.id "$work_dir/workspace.json")"
session_id="$(jq -r '.lecture.sessions[0].id' "$work_dir/workspace.json")"
session_flow_id="$(jq -r --arg target "$session_id" '.flows[] | select(.type == "session_main" and .targetId == $target).id' "$work_dir/workspace.json")"
jq -e '.lecture.sessions | length == 1' "$work_dir/workspace.json" >/dev/null
jq -e '.flows | length == 3' "$work_dir/workspace.json" >/dev/null

request GET "/lectures/$lecture_id/workspace" '' "$work_dir/workspace-get.json"
jq -e --arg lecture "$lecture_id" '.lecture.id == $lecture and (.flows | length == 3)' "$work_dir/workspace-get.json" >/dev/null

request PATCH "/lectures/$lecture_id/attributes" \
  '{"attributePath":"name","baseValue":"API smoke 講習会","nextValue":"API smoke 更新1"}' "$work_dir/patch-1.json"
jq -e '.conflictDetected == false and .lecture.name == "API smoke 更新1"' "$work_dir/patch-1.json" >/dev/null
request PATCH "/lectures/$lecture_id/attributes" \
  '{"attributePath":"name","baseValue":"API smoke 講習会","nextValue":"API smoke 更新2"}' "$work_dir/patch-2.json"
jq -e '.conflictDetected == true and .lecture.name == "API smoke 更新2"' "$work_dir/patch-2.json" >/dev/null

request PATCH "/sessions/$session_id/attributes" \
  '{"attributePath":"status","baseValue":"draft","nextValue":"published"}' "$work_dir/publish.json"
jq -e '.conflictDetected == false and .session.status == "published"' "$work_dir/publish.json" >/dev/null
request PUT "/sessions/$session_id/completion" '' "$work_dir/completion.json"

duplicate_body="$(jq -cn --arg class "$main_id" --arg source "$session_id" \
  '{mode:"duplicate",flowClassId:$class,sourceSessionId:$source,replayOfSessionIds:[]}')"
request POST "/lectures/$lecture_id/sessions" "$duplicate_body" "$work_dir/duplicate.json"
duplicate_id="$(jq -r .session.id "$work_dir/duplicate.json")"
duplicate_flow_id="$(jq -r .flow.id "$work_dir/duplicate.json")"
jq -e --arg class "$main_id" '.session.status == "draft" and .flow.flowClassId == $class' "$work_dir/duplicate.json" >/dev/null

order_body="$(jq -cn --arg first "$duplicate_id" --arg second "$session_id" \
  '{items:[{sessionId:$first,order:0},{sessionId:$second,order:1}]}')"
request PUT "/lectures/$lecture_id/session-order" "$order_body" "$work_dir/reorder.json"
jq -e --arg first "$duplicate_id" --arg second "$session_id" \
  'any(.[]; .id == $first and .order == 0) and any(.[]; .id == $second and .order == 1)' "$work_dir/reorder.json" >/dev/null

request PATCH "/flows/$session_flow_id/checks" \
  '{"pageIndex":0,"checkboxIndex":0,"checked":true,"expectedText":"実施する"}' "$work_dir/check.json"
jq -e '.flow.text | contains("- [x] 実施する")' "$work_dir/check.json" >/dev/null
request PATCH "/flows/$session_flow_id/page" '{"currentPage":0}' "$work_dir/page.json"
jq -e '.flow.currentPage == 0' "$work_dir/page.json" >/dev/null
request PUT "/flows/$duplicate_flow_id/flow-class" "$(jq -cn --arg id "$replacement_id" '{flowClassId:$id}')" "$work_dir/replace.json"
jq -e --arg id "$replacement_id" '.flow.flowClassId == $id and (.flow.text | contains("改訂内容"))' "$work_dir/replace.json" >/dev/null

request GET "/flows?targetType=session&targetId=$session_id" '' "$work_dir/flows.json"
jq -e --arg id "$session_flow_id" 'length == 1 and .[0].id == $id' "$work_dir/flows.json" >/dev/null
request GET "/lectures/$lecture_id/history?category=data" '' "$work_dir/data-history.json"
jq -e 'any(.[]; .attributePath == "name")' "$work_dir/data-history.json" >/dev/null
request GET "/lectures/$lecture_id/history?category=flow" '' "$work_dir/flow-history.json"
jq -e 'length > 0' "$work_dir/flow-history.json" >/dev/null
request GET "/lectures/$lecture_id/export" '' "$work_dir/export.json"
jq -e --arg lecture "$lecture_id" '.schemaVersion == 1 and .lecture.id == $lecture' "$work_dir/export.json" >/dev/null

request GET "/profiles/$traq_id" '' "$work_dir/profile.json"
request GET "/history/lecture/$lecture_id" '' "$work_dir/history.json"
jq -e 'length > 0' "$work_dir/history.json" >/dev/null

printf 'smoke ok: lecture=%s sessions=%s,%s flows=%s,%s\n' \
  "$lecture_id" "$session_id" "$duplicate_id" "$session_flow_id" "$duplicate_flow_id"
