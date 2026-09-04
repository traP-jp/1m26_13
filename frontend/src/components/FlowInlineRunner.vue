<script setup lang="ts">
import {
  BasiqButton,
  BasiqCard,
  BasiqCheckbox,
  BasiqFormField,
  BasiqInput,
  BasiqSwitch,
  BasiqTextarea,
} from "basiq-ui";
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";

import {
  patchFlowCheck,
  patchLectureAttribute,
  patchSessionAttribute,
  updateFlowPage,
  type Flow,
  type Lecture,
  type Session,
} from "@/api/resources";
import {
  attributeValuesEqual,
  loadEditorDrafts,
  removeEditorDraft,
  resolveEditorDraft,
  saveEditorDraft,
  type EditorAttributeDraft,
} from "@/lib/editorDraftStorage";
import { expandValues, parseFlow, type FlowNode } from "@/lib/flowParser";
import { flowApiAttributePath, flowAttributeTarget, flowFieldKind } from "@/lib/flowRuntime";

type ComplexTarget = "lecture" | "session";
type SavePhase = "idle" | "dirty" | "saving" | "saved" | "error";
type AttributeState = {
  baseValue: unknown;
  nextValue: unknown;
  phase: SavePhase;
  error: string;
  saveAgain: boolean;
};
type PublishRequest = {
  path: "session.status";
  target: "session";
  baseValue: Session["status"];
  nextValue: Session["status"];
};

const props = defineProps<{ flow: Flow; lecture: Lecture; session?: Session }>();
const emit = defineEmits<{
  "flow-updated": [flow: Flow];
  "lecture-updated": [lecture: Lecture];
  "session-updated": [session: Session];
  "open-complex": [path: string, target: ComplexTarget];
  "request-publish": [request: PublishRequest];
}>();

const currentFlow = ref(props.flow);
const currentLecture = ref(props.lecture);
const currentSession = ref(props.session);
const pageIndex = ref(0);
const attributeStates = reactive<Record<string, AttributeState>>({});
const reviewDrafts = ref<EditorAttributeDraft[]>([]);
const checkboxSaving = ref(new Set<string>());
const moving = ref(false);
const error = ref("");
const notice = ref("");
const warning = ref("");
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
let warningTimer: ReturnType<typeof setTimeout> | undefined;

const pages = computed(() => parseFlow(currentFlow.value.text));
const page = computed(() => pages.value[pageIndex.value]);
const scalarPaths = computed(() =>
  pages.value.flatMap((entry) =>
    entry.nodes
      .filter(
        (node): node is Extract<FlowNode, { kind: "input" }> =>
          node.kind === "input" && node.mode === "scalar",
      )
      .map((node) => node.path),
  ),
);
const values = computed<Record<string, unknown>>(() => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(currentLecture.value)) {
    if (key !== "sessions") result[`lecture.${key}`] = value;
  }
  if (currentSession.value) {
    for (const [key, value] of Object.entries(currentSession.value)) {
      result[`session.${key}`] = value;
    }
  }
  for (const [path, state] of Object.entries(attributeStates)) result[path] = state.nextValue;
  return result;
});

const labels: Record<string, string> = {
  "lecture.name": "講習会名",
  "lecture.description": "講習会の説明",
  "lecture.academicYearStart": "開始学年度",
  "lecture.academicYearEnd": "終了学年度",
  "lecture.fieldId": "分野",
  "lecture.organizer": "運営担当",
  "lecture.targetAudience": "対象者",
  "lecture.isIntroductory": "その分野の0→1講習",
  "lecture.traqChannelId": "関連traQチャンネルID",
  "lecture.material": "講義資料",
  "lecture.resources": "関連Resource",
  "lecture.relations": "関連する講習会",
  "session.name": "開催名",
  "session.description": "開催の説明",
  "session.date": "開催日",
  "session.startTime": "開始時刻",
  "session.location": "場所",
  "session.knoqUrl": "knoQイベントURL",
  "session.instructorId": "講師",
  "session.material": "講義資料",
  "session.resources": "関連Resource",
  "session.replayOfSessionIds": "再放送・総集編の元Session",
  "session.status": "公開状態",
};

