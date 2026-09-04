#!/usr/bin/env bash
set -euo pipefail

api_base="${API_BASE_URL:-http://127.0.0.1:8080/api/v1}"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

request() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local output="$4"
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

lecture_body='{"name":"API smoke 講習会","description":"結合確認","academicYearStart":2026,"academicYearEnd":2026,"organizerGroupIds":[],"organizerUserIds":[],"contactGroupIds":[],"contactUserIds":[],"isIntroductory":true,"resources":[],"relations":[],"expectedRevision":0}'
request POST /lectures "$lecture_body" "$work_dir/lecture.json"
lecture_id="$(jq -r .id "$work_dir/lecture.json")"
[[ "$lecture_id" =~ ^[1-9][0-9]*$ ]]

request POST /lectures "$lecture_body" "$work_dir/lecture-2.json"
lecture_id_2="$(jq -r .id "$work_dir/lecture-2.json")"
[[ "$lecture_id_2" =~ ^[1-9][0-9]*$ ]]
test "$lecture_id_2" -eq "$((lecture_id + 1))"

session_body='{"name":"第1回","description":"通常開催","order":0,"date":"2026-09-04","startTime":"19:00","instructorIds":[],"resources":[],"replayOfSessionIds":[],"status":"published","expectedRevision":0}'
request POST "/lectures/$lecture_id/sessions" "$session_body" "$work_dir/session.json"
session_id="$(jq -r .id "$work_dir/session.json")"
[[ "$session_id" =~ ^[1-9][0-9]*$ ]]

replay_body="$(jq -cn --arg source "$session_id" '{name:"再放送",description:"",order:0,instructorIds:[],resources:[],replayOfSessionIds:[$source],status:"published",expectedRevision:0}')"
request POST "/lectures/$lecture_id/sessions" "$replay_body" "$work_dir/replay.json"
replay_id="$(jq -r .id "$work_dir/replay.json")"
[[ "$replay_id" =~ ^[1-9][0-9]*$ ]]
test "$replay_id" -eq "$((session_id + 1))"
replay_status="$(curl --silent --output "$work_dir/replay-completion.json" --write-out '%{http_code}' -X PUT "$api_base/sessions/$replay_id/completion")"
test "$replay_status" = 400

request PUT "/sessions/$session_id/completion" '' "$work_dir/completion.json"
request GET "/lectures/$lecture_id" '' "$work_dir/lecture-completed.json"
jq -e --arg session "$session_id" '.sessions[] | select(.id == $session) | .isCompleted == true' "$work_dir/lecture-completed.json" >/dev/null
jq -e --arg replay "$replay_id" 'any(.sessions[]; .id == $replay and .isReplay == true)' "$work_dir/lecture-completed.json" >/dev/null

flow_text=$'# 準備\n\n{{ lecture.name }}\n\n- [ ]{#confirm-purpose} 目的を確認する'
flow_class_body="$(jq -cn --arg text "$flow_text" '{name:"事前確認",type:"lecture_pre",text:$text,listed:true,expectedRevision:0}')"
request POST /flow-classes "$flow_class_body" "$work_dir/flow-class.json"
flow_class_id="$(jq -r .id "$work_dir/flow-class.json")"
flow_class_revision="$(jq -r .revision "$work_dir/flow-class.json")"
request POST /flows "$(jq -cn --arg class "$flow_class_id" --arg target "$lecture_id" '{flowClassId:$class,targetId:$target}')" "$work_dir/flow.json"
flow_id="$(jq -r .id "$work_dir/flow.json")"

changed_text=$'# 変更後\n\n- [ ]{#changed} 新しい内容'
changed_class_body="$(jq -cn --arg text "$changed_text" --argjson revision "$flow_class_revision" '{name:"事前確認 改訂",type:"lecture_pre",text:$text,listed:true,expectedRevision:$revision}')"
request PUT "/flow-classes/$flow_class_id" "$changed_class_body" "$work_dir/flow-class-updated.json"
request GET "/flows/$flow_id" '' "$work_dir/flow-snapshot.json"
jq -e --arg original "$flow_text" '.text == $original' "$work_dir/flow-snapshot.json" >/dev/null
request GET "/flows?targetId=$lecture_id" '' "$work_dir/flows.json"
jq -e --arg id "$flow_id" 'any(.[]; .id == $id)' "$work_dir/flows.json" >/dev/null

flow_revision="$(jq -r .revision "$work_dir/flow-snapshot.json")"
invalid_flow_update="$(jq -cn --argjson revision "$flow_revision" '{answers:{"answer.unknown":"x"},tasks:{},currentPage:0,status:"active",expectedRevision:$revision}')"
invalid_flow_status="$(curl --silent --output "$work_dir/flow-invalid.json" --write-out '%{http_code}' -X PUT -H 'Content-Type: application/json' --data "$invalid_flow_update" "$api_base/flows/$flow_id")"
test "$invalid_flow_status" = 400
flow_update="$(jq -cn --argjson revision "$flow_revision" '{answers:{},tasks:{"confirm-purpose":true},currentPage:0,status:"completed",expectedRevision:$revision}')"
request PUT "/flows/$flow_id" "$flow_update" "$work_dir/flow-completed.json"
jq -e '.status == "completed"' "$work_dir/flow-completed.json" >/dev/null
completed_flow_revision="$(jq -r .revision "$work_dir/flow-completed.json")"
completed_flow_update="$(jq -cn --argjson revision "$completed_flow_revision" '{answers:{},tasks:{"confirm-purpose":true},currentPage:0,status:"active",expectedRevision:$revision}')"
completed_flow_status="$(curl --silent --output "$work_dir/flow-reopen.json" --write-out '%{http_code}' -X PUT -H 'Content-Type: application/json' --data "$completed_flow_update" "$api_base/flows/$flow_id")"
test "$completed_flow_status" = 409

stage_id="$(uuidgen | tr '[:upper:]' '[:lower:]')"
roadmap_body="$(jq -cn --arg lecture "$lecture_id" --arg stage "$stage_id" '{title:"API smoke ロードマップ",description:"結合確認",audience:"全員",published:true,stages:[{id:$stage,title:"基礎",description:"",items:[{lectureId:$lecture,note:""}]}],expectedRevision:0}')"
request POST /roadmaps "$roadmap_body" "$work_dir/roadmap.json"
roadmap_id="$(jq -r .id "$work_dir/roadmap.json")"
jq -e '.progressPercent == 100 and .completedItemCount == 1' "$work_dir/roadmap.json" >/dev/null

request GET "/profiles/$traq_id" '' "$work_dir/profile.json"
jq -e --arg lecture "$lecture_id" 'any(.badges[]; .lectureId == $lecture)' "$work_dir/profile.json" >/dev/null
jq -e --arg roadmap "$roadmap_id" 'any(.roadmaps[]; .id == $roadmap and .progressPercent == 100)' "$work_dir/profile.json" >/dev/null

request GET "/history/lecture/$lecture_id" '' "$work_dir/history.json"
jq -e 'length > 0 and all(.[]; .entityType == "lecture")' "$work_dir/history.json" >/dev/null
request GET "/history/flow/$flow_id" '' "$work_dir/flow-history.json"
jq -e 'any(.[]; .attributePath == "status" and .nextValue == "completed")' "$work_dir/flow-history.json" >/dev/null

printf 'smoke ok: lecture=%s session=%s flow=%s roadmap=%s\n' "$lecture_id" "$session_id" "$flow_id" "$roadmap_id"
