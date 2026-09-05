<script setup lang="ts">
import {
  BasiqButton,
  BasiqCard,
  BasiqCheckbox,
  BasiqFormField,
  BasiqInput,
  BasiqSwitch,
  BasiqTabsContent,
  BasiqTabsList,
  BasiqTabsRoot,
  BasiqTabsTrigger,
  BasiqTextarea,
} from "basiq-ui";
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  createLecture,
  createSession,
  exportLecture,
  getDirectory,
  getLectureHistory,
  getLectureWorkspace,
  inheritLecture,
  listFields,
  listFlowClasses,
  listLectures,
  patchLectureAttribute,
  patchSessionAttribute,
  reorderSessions,
  replaceFlowClass,
  type Directory,
  type Field,
  type Flow,
  type FlowClass,
  type Lecture,
  type LectureWorkspace,
  type Session,
} from "@/api/resources";
import AppIcon from "@/components/AppIcon.vue";
import FlowInlineRunner from "@/components/FlowInlineRunner.vue";
import {
  loadEditorDrafts,
  removeEditorDraft,
  resolveEditorDraft,
  saveEditorDraft,
  type EditorAttributeDraft,
} from "@/lib/editorDraftStorage";
import { parseFlow } from "@/lib/flowParser";
import { loadOptional } from "@/lib/optionalLoad";

type Target = "lecture" | "session";
type Modal =
  | "session"
  | "complex"
  | "publish"
  | "replace"
  | "order"
  | "history"
  | "drafts"
  | "more"
  | "";
type HistoryEvent = Awaited<ReturnType<typeof getLectureHistory>>[number];
type EditableResource = { title: string; url: string };
type EditableRelation = { type: Lecture["relations"][number]["type"]; toLectureId: string };

const route = useRoute();
const router = useRouter();
const lectureId = computed(() => String(route.params.id ?? ""));
const isNew = computed(() => !lectureId.value);
const createMode = ref<"" | "blank" | "inherit">("");
const inheritQuery = ref("");
const inheritYear = ref(new Date().getFullYear());
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const toast = ref("");
const activeTab = ref("");
const modal = ref<Modal>("");
const workspace = ref<LectureWorkspace>();
const directory = ref<Directory>({ users: [], groups: [] });
const fields = ref<Field[]>([]);
const lectures = ref<Lecture[]>([]);
const flowClasses = ref<FlowClass[]>([]);
const directoryError = ref("");
const fieldsError = ref("");
const flowClassesError = ref("");
const lecturesError = ref("");
const historyCategory = ref<"data" | "flow">("data");
const history = ref<HistoryEvent[]>([]);
const historyLoading = ref(false);
const reviewDrafts = ref<EditorAttributeDraft[]>([]);
const buffers = reactive<Record<string, unknown>>({});
const baseValues = reactive<Record<string, unknown>>({});
const saveStates = reactive<Record<string, "idle" | "dirty" | "saving" | "saved" | "error">>({});
const flowSaveStates = reactive<Record<string, "idle" | "dirty" | "saving" | "saved" | "error">>(
  {},
);
const timers = new Map<string, number>();

const createForm = reactive({
  name: "",
  lecturePreFlowClassId: "",
  sessionMainFlowClassId: "",
  lecturePostFlowClassId: "",
});
const sessionForm = reactive({
  mode: "empty" as "empty" | "duplicate",
  sourceSessionId: "",
  flowClassId: "",
  replayOfSessionIds: [] as string[],
});
const complexForm = reactive({
  target: "lecture" as Target,
  sessionId: "",
  path: "",
  value: undefined as unknown,
});
const publishForm = reactive({
  sessionId: "",
  baseValue: "draft" as Session["status"],
  nextValue: "published" as Session["status"],
});
const replaceForm = reactive({ flowId: "", flowClassId: "" });
const orderIds = ref<string[]>([]);
const draggingId = ref("");

const lecture = computed(() => workspace.value?.lecture);
const sessions = computed(() =>
  [...(lecture.value?.sessions ?? [])].sort(
    (a, b) => a.order - b.order || Number(a.id) - Number(b.id),
  ),
);
const publishedCount = computed(
  () => sessions.value.filter((entry) => entry.status === "published").length,
);
const preFlow = computed(() => workspace.value?.flows.find((flow) => flow.type === "lecture_pre"));
const postFlow = computed(() =>
  workspace.value?.flows.find((flow) => flow.type === "lecture_post"),
);
const sessionTabs = computed(() =>
  sessions.value.map((session, index) => ({
    session,
    flow: workspace.value?.flows.find(
      (entry) => entry.type === "session_main" && entry.targetId === session.id,
    ),
    label: `第${index + 1}回`,
  })),
);
const activeFlow = computed(() =>
  workspace.value?.flows.find((flow) => flow.id === activeTab.value),
);
const activeSession = computed(() =>
  activeFlow.value?.type === "session_main"
    ? sessions.value.find((session) => session.id === activeFlow.value?.targetId)
    : undefined,
);
const replacementCandidates = computed(() => {
  const flow = workspace.value?.flows.find((entry) => entry.id === replaceForm.flowId);
  return flowClasses.value.filter((entry) => entry.listed && entry.type === flow?.type);
});
const inheritanceCandidates = computed(() => {
  const words = inheritQuery.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return [...lectures.value]
    .filter((entry) => {
      const fieldName = fields.value.find((field) => field.id === entry.fieldId)?.name ?? "";
      const haystack = [
        entry.name,
        entry.description,
        entry.academicYearStart,
        entry.academicYearEnd,
        entry.organizer?.groupName,
        fieldName,
      ]
        .filter((value) => value !== undefined && value !== null)
        .join(" ")
        .toLowerCase();
      return words.every((word) => haystack.includes(word));
    })
    .sort((a, b) => b.academicYearStart - a.academicYearStart || a.name.localeCompare(b.name));
});
const normalOrderIds = computed(() =>
  orderIds.value.filter((id) => !sessions.value.find((entry) => entry.id === id)?.isReplay),
);
const editorSaveLabel = computed(() => {
  const phases = [...Object.values(saveStates), ...Object.values(flowSaveStates)];
  if (phases.includes("error")) return "保存に失敗しました";
  if (phases.includes("saving")) return "保存中…";
  if (phases.includes("dirty")) return "変更を保存します";
  if (phases.includes("saved")) return "保存しました";
  return "変更は自動で保存されます";
});
const supportWarnings = computed(
  () =>
    [
      directoryError.value &&
        "担当者・講師の候補を取得できません。既存値とほかの項目は編集できます。",
      fieldsError.value && "分野の候補を取得できません。現在の分野は変更せず表示します。",
      flowClassesError.value && "Flow候補を取得できません。現在のFlowはそのまま利用できます。",
      lecturesError.value && "関連講習会の候補を取得できません。既存のつながりは保持されます。",
    ].filter(Boolean) as string[],
);

const scalarLectureFields = [
  ["name", "講習会名", "text"],
  ["description", "講習会の説明", "textarea"],
  ["targetAudience", "対象者", "textarea"],
  ["traqChannelId", "関連traQチャンネルID", "text"],
] as const;
const sessionLanes = [
  ["name", "開催名", "text"],
  ["description", "開催の説明", "textarea"],
  ["date", "開催日", "date"],
  ["startTime", "開始時刻", "time"],
  ["location", "場所", "text"],
  ["knoqUrl", "knoQイベントURL", "url"],
] as const;