function targetFor(path: string): ComplexTarget | undefined {
  return flowAttributeTarget(path, Boolean(currentSession.value));
}

function apiAttributePath(path: string) {
  return flowApiAttributePath(path);
}

function serverValue(path: string) {
  const target = targetFor(path);
  const key = apiAttributePath(path);
  if (target === "lecture") return currentLecture.value[key as keyof Lecture];
  if (target === "session") return currentSession.value?.[key as keyof Session];
  return undefined;
}

function draftFor(path: string, state: AttributeState): EditorAttributeDraft | undefined {
  const target = targetFor(path);
  const entity = target === "lecture" ? currentLecture.value : currentSession.value;
  if (!target || !entity) return undefined;
  return {
    entityType: target,
    entityId: entity.id,
    attributePath: path,
    baseValue: state.baseValue,
    nextValue: state.nextValue,
    updatedAt: new Date().toISOString(),
  };
}

function stateFor(path: string) {
  attributeStates[path] ??= {
    baseValue: serverValue(path),
    nextValue: serverValue(path),
    phase: "idle",
    error: "",
    saveAgain: false,
  };
  return attributeStates[path]!;
}

function clearSaveTimer(path: string) {
  const timer = saveTimers.get(path);
  if (timer) clearTimeout(timer);
  saveTimers.delete(path);
}

function scheduleSave(path: string, delay = 600) {
  clearSaveTimer(path);
  saveTimers.set(
    path,
    setTimeout(() => {
      saveTimers.delete(path);
      void persistAttribute(path);
    }, delay),
  );
}

function setFieldValue(path: string, nextValue: unknown, immediate = false) {
  const state = stateFor(path);
  state.nextValue = nextValue;
  state.error = "";
  if (attributeValuesEqual(state.baseValue, nextValue)) {
    state.phase = "idle";
    clearSaveTimer(path);
    removeDraft(path);
    return;
  }
  state.phase = state.phase === "saving" ? "saving" : "dirty";
  const draft = draftFor(path, state);
  if (draft) saveEditorDraft(currentLecture.value.id, draft);
  if (state.phase === "saving") state.saveAgain = true;
  else scheduleSave(path, immediate ? 0 : 600);
}

function removeDraft(path: string) {
  const target = targetFor(path);
  const entity = target === "lecture" ? currentLecture.value : currentSession.value;
  if (!target || !entity) return;
  removeEditorDraft(currentLecture.value.id, {
    entityType: target,
    entityId: entity.id,
    attributePath: path,
  });
}

async function persistAttribute(path: string) {
  const target = targetFor(path);
  const state = stateFor(path);
  if (!target) return;
  if (attributeValuesEqual(state.baseValue, state.nextValue)) {
    state.phase = "idle";
    state.saveAgain = false;
    removeDraft(path);
    return;
  }
  if (state.phase === "saving") {
    state.saveAgain = true;
    return;
  }

  clearSaveTimer(path);
  const submittedBase = state.baseValue;
  const submittedValue = state.nextValue;
  state.phase = "saving";
  state.error = "";
  try {
    if (target === "lecture") {
      const result = await patchLectureAttribute(currentLecture.value.id, {
        attributePath: apiAttributePath(path),
        baseValue: submittedBase,
        nextValue: submittedValue,
      });
      currentLecture.value = result.lecture;
      emit("lecture-updated", result.lecture);
      finishAttributeSave(path, result.lecture[apiAttributePath(path) as keyof Lecture]);
      if (result.conflictDetected) showConflictWarning();
    } else if (currentSession.value) {
      const result = await patchSessionAttribute(currentSession.value.id, {
        attributePath: apiAttributePath(path),
        baseValue: submittedBase,
        nextValue: submittedValue,
      });
      currentSession.value = result.session;
      emit("session-updated", result.session);
      finishAttributeSave(path, result.session[apiAttributePath(path) as keyof Session]);
      if (result.conflictDetected) showConflictWarning();
    }
  } catch (reason) {
    state.phase = "error";
    state.error = reason instanceof Error ? reason.message : "保存できませんでした";
  }
}

function finishAttributeSave(path: string, savedValue: unknown) {
  const state = stateFor(path);
  state.baseValue = savedValue;
  const hasNewerValue = !attributeValuesEqual(state.nextValue, savedValue);
  if (hasNewerValue) {
    state.saveAgain = false;
    state.phase = "dirty";
    const draft = draftFor(path, state);
    if (draft) saveEditorDraft(currentLecture.value.id, draft);
    scheduleSave(path);
    return;
  }
  state.nextValue = savedValue;
  state.saveAgain = false;
  state.phase = "saved";
  removeDraft(path);
  setTimeout(() => {
    if (state.phase === "saved") state.phase = "idle";
  }, 1800);
}

function flushField(path: string) {
  clearSaveTimer(path);
  void persistAttribute(path);
}

function showConflictWarning() {
  warning.value = "ほかの編集後にこの値を保存しました。変更履歴で両方の更新を確認できます。";
  if (warningTimer) clearTimeout(warningTimer);
  warningTimer = setTimeout(() => (warning.value = ""), 6000);
}

function showNotice(message: string) {
  notice.value = message;
  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => (notice.value = ""), 2400);
}

function restoreDrafts() {
  const relevantPaths = new Set(scalarPaths.value);
  // Publication always goes through the parent's impact-confirmation dialog.
  relevantPaths.delete("session.status");
  const manual: EditorAttributeDraft[] = [];
  for (const draft of loadEditorDrafts(currentLecture.value.id)) {
    const target = targetFor(draft.attributePath);
    const entity = target === "lecture" ? currentLecture.value : currentSession.value;
    if (!entity || entity.id !== draft.entityId || !relevantPaths.has(draft.attributePath))
      continue;
    const resolution = resolveEditorDraft(draft, serverValue(draft.attributePath));
    if (resolution.action === "discard") {
      removeDraft(draft.attributePath);
    } else if (resolution.action === "auto_restore") {
      const state = stateFor(draft.attributePath);
      state.baseValue = serverValue(draft.attributePath);
      state.nextValue = draft.nextValue;
      state.phase = "dirty";
      scheduleSave(draft.attributePath);
    } else {
      manual.push(draft);
    }
  }
  reviewDrafts.value = manual;
}

async function copyDraft(draft: EditorAttributeDraft) {
  const value =
    typeof draft.nextValue === "string"
      ? draft.nextValue
      : JSON.stringify(draft.nextValue, null, 2);
  await navigator.clipboard.writeText(value ?? "");
  showNotice("未送信の値をコピーしました。");
}

function discardDraft(draft: EditorAttributeDraft) {
  removeEditorDraft(currentLecture.value.id, draft);
  reviewDrafts.value = reviewDrafts.value.filter((entry) => entry !== draft);
}

function asString(value: unknown) {
  return value === undefined || value === null ? "" : String(value);
}

function requestPublish(checked: boolean) {
  if (!currentSession.value) return;
  emit("request-publish", {
    path: "session.status",
    target: "session",
    baseValue: currentSession.value.status,
    nextValue: checked ? "published" : "draft",
  });
}

function openComplex(path: string) {
  const target = targetFor(path);
  if (target) emit("open-complex", path, target);
}

async function toggleCheckbox(node: Extract<FlowNode, { kind: "task" }>, checked: boolean) {
  const key = `${node.pageIndex}:${node.checkboxIndex}`;
  if (checkboxSaving.value.has(key)) return;
  checkboxSaving.value = new Set([...checkboxSaving.value, key]);
  error.value = "";
  try {
    const result = await patchFlowCheck(currentFlow.value.id, {
      pageIndex: node.pageIndex,
      checkboxIndex: node.checkboxIndex,
      checked,
      expectedText: node.text,
    });
    currentFlow.value = result.flow;
    emit("flow-updated", result.flow);
    showNotice("チェックを保存しました。");
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "チェックを保存できませんでした";
  } finally {
    const next = new Set(checkboxSaving.value);
    next.delete(key);
    checkboxSaving.value = next;
  }
}