function showToast(message: string) {
  toast.value = message;
  window.setTimeout(() => {
    if (toast.value === message) toast.value = "";
  }, 5000);
}
function clone<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}
function bufferKey(target: Target, entityId: string, path: string) {
  return `${target}:${entityId}:${path}`;
}
function entityValue(target: Target, entityId: string, path: string) {
  const entity =
    target === "lecture" ? lecture.value : sessions.value.find((entry) => entry.id === entityId);
  const value = entity?.[path as keyof typeof entity];
  if (value !== undefined) return value;
  if (["resources", "relations", "replayOfSessionIds"].includes(path)) return [];
  if (["material", "organizer"].includes(path)) return null;
  return "";
}
function fieldValue(target: Target, entityId: string, path: string) {
  const key = bufferKey(target, entityId, path);
  if (!(key in buffers)) {
    buffers[key] = clone(entityValue(target, entityId, path));
    baseValues[key] = clone(buffers[key]);
    saveStates[key] = "idle";
  }
  return buffers[key];
}
function inputValue(event: Event) {
  return (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
}
function setField(
  target: Target,
  entityId: string,
  path: string,
  value: unknown,
  immediate = false,
) {
  if (path === "status" && target === "session") {
    requestPublish(entityId, value as Session["status"]);
    return;
  }
  const key = bufferKey(target, entityId, path);
  fieldValue(target, entityId, path);
  buffers[key] = value;
  saveStates[key] = "dirty";
  const lectureKey = lecture.value?.id;
  if (lectureKey) {
    saveEditorDraft(lectureKey, {
      entityType: target,
      entityId,
      attributePath: `${target}.${path}`,
      baseValue: clone(baseValues[key]),
      nextValue: clone(value),
      updatedAt: new Date().toISOString(),
    });
  }
  const oldTimer = timers.get(key);
  if (oldTimer) clearTimeout(oldTimer);
  timers.set(
    key,
    window.setTimeout(() => void persistField(target, entityId, path), immediate ? 0 : 600),
  );
}
async function persistField(target: Target, entityId: string, path: string) {
  const key = bufferKey(target, entityId, path);
  const nextValue = clone(fieldValue(target, entityId, path));
  const baseValue = clone(baseValues[key]);
  if (JSON.stringify(nextValue) === JSON.stringify(baseValue)) return;
  saveStates[key] = "saving";
  try {
    if (target === "lecture") {
      const result = await patchLectureAttribute(entityId, {
        attributePath: path,
        baseValue,
        nextValue,
      });
      updateLecture(result.lecture);
      if (result.conflictDetected)
        showToast("同じ項目が別の編集で更新されていたため、今回の値で保存しました。");
      baseValues[key] = clone(
        result.lecture[path as keyof Lecture] ?? entityValue(target, entityId, path),
      );
    } else {
      const result = await patchSessionAttribute(entityId, {
        attributePath: path,
        baseValue,
        nextValue,
      });
      updateSession(result.session);
      if (result.conflictDetected)
        showToast("同じ項目が別の編集で更新されていたため、今回の値で保存しました。");
      baseValues[key] = clone(
        result.session[path as keyof Session] ?? entityValue(target, entityId, path),
      );
    }
    buffers[key] = clone(baseValues[key]);
    saveStates[key] = "saved";
    if (lecture.value)
      removeEditorDraft(lecture.value.id, {
        entityType: target,
        entityId,
        attributePath: `${target}.${path}`,
      });
    window.setTimeout(() => {
      if (saveStates[key] === "saved") saveStates[key] = "idle";
    }, 1400);
  } catch (reason) {
    saveStates[key] = "error";
    error.value = reason instanceof Error ? reason.message : "保存できませんでした";
  }
}
function flushField(target: Target, entityId: string, path: string) {
  const key = bufferKey(target, entityId, path);
  const timer = timers.get(key);
  if (timer) clearTimeout(timer);
  timers.delete(key);
  void persistField(target, entityId, path);
}
function updateLecture(value: Lecture) {
  if (!workspace.value) return;
  workspace.value = { ...workspace.value, lecture: value };
}
function updateSession(value: Session) {
  if (!workspace.value) return;
  const nextSessions = workspace.value.lecture.sessions.map((entry) =>
    entry.id === value.id ? value : entry,
  );
  const requiredSessions = nextSessions.filter(
    (entry) => entry.status === "published" && !entry.isReplay,
  );
  const completedSessionCount = requiredSessions.filter((entry) => entry.isCompleted).length;
  workspace.value = {
    ...workspace.value,
    lecture: {
      ...workspace.value.lecture,
      sessions: nextSessions,
      isPublished: nextSessions.some((entry) => entry.status === "published"),
      requiredSessionCount: requiredSessions.length,
      completedSessionCount,
      isCompleted: requiredSessions.length > 0 && completedSessionCount === requiredSessions.length,
    },
  };
}
function updateFlow(value: Flow) {
  if (!workspace.value) return;
  workspace.value = {
    ...workspace.value,
    flows: workspace.value.flows.map((entry) => (entry.id === value.id ? value : entry)),
  };
}

function restoreDrafts() {
  if (!lecture.value) return;
  const flowPaths = new Set(
    (workspace.value?.flows ?? []).flatMap((flow) =>
      parseFlow(flow.text).flatMap((page) =>
        page.nodes.flatMap((node) => (node.kind === "input" ? [node.path] : [])),
      ),
    ),
  );
  for (const draft of loadEditorDrafts(lecture.value.id)) {
    if (flowPaths.has(draft.attributePath)) continue;
    const path = draft.attributePath.replace(/^(lecture|session)\./, "");
    const current = entityValue(draft.entityType, draft.entityId, path);
    const resolution = resolveEditorDraft(draft, current);
    if (resolution.action === "discard") {
      removeEditorDraft(lecture.value.id, draft);
      continue;
    }
    if (resolution.action === "manual_review" || path === "status") {
      reviewDrafts.value.push(draft);
      continue;
    }
    const key = bufferKey(draft.entityType, draft.entityId, path);
    baseValues[key] = clone(draft.baseValue);
    buffers[key] = clone(draft.nextValue);
    saveStates[key] = "dirty";
    timers.set(
      key,
      window.setTimeout(() => void persistField(draft.entityType, draft.entityId, path), 600),
    );
  }
  if (reviewDrafts.value.length) modal.value = "drafts";
}

function discardDraft(draft: EditorAttributeDraft) {
  if (!lecture.value) return;
  removeEditorDraft(lecture.value.id, draft);
  reviewDrafts.value = reviewDrafts.value.filter((entry) => entry !== draft);
  if (!reviewDrafts.value.length) modal.value = "";
}

async function copyDraft(draft: EditorAttributeDraft) {
  await navigator.clipboard.writeText(
    typeof draft.nextValue === "string"
      ? draft.nextValue
      : JSON.stringify(draft.nextValue, null, 2),
  );
  showToast("未送信の値をコピーしました。");
}

async function load() {
  loading.value = true;
  error.value = "";
  directoryError.value = "";
  fieldsError.value = "";
  flowClassesError.value = "";
  lecturesError.value = "";
  try {
    const directoryLoad = loadOptional(getDirectory(), { users: [], groups: [] } as Directory);
    const fieldsLoad = loadOptional(listFields(), [] as Field[]);
    const lecturesLoad = loadOptional(listLectures({ includeDraft: true }), [] as Lecture[]);
    if (isNew.value) {
      const [flowValues, directoryResult, fieldsResult, lecturesResult] = await Promise.all([
        listFlowClasses(true),
        directoryLoad,
        fieldsLoad,
        lecturesLoad,
      ]);
      flowClasses.value = flowValues;
      directory.value = directoryResult.value;
      fields.value = fieldsResult.value;
      lectures.value = lecturesResult.value;
      directoryError.value = directoryResult.error;
      fieldsError.value = fieldsResult.error;
      lecturesError.value = lecturesResult.error;
    } else {
      const [workspaceValue, directoryResult, fieldsResult, flowResult, lecturesResult] =
        await Promise.all([
          getLectureWorkspace(lectureId.value),
          directoryLoad,
          fieldsLoad,
          loadOptional(listFlowClasses(true), [] as FlowClass[]),
          lecturesLoad,
        ]);
      workspace.value = workspaceValue;
      directory.value = directoryResult.value;
      fields.value = fieldsResult.value;
      flowClasses.value = flowResult.value;
      lectures.value = lecturesResult.value;
      directoryError.value = directoryResult.error;
      fieldsError.value = fieldsResult.error;
      flowClassesError.value = flowResult.error;
      lecturesError.value = lecturesResult.error;
      activeTab.value =
        preFlow.value?.id ?? sessionTabs.value[0]?.flow?.id ?? postFlow.value?.id ?? "bulk";
      restoreDrafts();
    }
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "編集情報を読み込めませんでした";
  } finally {
    loading.value = false;
  }
}
async function submitCreate() {
  saving.value = true;
  error.value = "";
  try {
    const created = await createLecture({ ...createForm });
    await router.replace(`/admin/lectures/${created.lecture.id}`);
    window.scrollTo({ top: 0 });
    workspace.value = created;
    activeTab.value = created.flows.find((flow) => flow.type === "lecture_pre")?.id ?? "";
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "講習会を作成できませんでした";
  } finally {
    saving.value = false;
  }
}
async function submitInherited(sourceLectureId: string) {
  saving.value = true;
  error.value = "";
  try {
    const created = await inheritLecture(sourceLectureId, {
      academicYearStart: inheritYear.value,
      academicYearEnd: inheritYear.value,
    });
    await router.replace(`/admin/lectures/${created.lecture.id}`);
    window.scrollTo({ top: 0 });
    workspace.value = created;
    activeTab.value = created.flows.find((flow) => flow.type === "lecture_pre")?.id ?? "";
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "講習会を引き継げませんでした";
  } finally {
    saving.value = false;
  }
}
function openSessionModal() {
  Object.assign(sessionForm, {
    mode: "empty",
    sourceSessionId: "",
    flowClassId:
      flowClasses.value.find((entry) => entry.listed && entry.type === "session_main")?.id ?? "",
    replayOfSessionIds: [],
  });
  modal.value = "session";
}
async function submitSession() {
  if (!lecture.value) return;
  saving.value = true;
  try {
    const result = await createSession(lecture.value.id, {
      mode: sessionForm.mode,
      flowClassId: sessionForm.flowClassId,
      ...(sessionForm.mode === "duplicate" ? { sourceSessionId: sessionForm.sourceSessionId } : {}),
      replayOfSessionIds: sessionForm.replayOfSessionIds,
    });
    workspace.value = result.workspace;
    activeTab.value = result.flow.id;
    modal.value = "";
    showToast("開催とFlowを作成しました。");
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "開催を作成できませんでした";
  } finally {
    saving.value = false;
  }
}
function openComplex(path: string, target: Target, sessionId = "") {
  const apiPath = path.replace(/^(lecture|session)\./, "");
  const entityId =
    target === "lecture" ? (lecture.value?.id ?? "") : sessionId || activeSession.value?.id || "";
  Object.assign(complexForm, {
    target,
    sessionId: entityId,
    path: apiPath,
    value: clone(entityValue(target, entityId, apiPath)),
  });
  if (apiPath === "resources" && !Array.isArray(complexForm.value)) complexForm.value = [];
  if (apiPath === "relations" && !Array.isArray(complexForm.value)) complexForm.value = [];
  if (apiPath === "replayOfSessionIds" && !Array.isArray(complexForm.value)) complexForm.value = [];
  modal.value = "complex";
}
async function saveComplex() {
  const entityId =
    complexForm.target === "lecture" ? (lecture.value?.id ?? "") : complexForm.sessionId;
  const key = bufferKey(complexForm.target, entityId, complexForm.path);
  baseValues[key] = clone(entityValue(complexForm.target, entityId, complexForm.path));
  buffers[key] = clone(complexForm.value);
  if (lecture.value) {
    saveEditorDraft(lecture.value.id, {
      entityType: complexForm.target,
      entityId,
      attributePath: `${complexForm.target}.${complexForm.path}`,
      baseValue: clone(baseValues[key]),
      nextValue: clone(complexForm.value),
      updatedAt: new Date().toISOString(),
    });
  }
  await persistField(complexForm.target, entityId, complexForm.path);
  if (saveStates[key] !== "error") modal.value = "";
}
function resourcesValue() {
  return complexForm.value as EditableResource[];
}
function relationsValue() {
  return complexForm.value as EditableRelation[];
}
function addResource() {
  resourcesValue().push({ title: "", url: "" });
}
function addRelation() {
  relationsValue().push({ type: "prerequisite", toLectureId: "" });
}
function toggleReplay(id: string, checked: boolean) {
  const values = complexForm.value as string[];
  complexForm.value = checked
    ? [...values.filter((entry) => entry !== id), id]
    : values.filter((entry) => entry !== id);
}

function requestPublish(
  sessionId: string,
  nextValue: Session["status"],
  baseValue?: Session["status"],
) {
  const session = sessions.value.find((entry) => entry.id === sessionId);
  if (!session) return;
  Object.assign(publishForm, { sessionId, baseValue: baseValue ?? session.status, nextValue });
  modal.value = "publish";
}
const publishWarnings = computed(() => {
  const session = sessions.value.find((entry) => entry.id === publishForm.sessionId);
  if (!session) return [];
  const messages: string[] = [];
  if (publishForm.nextValue === "published") {
    if (!lecture.value?.description) messages.push("講習会の説明");
    if (!lecture.value?.targetAudience) messages.push("対象者");
    if (!lecture.value?.organizer) messages.push("運営担当");
    if (!session.date) messages.push("開催日");
    if (!session.startTime) messages.push("開始時刻");
    if (!session.location) messages.push("場所");
    if (!session.instructorId) messages.push("講師");
    if (!session.material) messages.push("講義資料");
  } else if (publishedCount.value === 1 && session.status === "published") {
    messages.push("この変更で講習会が学習者向け画面から非表示になります");
  }
  return messages;
});
async function confirmPublish() {
  const session = sessions.value.find((entry) => entry.id === publishForm.sessionId);
  if (!session) return;
  try {
    const result = await patchSessionAttribute(session.id, {
      attributePath: "status",
      baseValue: publishForm.baseValue,
      nextValue: publishForm.nextValue,
    });
    updateSession(result.session);
    if (result.conflictDetected)
      showToast("同じ公開状態が別の編集で更新されていたため、今回の値で保存しました。");
    modal.value = "";
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "公開状態を保存できませんでした";
  }
}

function openReplace() {
  const flow = activeFlow.value ?? preFlow.value;
  replaceForm.flowId = flow?.id ?? "";
  replaceForm.flowClassId = flow?.flowClassId ?? "";
  modal.value = "replace";
}
async function confirmReplace() {
  if (!replaceForm.flowId || !replaceForm.flowClassId) return;
  try {
    const result = await replaceFlowClass(replaceForm.flowId, replaceForm.flowClassId);
    updateFlow(result.flow);
    activeTab.value = result.flow.id;
    modal.value = "";
    showToast("使用するFlowを変更しました。");
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "Flowを変更できませんでした";
  }
}
function openOrder() {
  orderIds.value = sessions.value.map((entry) => entry.id);
  modal.value = "order";
}
function moveOrder(id: string, direction: -1 | 1) {
  const movable = normalOrderIds.value;
  const at = movable.indexOf(id);
  const other = movable[at + direction];
  if (!other) return;
  const a = orderIds.value.indexOf(id);
  const b = orderIds.value.indexOf(other);
  const next = [...orderIds.value];
  [next[a], next[b]] = [next[b]!, next[a]!];
  orderIds.value = next;
}
function dropOrder(targetId: string) {
  const sourceId = draggingId.value;
  if (!sourceId || sourceId === targetId) return;
  const next = orderIds.value.filter((id) => id !== sourceId);
  next.splice(next.indexOf(targetId), 0, sourceId);
  orderIds.value = next;
  draggingId.value = "";
}
function sortByDate() {
  const originals = sessions.value.filter((entry) => !entry.isReplay);
  const sorted = [...originals].sort(
    (a, b) => (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99") || a.order - b.order,
  );
  orderIds.value = sorted.flatMap((entry) => [
    entry.id,
    ...sessions.value
      .filter((candidate) => candidate.isReplay && candidate.replayOfSessionIds.includes(entry.id))
      .map((candidate) => candidate.id),
  ]);
}
async function saveOrder() {
  if (!lecture.value) return;
  const normalOrder = new Map(normalOrderIds.value.map((id, index) => [id, index]));
  const items = orderIds.value.map((id, index) => {
    const session = sessions.value.find((entry) => entry.id === id)!;
    const sourceOrder = session.replayOfSessionIds
      .map((source) => normalOrder.get(source))
      .find((value) => value !== undefined);
    return {
      sessionId: id,
      order:
        session.isReplay && sourceOrder !== undefined
          ? sourceOrder
          : (normalOrder.get(id) ?? index),
    };
  });
  try {
    const values = await reorderSessions(lecture.value.id, items);
    workspace.value = { ...workspace.value!, lecture: { ...lecture.value, sessions: values } };
    modal.value = "";
    showToast("開催順を保存しました。");
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "開催順を保存できませんでした";
  }
}
async function openHistory(category: "data" | "flow" = "data") {
  if (!lecture.value) return;
  historyCategory.value = category;
  modal.value = "history";
  historyLoading.value = true;
  try {
    history.value = await getLectureHistory(lecture.value.id, category);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "履歴を取得できませんでした";
  } finally {
    historyLoading.value = false;
  }
}
async function copyHistory(event: HistoryEvent) {
  await navigator.clipboard.writeText(JSON.stringify(event, null, 2));
  showToast("履歴をコピーしました。");
}
async function downloadExport() {
  if (!lecture.value) return;
  const value = await exportLecture(lecture.value.id);
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `lecture-${lecture.value.id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
function closeModal() {
  modal.value = "";
}

onMounted(load);
onBeforeUnmount(() => timers.forEach((timer) => clearTimeout(timer)));
</script>

<template>
  <main class="page lecture-workspace">
    <header class="workspace-header">
      <div>
        <RouterLink class="back-link" to="/admin">← 運営向けページ</RouterLink>
        <span v-if="lecture" class="editor-state" :class="{ published: lecture.isPublished }">{{
          lecture.isPublished ? "公開中" : "下書き"
        }}</span>
        <h1>{{ isNew ? "講習会を作成" : lecture?.name }}</h1>
        <p v-if="lecture" class="editor-save-status" aria-live="polite">{{ editorSaveLabel }}</p>
      </div>
      <div v-if="lecture" class="header-actions">
        <BasiqButton tone="neutral" variant="outline" type="button" @click="openHistory()"
          >変更履歴</BasiqButton
        >
        <BasiqButton tone="neutral" variant="outline" type="button" @click="modal = 'more'"
          >その他</BasiqButton
        >
      </div>
    </header>
    <p v-if="toast" class="toast" role="status">{{ toast }}</p>
    <p v-if="error" class="notice error" role="alert">{{ error }}</p>
    <div v-if="supportWarnings.length" class="support-warning" role="status">
      <p v-for="warning in supportWarnings" :key="warning">{{ warning }}</p>
    </div>
    <div v-if="loading" class="loading-state">編集データを読み込んでいます</div>

    <section v-else-if="isNew && !workspace && !createMode" class="creation-choice">
      <header>
        <h2>作り方を選ぶ</h2>
        <p>あとからすべての項目と使用Flowを変更できます。</p>
      </header>
      <div>
        <button type="button" @click="createMode = 'blank'">
          <strong>白紙から作る</strong>
          <span>名前と3種類のFlowを選び、新しい講習会を始めます。</span>
        </button>
        <button type="button" @click="createMode = 'inherit'">
          <strong>過去の講習会から引き継ぐ</strong>
          <span>基本情報、通常開催、使用Flowを引き継いで今年度版を作ります。</span>
        </button>
      </div>
    </section>

    <form
      v-else-if="isNew && !workspace && createMode === 'blank'"
      class="create-panel"
      @submit.prevent="submitCreate"
    >
      <button class="mode-back" type="button" @click="createMode = ''">← 作り方を選び直す</button>
      <BasiqCard>
        <template #header
          ><div>
            <p class="card-kicker">START</p>
            <h2>講習会と最初のFlowを作成</h2>
          </div></template
        >
        <div class="form-stack">
          <BasiqFormField label="講習会名" required
            ><BasiqInput
              v-model="createForm.name"
              required
              placeholder="例：Webエンジニアになろう講習会"
          /></BasiqFormField>
          <label class="native-field"
            ><span>講習会の事前Flow *</span
            ><select v-model="createForm.lecturePreFlowClassId" required>
              <option value="" disabled>選択してください</option>
              <option
                v-for="item in flowClasses.filter(
                  (entry) => entry.listed && entry.type === 'lecture_pre',
                )"
                :key="item.id"
                :value="item.id"
              >
                {{ item.name }}
              </option>
            </select></label
          >
          <label class="native-field"
            ><span>第1回のメインFlow *</span
            ><select v-model="createForm.sessionMainFlowClassId" required>
              <option value="" disabled>選択してください</option>
              <option
                v-for="item in flowClasses.filter(
                  (entry) => entry.listed && entry.type === 'session_main',
                )"
                :key="item.id"
                :value="item.id"
              >
                {{ item.name }}
              </option>
            </select></label
          >
          <label class="native-field"
            ><span>講習会の事後Flow *</span
            ><select v-model="createForm.lecturePostFlowClassId" required>
              <option value="" disabled>選択してください</option>
              <option
                v-for="item in flowClasses.filter(
                  (entry) => entry.listed && entry.type === 'lecture_post',
                )"
                :key="item.id"
                :value="item.id"
              >
                {{ item.name }}
              </option>
            </select></label
          >
        </div>
        <template #footer
          ><BasiqButton type="submit" :disabled="saving">{{
            saving ? "作成中…" : "講習会を作成"
          }}</BasiqButton></template
        >
      </BasiqCard>
    </form>

    <section v-else-if="isNew && !workspace && createMode === 'inherit'" class="inherit-panel">
      <button class="mode-back" type="button" @click="createMode = ''">← 作り方を選び直す</button>
      <header>
        <div>
          <h2>引き継ぎ元を選ぶ</h2>
          <p>名前・年度・班・分野で検索できます。回答や進捗、公開状態は引き継ぎません。</p>
        </div>
        <label class="year-field">
          <span>新しい年度</span>
          <input v-model.number="inheritYear" type="number" min="2000" max="2200" />
        </label>
      </header>
      <BasiqFormField label="講習会を検索">
        <BasiqInput v-model="inheritQuery" type="search" placeholder="名前、年度、班、分野" />
      </BasiqFormField>
      <div class="inherit-list">
        <article v-for="candidate in inheritanceCandidates" :key="candidate.id">
          <span>{{ candidate.academicYearStart }}年度</span>
          <div>
            <h3>{{ candidate.name }}</h3>
            <p>
              {{ fields.find((field) => field.id === candidate.fieldId)?.name || "分野未設定" }}
              <template v-if="candidate.organizer?.groupName">
                · {{ candidate.organizer.groupName }}</template
              >
              · 通常開催 {{ candidate.sessions.filter((session) => !session.isReplay).length }}件
            </p>
          </div>
          <BasiqButton
            type="button"
            tone="neutral"
            variant="outline"
            :disabled="saving"
            @click="submitInherited(candidate.id)"
            >{{ saving ? "作成中…" : "引き継ぐ" }}</BasiqButton
          >
        </article>
        <p v-if="!inheritanceCandidates.length" class="inherit-empty">
          条件に合う講習会はありません。
        </p>
      </div>
    </section>

    <BasiqTabsRoot v-else-if="workspace && lecture" v-model="activeTab" class="workspace-tabs">
      <div class="tab-scroll">
        <BasiqTabsList aria-label="講習会編集" width="max-content">
          <BasiqTabsTrigger v-if="preFlow" :value="preFlow.id">講習会</BasiqTabsTrigger>
          <BasiqTabsTrigger
            v-for="tab in sessionTabs"
            :key="tab.flow?.id ?? tab.session.id"
            :value="tab.flow?.id ?? `missing-${tab.session.id}`"
            :disabled="!tab.flow"
            >{{ tab.label }}</BasiqTabsTrigger
          >
          <BasiqButton
            class="tab-action"
            tone="neutral"
            variant="outline"
            type="button"
            aria-label="開催を追加"
            :disabled="Boolean(flowClassesError)"
            @click="openSessionModal"
            ><AppIcon name="plus" :size="16"
          /></BasiqButton>
          <BasiqTabsTrigger v-if="postFlow" :value="postFlow.id">事後</BasiqTabsTrigger>
          <BasiqTabsTrigger value="bulk">一覧編集</BasiqTabsTrigger>
          <BasiqButton
            class="tab-action"
            tone="neutral"
            variant="outline"
            type="button"
            aria-label="その他の操作"
            @click="modal = 'more'"
            >…</BasiqButton
          >
        </BasiqTabsList>
      </div>

      <BasiqTabsContent v-for="flow in workspace.flows" :key="flow.id" :value="flow.id">
        <FlowInlineRunner
          :flow="flow"
          :lecture="lecture"
          :session="
            flow.type === 'session_main'
              ? sessions.find((entry) => entry.id === flow.targetId)
              : undefined
          "
          @flow-updated="updateFlow"
          @lecture-updated="updateLecture"
          @session-updated="updateSession"
          @open-complex="(path, target) => openComplex(path, target, flow.targetId)"
          @request-publish="
            (request) => requestPublish(flow.targetId, request.nextValue, request.baseValue)
          "
          @save-status="(phase) => (flowSaveStates[flow.id] = phase)"
        />
      </BasiqTabsContent>

      <BasiqTabsContent value="bulk">
        <section class="bulk-editor">
          <header class="section-heading">
            <div>
              <p class="eyebrow">ALL ATTRIBUTES</p>
              <h2>一覧編集</h2>
              <p>入力を止めるかフォーカスを外すと、属性ごとに保存します。</p>
            </div>
            <BasiqButton tone="neutral" variant="outline" type="button" @click="downloadExport"
              >JSONを書き出す</BasiqButton
            >
          </header>
          <BasiqCard class="bulk-card">
            <template #header><h3>講習会</h3></template>
            <details open>
              <summary>基本情報</summary>
              <div class="lecture-grid">
                <BasiqFormField
                  v-for="entry in scalarLectureFields"
                  :key="entry[0]"
                  :label="entry[1]"
                  ><BasiqTextarea
                    v-if="entry[2] === 'textarea'"
                    :model-value="String(fieldValue('lecture', lecture.id, entry[0]))"
                    :rows="3"
                    @update:model-value="setField('lecture', lecture.id, entry[0], $event)"
                    @blur="flushField('lecture', lecture.id, entry[0])"
                  /><BasiqInput
                    v-else
                    :model-value="String(fieldValue('lecture', lecture.id, entry[0]))"
                    @update:model-value="setField('lecture', lecture.id, entry[0], $event)"
                    @blur="flushField('lecture', lecture.id, entry[0])"
                  /><small class="save-state">{{
                    saveStates[bufferKey("lecture", lecture.id, entry[0])]
                  }}</small></BasiqFormField
                >
                <label class="native-field"
                  ><span>開始年度</span
                  ><input
                    type="number"
                    min="2000"
                    max="2200"
                    :value="fieldValue('lecture', lecture.id, 'academicYearStart')"
                    @change="
                      setField(
                        'lecture',
                        lecture.id,
                        'academicYearStart',
                        Number(inputValue($event)),
                        true,
                      )
                    "
                /></label>
                <label class="native-field"
                  ><span>終了年度</span
                  ><input
                    type="number"
                    min="2000"
                    max="2200"
                    :value="fieldValue('lecture', lecture.id, 'academicYearEnd')"
                    @change="
                      setField(
                        'lecture',
                        lecture.id,
                        'academicYearEnd',
                        Number(inputValue($event)),
                        true,
                      )
                    "
                /></label>
                <label class="native-field"
                  ><span>分野</span
                  ><select
                    :value="fieldValue('lecture', lecture.id, 'fieldId')"
                    :disabled="Boolean(fieldsError)"
                    @change="setField('lecture', lecture.id, 'fieldId', inputValue($event), true)"
                  >
                    <option
                      v-if="fieldsError && fieldValue('lecture', lecture.id, 'fieldId')"
                      :value="fieldValue('lecture', lecture.id, 'fieldId')"
                    >
                      現在の設定 ({{ fieldValue("lecture", lecture.id, "fieldId") }})
                    </option>
                    <option value="">未設定</option>
                    <option v-for="field in fields" :key="field.id" :value="field.id">
                      {{ field.name }}
                    </option>
                  </select></label
                >
                <label class="switch-field"
                  ><BasiqSwitch
                    :model-value="Boolean(fieldValue('lecture', lecture.id, 'isIntroductory'))"
                    @update:model-value="
                      setField('lecture', lecture.id, 'isIntroductory', $event, true)
                    "
                    >その分野の0→1講習</BasiqSwitch
                  ></label
                >
              </div>
            </details>
            <details>
              <summary>担当・資料・関連</summary>
              <div class="complex-links">
                <BasiqButton
                  tone="neutral"
                  variant="outline"
                  type="button"
                  @click="openComplex('organizer', 'lecture')"
                  >運営担当を編集</BasiqButton
                ><BasiqButton
                  tone="neutral"
                  variant="outline"
                  type="button"
                  @click="openComplex('material', 'lecture')"
                  >講義資料を編集</BasiqButton
                ><BasiqButton
                  tone="neutral"
                  variant="outline"
                  type="button"
                  @click="openComplex('resources', 'lecture')"
                  >関連リンク {{ lecture.resources.length }}件</BasiqButton
                ><BasiqButton
                  tone="neutral"
                  variant="outline"
                  type="button"
                  @click="openComplex('relations', 'lecture')"
                  >学びのつながり {{ lecture.relations.length }}件</BasiqButton
                >
              </div>
            </details>
          </BasiqCard>

          <BasiqCard class="bulk-card">
            <template #header><h3>開催</h3></template>
            <details v-for="lane in sessionLanes" :key="lane[0]" :open="lane[0] === 'name'">
              <summary>{{ lane[1] }}</summary>
              <div class="attribute-lane">
                <article
                  v-for="(session, index) in sessions"
                  :key="session.id"
                  class="session-mini"
                >
                  <strong>第{{ index + 1 }}回</strong
                  ><small>{{ session.isReplay ? "再放送・総集編" : session.name }}</small
                  ><BasiqTextarea
                    v-if="lane[2] === 'textarea'"
                    :model-value="String(fieldValue('session', session.id, lane[0]))"
                    :rows="3"
                    @update:model-value="setField('session', session.id, lane[0], $event)"
                    @blur="flushField('session', session.id, lane[0])"
                  /><input
                    v-else-if="lane[2] === 'date' || lane[2] === 'time'"
                    :type="lane[2]"
                    :value="fieldValue('session', session.id, lane[0])"
                    :disabled="lane[0] === 'startTime' && !session.date"
                    @change="setField('session', session.id, lane[0], inputValue($event), true)"
                  /><BasiqInput
                    v-else
                    :type="lane[2] === 'url' ? 'url' : 'text'"
                    :model-value="String(fieldValue('session', session.id, lane[0]))"
                    @update:model-value="setField('session', session.id, lane[0], $event)"
                    @blur="flushField('session', session.id, lane[0])"
                  /><small class="save-state">{{
                    saveStates[bufferKey("session", session.id, lane[0])]
                  }}</small>
                </article>
              </div>
            </details>
            <details>
              <summary>講師</summary>
              <div class="attribute-lane">
                <article
                  v-for="(session, index) in sessions"
                  :key="session.id"
                  class="session-mini"
                >
                  <strong>第{{ index + 1 }}回</strong
                  ><label class="native-field"
                    ><select
                      :value="fieldValue('session', session.id, 'instructorId')"
                      :disabled="Boolean(directoryError)"
                      @change="
                        setField('session', session.id, 'instructorId', inputValue($event), true)
                      "
                    >
                      <option
                        v-if="directoryError && fieldValue('session', session.id, 'instructorId')"
                        :value="fieldValue('session', session.id, 'instructorId')"
                      >
                        現在の講師 ({{ fieldValue("session", session.id, "instructorId") }})
                      </option>
                      <option value="">未設定</option>
                      <option v-for="user in directory.users" :key="user.id" :value="user.id">
                        {{ user.displayName }} (@{{ user.traqId }})
                      </option>
                    </select></label
                  >
                </article>
              </div>
            </details>
            <details>
              <summary>資料・関連リンク・再放送</summary>
              <div class="attribute-lane">
                <article
                  v-for="(session, index) in sessions"
                  :key="session.id"
                  class="session-mini"
                >
                  <strong>第{{ index + 1 }}回</strong
                  ><BasiqButton
                    tone="neutral"
                    variant="outline"
                    type="button"
                    @click="openComplex('material', 'session', session.id)"
                    >講義資料</BasiqButton
                  ><BasiqButton
                    tone="neutral"
                    variant="outline"
                    type="button"
                    @click="openComplex('resources', 'session', session.id)"
                    >関連リンク {{ session.resources.length }}件</BasiqButton
                  ><BasiqButton
                    tone="neutral"
                    variant="outline"
                    type="button"
                    @click="openComplex('replayOfSessionIds', 'session', session.id)"
                    >再放送元 {{ session.replayOfSessionIds.length }}件</BasiqButton
                  >
                </article>
              </div>
            </details>
            <details open>
              <summary>公開状態</summary>
              <div class="attribute-lane">
                <article
                  v-for="(session, index) in sessions"
                  :key="session.id"
                  class="session-mini"
                >
                  <strong>第{{ index + 1 }}回</strong
                  ><BasiqSwitch
                    :model-value="session.status === 'published'"
                    @update:model-value="requestPublish(session.id, $event ? 'published' : 'draft')"
                    >{{ session.status === "published" ? "公開中" : "下書き" }}</BasiqSwitch
                  >
                </article>
              </div>
            </details>
          </BasiqCard>
        </section>
      </BasiqTabsContent>
    </BasiqTabsRoot>

    <div v-if="modal" class="modal-backdrop" @click.self="closeModal">
      <section
        class="modal-panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`modal-${modal}-title`"
      >
        <template v-if="modal === 'more'"
          ><header>
            <h2 id="modal-more-title">その他の操作</h2>
            <BasiqButton tone="neutral" variant="outline" type="button" @click="closeModal"
              >閉じる</BasiqButton
            >
          </header>
          <div class="action-list">
            <BasiqButton
              tone="neutral"
              variant="outline"
              type="button"
              :disabled="Boolean(flowClassesError)"
              @click="openReplace"
              >使用Flowを変更</BasiqButton
            ><BasiqButton tone="neutral" variant="outline" type="button" @click="openOrder"
              >開催順を変更</BasiqButton
            ><BasiqButton
              tone="neutral"
              variant="outline"
              type="button"
              @click="openHistory('data')"
              >変更履歴</BasiqButton
            >
          </div></template
        >
        <template v-else-if="modal === 'drafts'">
          <header><h2 id="modal-drafts-title">未送信の編集を確認</h2></header>
          <p>
            サーバー側も変更されているため、自動では反映しません。必要な値をコピーしてから破棄してください。
          </p>
          <ol class="history-list draft-list">
            <li
              v-for="draft in reviewDrafts"
              :key="`${draft.entityType}:${draft.entityId}:${draft.attributePath}`"
            >
              <div>
                <strong>{{ draft.attributePath }}</strong
                ><small>{{ draft.entityType }} {{ draft.entityId }}</small>
              </div>
              <pre>{{ JSON.stringify(draft.nextValue, null, 2) }}</pre>
              <div class="draft-actions">
                <BasiqButton
                  tone="neutral"
                  variant="outline"
                  type="button"
                  @click="copyDraft(draft)"
                  >コピー</BasiqButton
                ><BasiqButton
                  tone="neutral"
                  variant="outline"
                  type="button"
                  @click="discardDraft(draft)"
                  >破棄</BasiqButton
                >
              </div>
            </li>
          </ol>
        </template>
        <form v-else-if="modal === 'session'" @submit.prevent="submitSession">
          <header>
            <h2 id="modal-session-title">開催を追加</h2>
            <BasiqButton tone="neutral" variant="outline" type="button" @click="closeModal"
              >閉じる</BasiqButton
            >
          </header>
          <div class="form-stack">
            <label class="native-field"
              ><span>作り方</span
              ><select v-model="sessionForm.mode">
                <option value="empty">空の開催</option>
                <option value="duplicate">既存開催を複製</option>
              </select></label
            ><label v-if="sessionForm.mode === 'duplicate'" class="native-field"
              ><span>複製元</span
              ><select v-model="sessionForm.sourceSessionId" required>
                <option value="" disabled>選択してください</option>
                <option v-for="session in sessions" :key="session.id" :value="session.id">
                  {{ session.name }}
                </option>
              </select></label
            ><label class="native-field"
              ><span>メインFlow</span
              ><select v-model="sessionForm.flowClassId" required>
                <option
                  v-for="item in flowClasses.filter(
                    (entry) => entry.listed && entry.type === 'session_main',
                  )"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.name }}
                </option>
              </select></label
            >
          </div>
          <footer><BasiqButton type="submit" :disabled="saving">追加する</BasiqButton></footer>
        </form>
        <template v-else-if="modal === 'complex'"
          ><header>
            <h2 id="modal-complex-title">{{ complexForm.path }}を編集</h2>
            <BasiqButton tone="neutral" variant="outline" type="button" @click="closeModal"
              >閉じる</BasiqButton
            >
          </header>
          <div class="form-stack">
            <template v-if="complexForm.path === 'organizer'"
              ><p v-if="directoryError" class="inline-warning">
                担当候補を取得できません。現在の担当は
                {{ (complexForm.value as any)?.id ?? "未設定" }}
                です。
              </p>
              <label class="native-field"
                ><span>担当種別</span
                ><select
                  :value="(complexForm.value as any)?.kind ?? ''"
                  :disabled="Boolean(directoryError)"
                  @change="
                    complexForm.value = inputValue($event)
                      ? { kind: inputValue($event), id: '' }
                      : null
                  "
                >
                  <option value="">未設定</option>
                  <option value="user">個人</option>
                  <option value="group">グループ</option>
                </select></label
              ><label v-if="(complexForm.value as any)?.kind" class="native-field"
                ><span>担当</span
                ><select
                  v-model="(complexForm.value as any).id"
                  :disabled="Boolean(directoryError)"
                >
                  <option v-if="directoryError" :value="(complexForm.value as any).id">
                    現在の担当 ({{ (complexForm.value as any).id }})
                  </option>
                  <option value="" disabled>選択してください</option>
                  <option
                    v-for="entry in (complexForm.value as any).kind === 'group'
                      ? directory.groups
                      : directory.users"
                    :key="entry.id"
                    :value="entry.id"
                  >
                    {{ "name" in entry ? entry.name : `${entry.displayName} (@${entry.traqId})` }}
                  </option>
                </select></label
              ></template
            >
            <template v-else-if="complexForm.path === 'material'"
              ><BasiqFormField label="表示名"
                ><BasiqInput
                  :model-value="(complexForm.value as any)?.title ?? ''"
                  placeholder="講義資料"
                  @update:model-value="
                    complexForm.value = { ...((complexForm.value as any) ?? {}), title: $event }
                  " /></BasiqFormField
              ><BasiqFormField label="URL"
                ><BasiqInput
                  type="url"
                  :model-value="(complexForm.value as any)?.url ?? ''"
                  @update:model-value="
                    complexForm.value = $event
                      ? { ...((complexForm.value as any) ?? {}), url: $event }
                      : null
                  " /></BasiqFormField
            ></template>
            <template v-else-if="complexForm.path === 'resources'"
              ><div v-for="(resource, index) in resourcesValue()" :key="index" class="row-editor">
                <BasiqInput v-model="resource.title" placeholder="表示名" /><BasiqInput
                  v-model="resource.url"
                  type="url"
                  placeholder="https://..."
                /><BasiqButton
                  tone="neutral"
                  variant="outline"
                  type="button"
                  @click="resourcesValue().splice(index, 1)"
                  >外す</BasiqButton
                >
              </div>
              <BasiqButton tone="neutral" variant="outline" type="button" @click="addResource"
                >リンクを追加</BasiqButton
              ></template
            >
            <template v-else-if="complexForm.path === 'relations'"
              ><div v-for="(relation, index) in relationsValue()" :key="index" class="row-editor">
                <select v-model="relation.type">
                  <option value="prerequisite">先に学ぶ</option>
                  <option value="previous_year">過去年度版</option>
                  <option value="recommended_next">次に学ぶ</option></select
                ><select v-model="relation.toLectureId">
                  <option v-if="lecturesError" :value="relation.toLectureId">
                    現在の講習会 ({{ relation.toLectureId }})
                  </option>
                  <option value="" disabled>講習会を選択</option>
                  <option
                    v-for="item in lectures.filter((entry) => entry.id !== lecture?.id)"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ item.name }}
                  </option></select
                ><BasiqButton
                  tone="neutral"
                  variant="outline"
                  type="button"
                  @click="relationsValue().splice(index, 1)"
                  >外す</BasiqButton
                >
              </div>
              <p v-if="lecturesError" class="inline-warning">関連講習会の候補を取得できません。</p>
              <BasiqButton
                tone="neutral"
                variant="outline"
                type="button"
                :disabled="Boolean(lecturesError)"
                @click="addRelation"
                >つながりを追加</BasiqButton
              ></template
            >
            <template v-else-if="complexForm.path === 'replayOfSessionIds'"
              ><label
                v-for="item in sessions.filter(
                  (entry) => !entry.isReplay && entry.id !== complexForm.sessionId,
                )"
                :key="item.id"
                class="check-row"
                ><BasiqCheckbox
                  :model-value="(complexForm.value as string[]).includes(item.id)"
                  @update:model-value="toggleReplay(item.id, $event)"
                />{{ item.name }}</label
              ></template
            >
          </div>
          <footer>
            <BasiqButton type="button" @click="saveComplex">確定して保存</BasiqButton>
          </footer></template
        >
        <template v-else-if="modal === 'publish'"
          ><header><h2 id="modal-publish-title">公開状態を変更</h2></header>
          <p>
            {{
              publishForm.nextValue === "published"
                ? "この開催を公開します。"
                : "この開催を下書きへ戻します。"
            }}
          </p>
          <div v-if="publishWarnings.length" class="warning-box">
            <strong>確認してください</strong>
            <ul>
              <li v-for="item in publishWarnings" :key="item">{{ item }}</li>
            </ul>
          </div>
          <footer>
            <BasiqButton tone="neutral" variant="outline" type="button" @click="closeModal"
              >キャンセル</BasiqButton
            ><BasiqButton type="button" @click="confirmPublish">このまま変更</BasiqButton>
          </footer></template
        >
        <template v-else-if="modal === 'replace'"
          ><header>
            <h2 id="modal-replace-title">使用Flowを変更</h2>
            <BasiqButton tone="neutral" variant="outline" type="button" @click="closeModal"
              >閉じる</BasiqButton
            >
          </header>
          <div class="form-stack">
            <label class="native-field"
              ><span>対象</span
              ><select
                v-model="replaceForm.flowId"
                @change="
                  replaceForm.flowClassId =
                    workspace?.flows.find((entry) => entry.id === replaceForm.flowId)
                      ?.flowClassId ?? ''
                "
              >
                <option v-for="flow in workspace?.flows" :key="flow.id" :value="flow.id">
                  {{
                    flow.type === "lecture_pre"
                      ? "講習会"
                      : flow.type === "lecture_post"
                        ? "事後"
                        : sessions.find((entry) => entry.id === flow.targetId)?.name
                  }}
                </option>
              </select></label
            ><label class="native-field"
              ><span>新しいFlow</span
              ><select v-model="replaceForm.flowClassId">
                <option v-for="item in replacementCandidates" :key="item.id" :value="item.id">
                  {{ item.name }}
                </option>
              </select></label
            >
            <p>対象のデータは維持し、Flow本文・チェック・ページ位置を新しい内容へ置き換えます。</p>
          </div>
          <footer>
            <BasiqButton type="button" @click="confirmReplace">変更する</BasiqButton>
          </footer></template
        >
        <template v-else-if="modal === 'order'"
          ><header>
            <h2 id="modal-order-title">開催順を変更</h2>
            <BasiqButton tone="neutral" variant="outline" type="button" @click="sortByDate"
              >日時順</BasiqButton
            >
          </header>
          <ol class="order-list">
            <li
              v-for="id in orderIds"
              :key="id"
              :draggable="!sessions.find((entry) => entry.id === id)?.isReplay"
              @dragstart="draggingId = id"
              @dragover.prevent
              @drop="dropOrder(id)"
            >
              <span class="drag-handle" aria-hidden="true">⠿</span>
              <div>
                <strong>{{ sessions.find((entry) => entry.id === id)?.name }}</strong
                ><small v-if="sessions.find((entry) => entry.id === id)?.isReplay"
                  >元開催の回に追従</small
                >
              </div>
              <div
                v-if="!sessions.find((entry) => entry.id === id)?.isReplay"
                class="order-buttons"
              >
                <button type="button" aria-label="上へ" @click="moveOrder(id, -1)">↑</button
                ><button type="button" aria-label="下へ" @click="moveOrder(id, 1)">↓</button>
              </div>
            </li>
          </ol>
          <footer>
            <BasiqButton tone="neutral" variant="outline" type="button" @click="closeModal"
              >キャンセル</BasiqButton
            ><BasiqButton type="button" @click="saveOrder">順序を保存</BasiqButton>
          </footer></template
        >
        <template v-else-if="modal === 'history'"
          ><header>
            <h2 id="modal-history-title">変更履歴</h2>
            <BasiqButton tone="neutral" variant="outline" type="button" @click="closeModal"
              >閉じる</BasiqButton
            >
          </header>
          <div class="history-tabs">
            <button
              type="button"
              :class="{ active: historyCategory === 'data' }"
              @click="openHistory('data')"
            >
              データ変更</button
            ><button
              type="button"
              :class="{ active: historyCategory === 'flow' }"
              @click="openHistory('flow')"
            >
              Flow操作
            </button>
          </div>
          <p v-if="historyLoading">読み込んでいます</p>
          <ol v-else class="history-list">
            <li v-for="event in history" :key="event.id">
              <div>
                <strong>{{ event.attributePath }}</strong
                ><time>{{ new Date(event.occurredAt).toLocaleString("ja-JP") }}</time>
              </div>
              <pre
                >{{ JSON.stringify(event.previousValue) }} → {{
                  JSON.stringify(event.nextValue)
                }}</pre>
              <BasiqButton
                tone="neutral"
                variant="outline"
                type="button"
                @click="copyHistory(event)"
                >コピー</BasiqButton
              >
            </li>
          </ol></template
        >
      </section>
    </div>
  </main>
</template>

<style scoped>
/* stylelint-disable no-descending-specificity */
.lecture-workspace {
  max-width: 1160px;
  margin: 0 auto;
  padding: 30px 40px 80px;
}

.workspace-header,
.section-heading,
.modal-panel header,
.modal-panel footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.workspace-header {
  min-height: 92px;
  margin: 0 0 18px;
  padding: 10px 0 16px;
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.workspace-header h1 {
  margin: 2px 0;
  font-size: 1.45rem;
}

.back-link {
  display: inline-block;
  margin-bottom: 5px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.78rem;
  text-decoration: none;
}

.editor-state {
  margin-left: 12px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.75rem;
  font-weight: 700;
}

.editor-state.published {
  color: var(--app-success);
}

.editor-save-status {
  margin: 0;
  color: var(--basiq-color-content-subtle);
  font-size: 0.75rem;
}

.eyebrow,
.card-kicker {
  color: var(--basiq-color-content-accent);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
}

.publication-pill {
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--basiq-color-surface-muted);
  font-size: 0.8rem;
  font-weight: 700;
}

.publication-pill.published {
  color: var(--app-success);
  background: var(--app-success-soft);
}

.toast {
  position: fixed;
  z-index: 90;
  top: 20px;
  right: 20px;
  max-width: 420px;
  padding: 12px 16px;
  border: 1px solid var(--basiq-color-border-control);
  border-radius: var(--basiq-radius-sm);
  background: var(--basiq-color-surface-base);
  box-shadow: 0 8px 28px rgb(0 0 0/14%);
}

.create-panel {
  max-width: 720px;
  margin: 40px auto;
}

.creation-choice,
.inherit-panel {
  max-width: 820px;
  margin: 36px auto;
}

.creation-choice > header,
.inherit-panel > header {
  margin-bottom: 18px;
}

.creation-choice > header p,
.inherit-panel > header p {
  margin: 4px 0 0;
  color: var(--basiq-color-content-subtle);
}

.creation-choice > div {
  overflow: hidden;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
  background: var(--basiq-color-surface-base);
}

.creation-choice button {
  width: 100%;
  display: grid;
  gap: 4px;
  padding: 20px;
  border: 0;
  color: inherit;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.creation-choice button + button,
.inherit-list article + article {
  border-top: 1px solid var(--basiq-color-border-separator);
}

.creation-choice button:hover {
  background: var(--basiq-color-navigation-item-background-current-rest);
}

.creation-choice button span,
.inherit-list p {
  color: var(--basiq-color-content-subtle);
  font-size: 0.85rem;
}

.mode-back {
  margin-bottom: 14px;
  padding: 0;
  border: 0;
  color: var(--basiq-color-content-subtle);
  background: transparent;
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
}

.inherit-panel > header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
}

.year-field {
  width: 150px;
  display: grid;
  gap: 5px;
  flex: 0 0 auto;
  font-size: 0.8rem;
  font-weight: 700;
}

.year-field input {
  min-height: 40px;
  padding: 7px 10px;
  border: 1px solid var(--basiq-color-border-control);
  border-radius: var(--basiq-radius-sm);
  font: inherit;
}

.inherit-list {
  margin-top: 16px;
  overflow: hidden;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
}

.inherit-list article {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
}

.inherit-list h3,
.inherit-list p {
  margin: 0;
}

.inherit-empty {
  margin: 0;
  padding: 20px;
}

.support-warning,
.inline-warning {
  color: #7a4c00;
  border: 1px solid #d29b2d;
  border-radius: var(--basiq-radius-sm);
  background: #fff8e8;
}

.support-warning {
  display: grid;
  gap: 4px;
  margin-bottom: 18px;
  padding: 12px 14px;
}

.inline-warning {
  padding: 10px 12px;
}

.form-stack {
  display: grid;
  gap: 18px;
}

.native-field {
  display: grid;
  gap: 7px;
}

.native-field > span {
  font-size: 0.86rem;
  font-weight: 700;
}

.native-field input,
.native-field select,
.row-editor select,
.session-mini input {
  width: 100%;
  min-height: 42px;
  padding: 8px 10px;
  border: 1px solid var(--basiq-color-border-control);
  border-radius: var(--basiq-radius-sm);
  background: var(--basiq-color-surface-base);
  color: inherit;
}

.tab-scroll {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.workspace-tabs {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.workspace-tabs :deep([role="tablist"]) {
  gap: 2px;
  overflow-x: auto;
  border-bottom: 0;
}

.workspace-tabs :deep([role="tab"]) {
  min-height: 54px;
  min-width: 104px;
  padding: 9px 16px;
  white-space: normal;
}

.workspace-tabs :deep([role="tab"][data-state="active"]) {
  background: var(--basiq-color-navigation-item-background-current-rest);
}

.workspace-tabs :deep([role="tabpanel"]) {
  width: 100%;
  margin: 0;
  padding: 22px 0 0;
  background: transparent;
}

.tab-action {
  min-width: 42px;
}

.bulk-editor {
  display: grid;
  gap: 22px;
}

.section-heading p:last-child {
  margin-top: 5px;
  color: var(--basiq-color-content-subtle);
}

.bulk-card {
  overflow: hidden;
}

.bulk-card details + details {
  border-top: 1px solid var(--basiq-color-border-separator);
}

.bulk-card summary {
  padding: 16px 20px;
  cursor: pointer;
  font-weight: 750;
}

.lecture-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  padding: 4px 20px 22px;
}

.switch-field {
  display: flex;
  align-items: center;
}

.complex-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 4px 20px 22px;
}

.attribute-lane {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 4px 20px 22px;
}

.session-mini {
  width: 250px;
  display: grid;
  flex: 0 0 250px;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
  background: var(--basiq-color-surface-base);
}

.session-mini > small {
  color: var(--basiq-color-content-subtle);
}

.save-state {
  min-height: 18px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.72rem;
}

.modal-backdrop {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(0 0 0/38%);
}

.modal-panel {
  width: min(680px, 100%);
  max-height: min(820px, calc(100vh - 40px));
  overflow: auto;
  padding: 24px;
  border-radius: var(--basiq-radius-md);
  background: var(--basiq-color-surface-base);
  box-shadow: 0 24px 70px rgb(0 0 0/22%);
}

.modal-panel header {
  margin-bottom: 22px;
}

.modal-panel footer {
  justify-content: flex-end;
  margin-top: 22px;
}

.action-list {
  display: grid;
  gap: 10px;
}

.row-editor {
  display: grid;
  grid-template-columns: 1fr 1.5fr auto;
  gap: 8px;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 9px;
}

.warning-box {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid #d29b2d;
  border-radius: var(--basiq-radius-sm);
  background: #fff8e8;
}

.warning-box ul {
  padding-left: 20px;
}

.order-list,
.history-list {
  display: grid;
  gap: 9px;
  list-style: none;
}

.order-list li,
.history-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
}

.order-list li > div:nth-child(2) {
  display: grid;
  flex: 1;
}

.drag-handle {
  cursor: grab;
  font-size: 20px;
}

.order-buttons {
  display: flex;
  gap: 4px;
}

.order-buttons button,
.history-tabs button {
  min-width: 38px;
  min-height: 38px;
  border: 1px solid var(--basiq-color-border-control);
  border-radius: var(--basiq-radius-sm);
  background: var(--basiq-color-surface-base);
}

.history-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.history-tabs .active {
  color: var(--basiq-color-content-accent);
  border-color: var(--basiq-color-accent-default);
}

.history-list li {
  align-items: flex-start;
}

.history-list li > div {
  display: grid;
  min-width: 150px;
}

.history-list pre {
  min-width: 0;
  flex: 1;
  overflow: auto;
  white-space: pre-wrap;
}

.draft-actions {
  display: flex;
  gap: 8px;
}

.notice.error {
  margin-bottom: 16px;
}

@media (width <= 760px) {
  .lecture-workspace {
    padding: 20px 16px 88px;
  }

  .workspace-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .workspace-header h1 {
    font-size: 1.3rem;
  }

  .workspace-header .header-actions {
    width: 100%;
  }

  .workspace-tabs :deep([role="tab"]) {
    min-width: 112px;
  }

  .inherit-panel > header {
    align-items: stretch;
    flex-direction: column;
  }

  .year-field {
    width: 100%;
  }

  .inherit-list article {
    grid-template-columns: 1fr;
  }

  .lecture-grid {
    grid-template-columns: 1fr;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .attribute-lane {
    flex-direction: column;
    overflow: visible;
  }

  .session-mini {
    width: 100%;
    flex-basis: auto;
  }

  .modal-backdrop {
    align-items: end;
    padding: 0;
  }

  .modal-panel {
    max-height: 92vh;
    border-radius: var(--basiq-radius-md) var(--basiq-radius-md) 0 0;
  }

  .row-editor {
    grid-template-columns: 1fr;
  }

  .toast {
    right: 12px;
    left: 12px;
  }

  .history-list li {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