async function movePage(nextPage: number) {
  if (moving.value || nextPage < 0 || nextPage >= pages.value.length) return;
  const previousPage = pageIndex.value;
  pageIndex.value = nextPage;
  moving.value = true;
  error.value = "";
  try {
    const result = await updateFlowPage(currentFlow.value.id, nextPage);
    currentFlow.value = result.flow;
    emit("flow-updated", result.flow);
  } catch (reason) {
    pageIndex.value = previousPage;
    error.value = reason instanceof Error ? reason.message : "ページ位置を保存できませんでした";
  } finally {
    moving.value = false;
  }
}

async function copy(value: string) {
  await navigator.clipboard.writeText(expandValues(value, values.value));
  showNotice("文章をコピーしました。");
}

function syncEntityValues() {
  for (const path of scalarPaths.value) {
    const state = attributeStates[path];
    if (!state || state.phase === "saving" || state.phase === "dirty" || state.phase === "error") {
      continue;
    }
    const value = serverValue(path);
    state.baseValue = value;
    state.nextValue = value;
  }
}

watch(
  () => props.flow,
  (flow) => {
    currentFlow.value = flow;
    pageIndex.value = Math.min(flow.currentPage, Math.max(parseFlow(flow.text).length - 1, 0));
  },
  { immediate: true },
);

watch(
  () => props.lecture,
  (lecture) => {
    currentLecture.value = lecture;
    syncEntityValues();
  },
);

watch(
  () => props.session,
  (session) => {
    currentSession.value = session;
    syncEntityValues();
  },
);

watch(
  scalarPaths,
  () => {
    for (const path of scalarPaths.value) stateFor(path);
    restoreDrafts();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  for (const timer of saveTimers.values()) clearTimeout(timer);
  if (noticeTimer) clearTimeout(noticeTimer);
  if (warningTimer) clearTimeout(warningTimer);
});
</script>

<template>
  <section class="inline-runner">
    <div v-if="reviewDrafts.length" class="draft-review" role="status">
      <strong>別の編集と重なった未送信の値があります</strong>
      <p>自動では反映しません。必要な値をコピーしてから破棄してください。</p>
      <div v-for="draft in reviewDrafts" :key="draft.attributePath" class="draft-review-row">
        <span>{{ labels[draft.attributePath] || draft.attributePath }}</span>
        <div>
          <BasiqButton tone="neutral" variant="outline" type="button" @click="copyDraft(draft)"
            >値をコピー</BasiqButton
          >
          <BasiqButton tone="neutral" variant="outline" type="button" @click="discardDraft(draft)"
            >破棄</BasiqButton
          >
        </div>
      </div>
    </div>

    <template v-if="page">
      <header class="runner-header">
        <div>
          <p class="eyebrow">FLOW · {{ pageIndex + 1 }}/{{ pages.length }}</p>
          <h2>{{ page.title }}</h2>
          <p>
            {{
              currentFlow.type === "lecture_pre"
                ? "講習会の事前"
                : currentFlow.type === "lecture_post"
                  ? "講習会の事後"
                  : "各開催のメイン"
            }}
          </p>
        </div>
      </header>

      <ol
        v-if="pages.length > 1"
        class="flow-progress"
        :style="{ gridTemplateColumns: `repeat(${pages.length}, minmax(0, 1fr))` }"
        aria-label="Flowのページ"
      >
        <li
          v-for="(entry, index) in pages"
          :key="`${index}-${entry.title}`"
          :class="{ current: index === pageIndex }"
        >
          <span>{{ index + 1 }}</span
          ><small>{{ entry.title }}</small>
        </li>
      </ol>

      <p v-if="warning" class="notice warning" role="status">{{ warning }}</p>
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      <p v-if="error" class="notice error" role="alert">{{ error }}</p>

      <BasiqCard class="flow-card">
        <div class="flow-content">
          <template v-for="(node, index) in page.nodes" :key="index">
            <p v-if="node.kind === 'paragraph'" class="prose">
              {{ expandValues(node.text, values) }}
            </p>

            <div v-else-if="node.kind === 'input' && node.mode === 'edit'" class="complex-field">
              <span
                ><strong>{{ labels[node.path] || node.path }}</strong
                ><small>複数の値をまとめて編集します。</small></span
              >
              <BasiqButton
                tone="neutral"
                variant="outline"
                type="button"
                @click="openComplex(node.path)"
                >編集</BasiqButton
              >
            </div>

            <div v-else-if="node.kind === 'input'" class="attribute-field">
              <BasiqFormField
                v-if="flowFieldKind(node.path) === 'textarea'"
                :label="labels[node.path] || node.path"
                ><BasiqTextarea
                  :model-value="asString(stateFor(node.path).nextValue)"
                  :rows="4"
                  :invalid="stateFor(node.path).phase === 'error'"
                  @update:model-value="setFieldValue(node.path, $event)"
                  @blur="flushField(node.path)"
              /></BasiqFormField>

              <BasiqFormField
                v-else-if="
                  flowFieldKind(node.path) === 'text' || flowFieldKind(node.path) === 'url'
                "
                :label="labels[node.path] || node.path"
                ><BasiqInput
                  :model-value="asString(stateFor(node.path).nextValue)"
                  :type="flowFieldKind(node.path) === 'url' ? 'url' : 'text'"
                  :invalid="stateFor(node.path).phase === 'error'"
                  @update:model-value="setFieldValue(node.path, $event)"
                  @blur="flushField(node.path)"
              /></BasiqFormField>

              <label v-else-if="flowFieldKind(node.path) === 'number'" class="native-field">
                <span>{{ labels[node.path] || node.path }}</span>
                <input
                  type="number"
                  min="2000"
                  max="2200"
                  :value="stateFor(node.path).nextValue as number"
                  @input="
                    setFieldValue(node.path, Number(($event.target as HTMLInputElement).value))
                  "
                  @blur="flushField(node.path)"
                />
              </label>

              <label
                v-else-if="
                  flowFieldKind(node.path) === 'date' || flowFieldKind(node.path) === 'time'
                "
                class="native-field"
              >
                <span>{{ labels[node.path] || node.path }}</span>
                <input
                  :type="flowFieldKind(node.path)"
                  :value="asString(stateFor(node.path).nextValue)"
                  @input="setFieldValue(node.path, ($event.target as HTMLInputElement).value)"
                  @blur="flushField(node.path)"
                />
              </label>

              <div v-else-if="flowFieldKind(node.path) === 'boolean'" class="switch-field">
                <BasiqSwitch
                  :model-value="Boolean(stateFor(node.path).nextValue)"
                  @update:model-value="setFieldValue(node.path, $event, true)"
                  >{{ labels[node.path] || node.path }}</BasiqSwitch
                >
              </div>

              <div v-else-if="flowFieldKind(node.path) === 'status'" class="switch-field">
                <BasiqSwitch
                  :model-value="currentSession?.status === 'published'"
                  @update:model-value="requestPublish"
                  >{{ currentSession?.status === "published" ? "公開" : "下書き" }}</BasiqSwitch
                >
              </div>

              <small
                v-if="stateFor(node.path).phase !== 'idle'"
                :class="['save-state', stateFor(node.path).phase]"
                role="status"
              >
                {{
                  stateFor(node.path).phase === "dirty"
                    ? "保存待ち"
                    : stateFor(node.path).phase === "saving"
                      ? "保存中…"
                      : stateFor(node.path).phase === "saved"
                        ? "保存済み"
                        : stateFor(node.path).error
                }}
              </small>
            </div>

            <label v-else-if="node.kind === 'task'" class="flow-task">
              <BasiqCheckbox
                :model-value="node.checked"
                :disabled="checkboxSaving.has(`${node.pageIndex}:${node.checkboxIndex}`)"
                @update:model-value="toggleCheckbox(node, $event)"
              />
              <span>{{ expandValues(node.text, values) }}</span>
            </label>

            <div v-else-if="node.kind === 'copy'" class="copy-panel">
              <pre>{{ expandValues(node.text, values) }}</pre>
              <BasiqButton tone="neutral" variant="outline" type="button" @click="copy(node.text)"
                >コピー</BasiqButton
              >
            </div>
            <pre v-else-if="node.kind === 'code'" class="copy-panel">{{ node.text }}</pre>
          </template>
        </div>
      </BasiqCard>

      <footer v-if="pages.length > 1" class="runner-actions">
        <BasiqButton
          v-if="pageIndex > 0"
          variant="outline"
          tone="neutral"
          type="button"
          :disabled="moving"
          @click="movePage(pageIndex - 1)"
          >前へ</BasiqButton
        >
        <span v-else></span>
        <BasiqButton
          v-if="pageIndex < pages.length - 1"
          type="button"
          :disabled="moving"
          @click="movePage(pageIndex + 1)"
          >次へ</BasiqButton
        >
      </footer>
    </template>
    <p v-else class="notice error" role="alert">Flow本文に表示できるページがありません。</p>
  </section>
</template>

<style scoped>
/* stylelint-disable no-descending-specificity */
.inline-runner {
  display: grid;
  gap: 18px;
}

.runner-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.runner-header h2 {
  font-size: 28px;
  letter-spacing: -0.025em;
}

.runner-header p:last-child {
  margin-top: 5px;
  color: var(--basiq-color-content-subtle);
}

.flow-progress {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.flow-progress li {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 5px;
  color: var(--basiq-color-content-subtle);
  text-align: center;
}

.flow-progress li::before {
  position: absolute;
  z-index: 0;
  top: 13px;
  right: 50%;
  width: 100%;
  height: 2px;
  background: var(--basiq-color-border-separator);
  content: "";
}

.flow-progress li:first-child::before {
  display: none;
}

.flow-progress li > span {
  position: relative;
  z-index: 1;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 2px solid var(--basiq-color-border-control);
  border-radius: 50%;
  background: var(--basiq-color-surface-base);
  font-size: 11px;
  font-weight: 700;
}

.flow-progress li.current {
  color: var(--basiq-color-content-accent);
}

.flow-progress li.current > span {
  border-color: var(--basiq-color-accent-default);
  color: var(--basiq-color-content-on-accent);
  background: var(--basiq-color-accent-default);
}

.flow-progress small {
  max-width: 140px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.35;
}

.flow-card {
  border: 1px solid var(--basiq-color-border-separator);
}

.flow-content {
  display: grid;
  gap: 18px;
}

.prose {
  white-space: pre-line;
}

.attribute-field {
  display: grid;
  gap: 5px;
}

.native-field {
  display: grid;
  gap: 6px;
  font-weight: 500;
}

.native-field > span {
  font-size: 12px;
}

.native-field input {
  width: 100%;
  min-height: 40px;
  padding: 8px 11px;
  border: 1px solid var(--basiq-color-border-control);
  border-radius: var(--basiq-radius-sm);
  color: var(--basiq-color-content-default);
  background: var(--basiq-color-surface-container);
  font: inherit;
}

.switch-field {
  min-height: 48px;
  display: flex;
  align-items: center;
}

.save-state {
  justify-self: end;
  color: var(--basiq-color-content-subtle);
  font-size: 10px;
}

.save-state.saved {
  color: var(--app-success);
}

.save-state.error {
  color: var(--basiq-color-content-danger);
}

.complex-field,
.draft-review-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
}

.complex-field > span,
.draft-review-row > span {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.complex-field small,
.draft-review p {
  color: var(--basiq-color-content-subtle);
  font-size: 11px;
}

.flow-task {
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
  background: var(--basiq-color-surface-base);
}

.copy-panel {
  display: grid;
  justify-items: start;
  gap: 10px;
  margin: 0;
  padding: 15px;
  overflow: auto;
  border-radius: var(--basiq-radius-sm);
  background: var(--basiq-color-surface-muted);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.runner-actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.draft-review {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--basiq-color-content-danger) 35%, white);
  border-radius: var(--basiq-radius-sm);
  background: color-mix(in srgb, var(--basiq-color-content-danger) 5%, white);
}

.draft-review-row > div {
  display: flex;
  gap: 8px;
}

.notice.warning {
  border-color: color-mix(in srgb, #9a6700 35%, white);
  color: #704c00;
  background: #fff8dc;
}

@media (width <= 760px) {
  .runner-header h2 {
    font-size: 22px;
  }

  .complex-field,
  .draft-review-row {
    align-items: stretch;
    flex-direction: column;
  }

  .draft-review-row > div > * {
    flex: 1;
  }
}
</style>
