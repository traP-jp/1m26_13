<script setup lang="ts">
import {
  BasiqButton,
  BasiqCard,
  BasiqCheckbox,
  BasiqFormField,
  BasiqInput,
  BasiqSwitch,
  BasiqTabs,
  BasiqTextarea,
} from "basiq-ui";
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  applyFlow,
  createLecture,
  createSession,
  getDirectory,
  getLecture,
  listFields,
  listFlowClasses,
  listFlows,
  updateLecture,
  updateSession,
  type Directory,
  type Field,
  type Flow,
  type FlowClass,
  type Lecture,
  type LectureWrite,
  type Session,
  type SessionWrite,
} from "@/api/resources";
import AppIcon from "@/components/AppIcon.vue";
import FlowInlineRunner from "@/components/FlowInlineRunner.vue";

type EditableResource = { title: string; url: string };
type RelationType = Lecture["relations"][number]["type"];
type EditableRelation = { type: RelationType; toLectureId: string };
type Confirmation = { kind: "lecture" | "session"; name: string };

const route = useRoute();
const router = useRouter();
const lectureId = computed(() => (route.params.id ? String(route.params.id) : ""));
const isNew = computed(() => !lectureId.value);
const loading = ref(true);
const ready = ref(false);
const saving = ref(false);
const error = ref("");
const notice = ref("");
const confirmation = ref<Confirmation>();
const fields = ref<Field[]>([]);
const directory = ref<Directory>({ users: [], groups: [] });
const lectures = ref<Lecture[]>([]);
const flowClasses = ref<FlowClass[]>([]);
const appliedFlows = ref<Flow[]>([]);
const activeTab = ref("settings");
const current = ref<Lecture>();
const sessionEditorOpen = ref(false);
const sessionEditingId = ref("");
const flowModalOpen = ref(false);
const selectedFlowTargetKey = ref("");
const applyingFlow = ref(false);

type EditorTab = {
  label: string;
  value: string;
  kind: "flow" | "add-flow" | "settings";
  flowId?: string;
  flowType?: FlowClass["type"];
  targetId?: string;
  sessionId?: string;
};
type FlowTarget = {
  key: string;
  label: string;
  type: FlowClass["type"];
  targetId: string;
};
const relationTypes: Array<{ value: RelationType; label: string }> = [
  { value: "prerequisite", label: "先に学ぶ（前提）" },
  { value: "previous_year", label: "前年度・過去年度版" },
  { value: "recommended_next", label: "次に学ぶ" },
];
const form = reactive({
  name: "",
  description: "",
  academicYearStart: new Date().getFullYear(),
  academicYearEnd: new Date().getFullYear(),
  fieldId: "",
  organizerGroupIds: [] as string[],
  organizerUserIds: [] as string[],
  contactGroupIds: [] as string[],
  contactUserIds: [] as string[],
  targetAudience: "",
  isIntroductory: false,
  traqChannelId: "",
});
const lectureResources = ref<EditableResource[]>([]);
const lectureRelations = ref<EditableRelation[]>([]);
const sessionForm = reactive({
  name: "",
  description: "",
  order: 0,
  date: "",
  startTime: "",
  location: "",
  knoqUrl: "",
  instructorIds: [] as string[],
  replayOfSessionIds: [] as string[],
  status: "draft" as "draft" | "published",
  revision: 0,
});
const sessionResources = ref<EditableResource[]>([]);

const sortedSessions = computed(() =>
  [...(current.value?.sessions ?? [])].sort((a, b) => a.order - b.order),
);
const normalSessions = computed(() => sortedSessions.value.filter((session) => !session.isReplay));
const publishedSessionCount = computed(
  () => current.value?.sessions.filter((session) => session.status === "published").length ?? 0,
);
const sessionPublished = computed({
  get: () => sessionForm.status === "published",
  set: (value: boolean) => {
    sessionForm.status = value ? "published" : "draft";
  },
});
const flowTargets = computed<FlowTarget[]>(() => {
  if (!current.value) return [];
  return [
    {
      key: `lecture_pre:${current.value.id}`,
      label: "全般 · 講習会の事前",
      type: "lecture_pre",
      targetId: current.value.id,
    },
    ...sortedSessions.value.map((session) => ({
      key: `session_main:${session.id}`,
      label: `${session.name} · 開催のメイン`,
      type: "session_main" as const,
      targetId: session.id,
    })),
    {
      key: `lecture_post:${current.value.id}`,
      label: "事後 · 講習会の事後",
      type: "lecture_post",
      targetId: current.value.id,
    },
  ];
});
const selectedFlowTarget = computed(() =>
  flowTargets.value.find((target) => target.key === selectedFlowTargetKey.value),
);
const applicableFlowClasses = computed(() => {
  const target = selectedFlowTarget.value;
  if (!target) return [];
  return flowClasses.value.filter(
    (flowClass) =>
      flowClass.listed &&
      flowClass.type === target.type &&
      !existingFlow(flowClass.id, target.targetId),
  );
});

const editorTabs = computed<EditorTab[]>(() => {
  if (!current.value) return [{ label: "設定", value: "settings", kind: "settings" }];

  const tabs: EditorTab[] = [];
  const appendFlowTabs = (
    type: FlowClass["type"],
    targetId: string,
    label: string,
    sessionId?: string,
  ) => {
    const flows = appliedFlows.value.filter(
      (flow) => flow.type === type && flow.targetId === targetId,
    );
    flows.forEach((flow, index) => {
      tabs.push({
        label: flows.length === 1 ? label : `${label} ${index + 1}`,
        value: `flow:${flow.id}`,
        kind: "flow",
        flowId: flow.id,
        flowType: type,
        targetId,
        sessionId,
      });
    });
  };

  appendFlowTabs("lecture_pre", current.value.id, "全般");
  sortedSessions.value.forEach((session) =>
    appendFlowTabs("session_main", session.id, session.name, session.id),
  );
  appendFlowTabs("lecture_post", current.value.id, "事後");
  tabs.push({ label: "＋ Flowを追加", value: "add-flow", kind: "add-flow" });
  tabs.push({ label: "設定", value: "settings", kind: "settings" });
  return tabs;
});

function editorTab(value: string) {
  return editorTabs.value.find((item) => item.value === value)!;
}
function flowTypeLabel(type?: FlowClass["type"]) {
  if (type === "lecture_pre") return "講習会の事前Flow";
  if (type === "lecture_post") return "講習会の事後Flow";
  return "開催のメインFlow";
}
function selectEditorTab(value: string) {
  if (value === "add-flow") {
    openFlowModal();
    return;
  }
  activeTab.value = value;
}
function selectSessionTab(sessionId: string) {
  const tab = editorTabs.value.find((item) => item.sessionId === sessionId);
  activeTab.value = tab?.value ?? "settings";
}

function resourceRows(resources: Lecture["resources"]): EditableResource[] {
  return resources.map((resource) => ({ title: resource.title ?? "", url: resource.url }));
}
function normalizedResources(resources: EditableResource[]) {
  return resources
    .map((resource) => ({ title: resource.title.trim() || undefined, url: resource.url.trim() }))
    .filter((resource) => resource.url);
}
function addLectureResource() {
  lectureResources.value.push({ title: "", url: "" });
}
function removeLectureResource(index: number) {
  lectureResources.value.splice(index, 1);
}
function addSessionResource() {
  sessionResources.value.push({ title: "", url: "" });
}
function removeSessionResource(index: number) {
  sessionResources.value.splice(index, 1);
}
function addRelation() {
  lectureRelations.value.push({ type: "prerequisite", toLectureId: "" });
}
function removeRelation(index: number) {
  lectureRelations.value.splice(index, 1);
}
function existingFlow(flowClassId: string, targetId: string) {
  return appliedFlows.value.find(
    (flow) => flow.flowClassId === flowClassId && flow.targetId === targetId,
  );
}
function formatFailure(reason: unknown, fallback: string) {
  const message = reason instanceof Error ? reason.message : fallback;
  return message.includes("(409)")
    ? `${fallback}。別の編集が先に保存されています。再読み込みしてからやり直してください。`
    : message;
}

function fillLecture(lecture: Lecture) {
  current.value = lecture;
  Object.assign(form, {
    name: lecture.name,
    description: lecture.description || "",
    academicYearStart: lecture.academicYearStart,
    academicYearEnd: lecture.academicYearEnd,
    fieldId: lecture.fieldId || "",
    organizerGroupIds: [...lecture.organizerGroupIds],
    organizerUserIds: [...lecture.organizerUserIds],
    contactGroupIds: [...lecture.contactGroupIds],
    contactUserIds: [...lecture.contactUserIds],
    targetAudience: lecture.targetAudience || "",
    isIntroductory: lecture.isIntroductory,
    traqChannelId: lecture.traqChannelId || "",
  });
  lectureResources.value = resourceRows(lecture.resources);
  lectureRelations.value = lecture.relations.map((relation) => ({ ...relation }));
}
function fillSession(session: Session) {
  sessionEditingId.value = session.id;
  sessionEditorOpen.value = true;
  Object.assign(sessionForm, {
    name: session.name,
    description: session.description || "",
    order: session.order,
    date: session.date || "",
    startTime: session.startTime || "",
    location: session.location || "",
    knoqUrl: session.knoqUrl || "",
    instructorIds: [...session.instructorIds],
    replayOfSessionIds: [...session.replayOfSessionIds],
    status: session.status,
    revision: session.revision,
  });
  sessionResources.value = resourceRows(session.resources);
}
function editSession(session: Session) {
  activeTab.value = "settings";
  fillSession(session);
  requestAnimationFrame(() =>
    document.querySelector("#session-editor")?.scrollIntoView({ behavior: "smooth" }),
  );
}
function resetSession() {
  activeTab.value = "settings";
  sessionEditingId.value = "";
  sessionEditorOpen.value = true;
  Object.assign(sessionForm, {
    name: "",
    description: "",
    order: Math.max(-1, ...sortedSessions.value.map((session) => session.order)) + 1,
    date: "",
    startTime: "",
    location: "",
    knoqUrl: "",
    instructorIds: [],
    replayOfSessionIds: [],
    status: "draft",
    revision: 0,
  });
  sessionResources.value = [];
  requestAnimationFrame(() =>
    document.querySelector("#session-editor")?.scrollIntoView({ behavior: "smooth" }),
  );
}
function duplicateSession(session: Session, asReplay: boolean) {
  activeTab.value = "settings";
  sessionEditingId.value = "";
  sessionEditorOpen.value = true;
  Object.assign(sessionForm, {
    name: asReplay ? `${session.name}（再放送）` : session.name,
    description: session.description || "",
    order: Math.max(-1, ...sortedSessions.value.map((item) => item.order)) + 1,
    date: session.date || "",
    startTime: session.startTime || "",
    location: session.location || "",
    knoqUrl: session.knoqUrl || "",
    instructorIds: [...session.instructorIds],
    replayOfSessionIds: asReplay ? [session.id] : [],
    status: "draft",
    revision: 0,
  });
  sessionResources.value = resourceRows(session.resources);
  requestAnimationFrame(() =>
    document.querySelector("#session-editor")?.scrollIntoView({ behavior: "smooth" }),
  );
}
function closeSessionEditor() {
  sessionEditorOpen.value = false;
  sessionEditingId.value = "";
}
function setReplaySource(sessionId: string, selected: boolean) {
  const currentIds = sessionForm.replayOfSessionIds.filter((id) => id !== sessionId);
  sessionForm.replayOfSessionIds = selected ? [...currentIds, sessionId] : currentIds;
}

async function refreshFlows(lecture: Lecture) {
  const lists = await Promise.all([
    listFlows({ targetId: lecture.id }),
    ...lecture.sessions.map((session) => listFlows({ targetId: session.id })),
  ]);
  appliedFlows.value = lists.flat();
}
async function load() {
  loading.value = true;
  ready.value = false;
  error.value = "";
  notice.value = "";
  try {
    const [directoryValue, fieldValues, lectureValues, flowValues] = await Promise.all([
      getDirectory(),
      listFields(),
      listLecturesForEditor(),
      listFlowClasses(true),
    ]);
    directory.value = directoryValue;
    fields.value = fieldValues;
    lectures.value = lectureValues;
    flowClasses.value = flowValues;
    if (!isNew.value) {
      const lecture = await getLecture(lectureId.value, true);
      fillLecture(lecture);
      await refreshFlows(lecture);
      const requestedSessionId = Array.isArray(route.query.session)
        ? route.query.session[0]
        : route.query.session;
      const requestedSession = lecture.sessions.find(
        (session) => session.id === requestedSessionId,
      );
      if (requestedSession) {
        activeTab.value = "settings";
        fillSession(requestedSession);
      } else {
        activeTab.value = editorTabs.value.find((tab) => tab.kind === "flow")?.value ?? "settings";
      }
    }
    ready.value = true;
  } catch (reason) {
    error.value = formatFailure(reason, "編集データを読み込めませんでした");
  } finally {
    loading.value = false;
  }
}
async function listLecturesForEditor() {
  const module = await import("@/api/resources");
  return module.listLectures({ includeDraft: true });
}
function lectureBody(): LectureWrite {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    academicYearStart: Number(form.academicYearStart),
    academicYearEnd: Number(form.academicYearEnd),
    fieldId: form.fieldId || undefined,
    organizerGroupIds: form.organizerGroupIds,
    organizerUserIds: form.organizerUserIds,
    contactGroupIds: form.contactGroupIds,
    contactUserIds: form.contactUserIds,
    targetAudience: form.targetAudience.trim() || undefined,
    isIntroductory: form.isIntroductory,
    traqChannelId: form.traqChannelId.trim() || undefined,
    resources: normalizedResources(lectureResources.value),
    relations: lectureRelations.value
      .filter((relation) => relation.toLectureId && relation.toLectureId !== current.value?.id)
      .map((relation) => ({ ...relation })),
    expectedRevision: current.value?.revision ?? 0,
  };
}
async function saveLecture() {
  saving.value = true;
  error.value = "";
  notice.value = "";
  try {
    const saved = isNew.value
      ? await createLecture(lectureBody())
      : await updateLecture(lectureId.value, lectureBody());
    if (isNew.value) await router.replace(`/admin/lectures/${saved.id}`);
    fillLecture(saved);
    confirmation.value = { kind: "lecture", name: saved.name };
  } catch (reason) {
    error.value = formatFailure(reason, "講習会を保存できませんでした");
  } finally {
    saving.value = false;
  }
}
function sessionBody(): SessionWrite {
  return {
    name: sessionForm.name.trim(),
    description: sessionForm.description.trim() || undefined,
    order: Number(sessionForm.order),
    date: sessionForm.date || undefined,
    startTime: sessionForm.startTime || undefined,
    location: sessionForm.location.trim() || undefined,
    knoqUrl: sessionForm.knoqUrl.trim() || undefined,
    instructorIds: sessionForm.instructorIds,
    resources: normalizedResources(sessionResources.value),
    replayOfSessionIds: sessionForm.replayOfSessionIds,
    status: sessionForm.status,
    expectedRevision: sessionForm.revision,
  };
}
async function saveSession() {
  if (!current.value) return;
  saving.value = true;
  error.value = "";
  notice.value = "";
  try {
    const saved = sessionEditingId.value
      ? await updateSession(sessionEditingId.value, sessionBody())
      : await createSession(current.value.id, sessionBody());
    const lecture = await getLecture(current.value.id, true);
    fillLecture(lecture);
    await refreshFlows(lecture);
    fillSession(saved);
    selectSessionTab(saved.id);
    confirmation.value = { kind: "session", name: saved.name };
  } catch (reason) {
    error.value = formatFailure(reason, "開催を保存できませんでした");
  } finally {
    saving.value = false;
  }
}
async function startFlow(flowClassId: string, targetId: string) {
  error.value = "";
  applyingFlow.value = true;
  try {
    const existing = existingFlow(flowClassId, targetId);
    const flow = existing || (await applyFlow(flowClassId, targetId));
    if (current.value) await refreshFlows(current.value);
    activeTab.value = `flow:${flow.id}`;
    flowModalOpen.value = false;
  } catch (reason) {
    error.value = formatFailure(reason, "Flowを適用できませんでした");
  } finally {
    applyingFlow.value = false;
  }
}
function openFlowModal() {
  const currentTab = editorTabs.value.find((tab) => tab.value === activeTab.value);
  const currentTarget = flowTargets.value.find(
    (target) => target.type === currentTab?.flowType && target.targetId === currentTab?.targetId,
  );
  const firstAvailableTarget = flowTargets.value.find((target) =>
    flowClasses.value.some(
      (flowClass) =>
        flowClass.listed &&
        flowClass.type === target.type &&
        !existingFlow(flowClass.id, target.targetId),
    ),
  );
  selectedFlowTargetKey.value =
    currentTarget?.key ?? firstAvailableTarget?.key ?? flowTargets.value[0]?.key ?? "";
  flowModalOpen.value = true;
}
async function handleInlineFlowUpdated(updated: Flow) {
  const index = appliedFlows.value.findIndex((flow) => flow.id === updated.id);
  if (index >= 0) appliedFlows.value[index] = updated;
  if (!current.value) return;
  const refreshed = await getLecture(current.value.id, true);
  fillLecture(refreshed);
  await refreshFlows(refreshed);
  activeTab.value = `flow:${updated.id}`;
}
function resumeEditing(tab: string) {
  confirmation.value = undefined;
  activeTab.value = tab;
}

onMounted(load);
</script>

<template>
  <div class="page lecture-editor-page">
    <div class="breadcrumb">
      <RouterLink to="/admin">運営向けページ</RouterLink><b>/</b
      ><span>{{ isNew ? "講習会を作成" : "講習会を編集" }}</span>
    </div>
    <header class="editor-header">
      <h1>{{ isNew ? "講習会を作成" : "講習会を編集" }}</h1>
      <div v-if="current" class="header-actions">
        <span :class="['derived-status', { published: current.isPublished }]">
          <span></span>{{ current.isPublished ? "公開対象" : "非公開" }}
        </span>
        <BasiqButton
          v-if="current.isPublished"
          tone="neutral"
          variant="outline"
          type="button"
          @click="router.push(`/lectures/${current.id}`)"
          >公開画面を見る</BasiqButton
        >
      </div>
    </header>

    <div v-if="loading" class="loading-state">編集データを読み込んでいます</div>
    <div v-else-if="!ready" class="load-failure" role="alert">
      <BasiqCard>
        <template #header><h2>編集データを読み込めませんでした</h2></template>
        <p>{{ error }}</p>
        <template #footer><BasiqButton type="button" @click="load">再試行</BasiqButton></template>
      </BasiqCard>
    </div>

    <template v-else>
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      <p v-if="error" class="notice error" role="alert">{{ error }}</p>

      <BasiqCard v-if="confirmation && current" class="confirmation-card">
        <template #header>
          <div class="confirmation-heading">
            <span class="confirmation-mark"><AppIcon name="check" /></span>
            <div>
              <p class="card-kicker">保存しました</p>
              <h2>{{ confirmation.name }}</h2>
            </div>
          </div>
        </template>
        <div class="confirmation-body">
          <p>
            {{
              confirmation.kind === "lecture" ? "講習会情報" : "開催情報"
            }}を保存しました。公開状態は公開中のSession数から決まります。
          </p>
          <dl>
            <div>
              <dt>公開中の開催</dt>
              <dd>{{ publishedSessionCount }}件</dd>
            </div>
            <div>
              <dt>講習会の表示</dt>
              <dd>{{ current.isPublished ? "学習者に表示" : "学習者には非表示" }}</dd>
            </div>
            <div>
              <dt>登録済み開催</dt>
              <dd>{{ current.sessions.length }}件</dd>
            </div>
          </dl>
        </div>
        <template #footer>
          <div class="confirmation-actions">
            <BasiqButton
              tone="neutral"
              variant="outline"
              type="button"
              @click="resumeEditing('settings')"
              >設定へ戻る</BasiqButton
            >
            <BasiqButton type="button" @click="resumeEditing(editorTabs[0]?.value ?? 'settings')"
              >Flowへ戻る</BasiqButton
            >
          </div>
        </template>
      </BasiqCard>

      <template v-else>
        <BasiqTabs
          :model-value="activeTab"
          class="editor-tabs"
          :items="editorTabs"
          aria-label="講習会のFlow"
          list-width="100%"
          @update:model-value="selectEditorTab"
        >
          <template #trigger="{ item: triggerItem }">
            <span v-if="triggerItem.value === 'add-flow'" class="add-tab-control">
              <AppIcon name="plus" :size="16" />
              <span class="add-tab-text">Flowを追加</span>
            </span>
            <template v-else>{{ triggerItem.label }}</template>
          </template>
          <template #content="{ item }">
            <div v-for="tab in [editorTab(item.value)]" :key="tab.value">
              <div class="tab-content">
                <section v-if="tab.kind === 'flow'" class="flow-tab-panel">
                  <FlowInlineRunner
                    v-if="tab.flowId"
                    :flow-id="tab.flowId"
                    @updated="handleInlineFlowUpdated"
                  />
                </section>

                <form
                  v-if="tab.kind === 'settings' && sessionEditorOpen"
                  id="session-editor"
                  class="session-form"
                  @submit.prevent="saveSession"
                >
                  <BasiqCard class="section-card">
                    <template #header>
                      <div class="card-heading">
                        <div>
                          <p class="card-kicker">SESSION</p>
                          <h2>{{ sessionEditingId ? "開催情報を編集" : "開催を追加" }}</h2>
                        </div>
                        <BasiqButton
                          v-if="sessionEditingId"
                          tone="neutral"
                          variant="outline"
                          type="button"
                          @click="closeSessionEditor"
                          >編集を閉じる</BasiqButton
                        >
                      </div>
                    </template>
                    <div class="form-stack">
                      <div class="session-publish-control">
                        <div>
                          <strong>このSessionを学習者に公開する</strong>
                          <p>Lectureの公開状態は公開中のSession数から決まります。</p>
                        </div>
                        <BasiqSwitch v-model="sessionPublished">{{
                          sessionPublished ? "公開" : "下書き"
                        }}</BasiqSwitch>
                      </div>
                      <BasiqFormField label="開催名" required
                        ><BasiqInput
                          v-model="sessionForm.name"
                          required
                          placeholder="例：第1回、Web編、OSINT編"
                      /></BasiqFormField>
                      <BasiqFormField label="この開催の説明"
                        ><BasiqTextarea v-model="sessionForm.description" :rows="4"
                      /></BasiqFormField>
                      <div class="field-grid three">
                        <label class="native-field"
                          ><span>表示順 *</span
                          ><input v-model.number="sessionForm.order" type="number" min="0" required
                        /></label>
                        <label class="native-field"
                          ><span>日付</span><input v-model="sessionForm.date" type="date"
                        /></label>
                        <label class="native-field"
                          ><span>開始時刻</span
                          ><input
                            v-model="sessionForm.startTime"
                            type="time"
                            :disabled="!sessionForm.date"
                        /></label>
                      </div>
                      <div class="field-grid">
                        <BasiqFormField label="場所"
                          ><BasiqInput
                            v-model="sessionForm.location"
                            placeholder="教室・Discord・Qallなど"
                        /></BasiqFormField>
                        <BasiqFormField label="knoQイベントURL"
                          ><BasiqInput
                            v-model="sessionForm.knoqUrl"
                            type="url"
                            placeholder="https://knoq.trap.jp/..."
                        /></BasiqFormField>
                      </div>
                      <label class="native-field"
                        ><span>講師（個人）</span
                        ><select v-model="sessionForm.instructorIds" multiple>
                          <option v-for="user in directory.users" :key="user.id" :value="user.id">
                            {{ user.displayName }} (@{{ user.traqId }})
                          </option>
                        </select></label
                      >
                    </div>
                  </BasiqCard>
                  <BasiqCard class="section-card">
                    <template #header
                      ><div>
                        <p class="card-kicker">REPLAY OF</p>
                        <h2>再放送・総集編の元Session</h2>
                      </div></template
                    >
                    <p class="section-lead">
                      1件以上選ぶと再放送、複数選ぶと総集編として扱います。
                    </p>
                    <div
                      v-if="
                        normalSessions.filter((session) => session.id !== sessionEditingId).length
                      "
                      class="replay-options"
                    >
                      <label
                        v-for="session in normalSessions.filter(
                          (entry) => entry.id !== sessionEditingId,
                        )"
                        :key="session.id"
                        :class="{ selected: sessionForm.replayOfSessionIds.includes(session.id) }"
                        ><BasiqCheckbox
                          :model-value="sessionForm.replayOfSessionIds.includes(session.id)"
                          @update:model-value="setReplaySource(session.id, $event)"
                        /><span
                          ><strong>{{ session.name }}</strong
                          ><small>{{ session.date || "日付未定" }}</small></span
                        ></label
                      >
                    </div>
                    <p v-else class="empty-copy">元にできる通常Sessionはありません。</p>
                  </BasiqCard>
                  <BasiqCard class="section-card">
                    <template #header
                      ><div class="card-heading">
                        <div>
                          <p class="card-kicker">SESSION RESOURCE</p>
                          <h2>この開催のResource</h2>
                        </div>
                        <BasiqButton
                          tone="neutral"
                          variant="outline"
                          type="button"
                          @click="addSessionResource"
                          ><AppIcon name="plus" :size="16" />Resourceを追加</BasiqButton
                        >
                      </div></template
                    >
                    <div v-if="sessionResources.length" class="resource-editor-list">
                      <div
                        v-for="(resource, index) in sessionResources"
                        :key="index"
                        class="resource-editor-row"
                      >
                        <BasiqFormField label="表示名"
                          ><BasiqInput v-model="resource.title" /></BasiqFormField
                        ><BasiqFormField label="URL" required
                          ><BasiqInput v-model="resource.url" type="url" required /></BasiqFormField
                        ><BasiqButton
                          tone="neutral"
                          variant="outline"
                          type="button"
                          @click="removeSessionResource(index)"
                          >入力を外す</BasiqButton
                        >
                      </div>
                    </div>
                    <p v-else class="empty-copy">この開催のResourceはありません。</p>
                  </BasiqCard>
                  <footer class="sticky-actions">
                    <span>予定・進行中・終了は日付から判断します。</span>
                    <div>
                      <BasiqButton
                        v-if="sessionEditingId"
                        tone="neutral"
                        variant="outline"
                        type="button"
                        @click="closeSessionEditor"
                        >キャンセル</BasiqButton
                      ><BasiqButton type="submit" :disabled="saving">{{
                        saving ? "保存中…" : "開催を保存"
                      }}</BasiqButton>
                    </div>
                  </footer>
                </form>

                <form
                  v-if="tab.kind === 'settings'"
                  class="lecture-form"
                  @submit.prevent="saveLecture"
                >
                  <BasiqCard class="section-card">
                    <template #header
                      ><div>
                        <p class="card-kicker">LECTURE SETTINGS</p>
                        <h2>講習会共通の情報</h2>
                      </div></template
                    >
                    <div class="form-stack">
                      <BasiqFormField label="講習会名" required
                        ><BasiqInput v-model="form.name" maxlength="200" required
                      /></BasiqFormField>
                      <BasiqFormField label="概要"
                        ><BasiqTextarea v-model="form.description" :rows="4"
                      /></BasiqFormField>
                      <div class="field-grid">
                        <label class="native-field"
                          ><span>開始学年度 *</span
                          ><input
                            v-model.number="form.academicYearStart"
                            type="number"
                            min="2000"
                            max="2200"
                            required /></label
                        ><label class="native-field"
                          ><span>終了学年度 *</span
                          ><input
                            v-model.number="form.academicYearEnd"
                            type="number"
                            min="2000"
                            max="2200"
                            required
                        /></label>
                      </div>
                      <div class="field-grid">
                        <label class="native-field"
                          ><span>分野</span
                          ><select v-model="form.fieldId">
                            <option value="">未指定</option>
                            <option v-for="field in fields" :key="field.id" :value="field.id">
                              {{ field.name }}
                            </option>
                          </select></label
                        >
                        <div class="switch-field">
                          <BasiqSwitch v-model="form.isIntroductory">その分野の0→1講習</BasiqSwitch
                          ><small>難易度とは別の属性です。</small>
                        </div>
                      </div>
                      <BasiqFormField label="対象者"
                        ><BasiqTextarea v-model="form.targetAudience" :rows="3"
                      /></BasiqFormField>
                    </div>
                  </BasiqCard>
                  <BasiqCard class="section-card">
                    <template #header
                      ><div>
                        <p class="card-kicker">OPERATORS</p>
                        <h2>運営と問い合わせ先</h2>
                      </div></template
                    >
                    <div class="form-stack">
                      <p class="section-lead">講師は各Sessionで設定します。</p>
                      <div class="field-grid">
                        <label class="native-field"
                          ><span>運営グループ</span
                          ><select v-model="form.organizerGroupIds" multiple>
                            <option
                              v-for="group in directory.groups"
                              :key="group.id"
                              :value="group.id"
                            >
                              {{ group.name }}
                            </option>
                          </select></label
                        >
                        <label class="native-field"
                          ><span>運営メンバー</span
                          ><select v-model="form.organizerUserIds" multiple>
                            <option v-for="user in directory.users" :key="user.id" :value="user.id">
                              {{ user.displayName }} (@{{ user.traqId }})
                            </option>
                          </select></label
                        >
                        <label class="native-field"
                          ><span>問い合わせグループ</span
                          ><select v-model="form.contactGroupIds" multiple>
                            <option
                              v-for="group in directory.groups"
                              :key="group.id"
                              :value="group.id"
                            >
                              {{ group.name }}
                            </option>
                          </select></label
                        >
                        <label class="native-field"
                          ><span>問い合わせメンバー</span
                          ><select v-model="form.contactUserIds" multiple>
                            <option v-for="user in directory.users" :key="user.id" :value="user.id">
                              {{ user.displayName }} (@{{ user.traqId }})
                            </option>
                          </select></label
                        >
                      </div>
                      <BasiqFormField label="関連traQチャンネルID"
                        ><BasiqInput v-model="form.traqChannelId"
                      /></BasiqFormField>
                    </div>
                  </BasiqCard>
                  <BasiqCard class="section-card">
                    <template #header
                      ><div class="card-heading">
                        <div>
                          <p class="card-kicker">LECTURE RESOURCE</p>
                          <h2>講習会共通のResource</h2>
                        </div>
                        <BasiqButton
                          tone="neutral"
                          variant="outline"
                          type="button"
                          @click="addLectureResource"
                          ><AppIcon name="plus" :size="16" />Resourceを追加</BasiqButton
                        >
                      </div></template
                    >
                    <div v-if="lectureResources.length" class="resource-editor-list">
                      <div
                        v-for="(resource, index) in lectureResources"
                        :key="index"
                        class="resource-editor-row"
                      >
                        <BasiqFormField label="表示名"
                          ><BasiqInput v-model="resource.title" /></BasiqFormField
                        ><BasiqFormField label="URL" required
                          ><BasiqInput v-model="resource.url" type="url" required /></BasiqFormField
                        ><BasiqButton
                          tone="neutral"
                          variant="outline"
                          type="button"
                          @click="removeLectureResource(index)"
                          >入力を外す</BasiqButton
                        >
                      </div>
                    </div>
                    <p v-else class="empty-copy">講習会共通のResourceはありません。</p>
                  </BasiqCard>
                  <BasiqCard class="section-card">
                    <template #header
                      ><div class="card-heading">
                        <div>
                          <p class="card-kicker">LECTURE RELATION</p>
                          <h2>関連するLecture</h2>
                        </div>
                        <BasiqButton
                          tone="neutral"
                          variant="outline"
                          type="button"
                          @click="addRelation"
                          ><AppIcon name="plus" :size="16" />関係を追加</BasiqButton
                        >
                      </div></template
                    >
                    <div v-if="lectureRelations.length" class="relation-list">
                      <div
                        v-for="(relation, index) in lectureRelations"
                        :key="index"
                        class="relation-row"
                      >
                        <label class="native-field"
                          ><span>関係</span
                          ><select v-model="relation.type">
                            <option
                              v-for="type in relationTypes"
                              :key="type.value"
                              :value="type.value"
                            >
                              {{ type.label }}
                            </option>
                          </select></label
                        ><label class="native-field"
                          ><span>対象の講習会</span
                          ><select v-model="relation.toLectureId" required>
                            <option value="">選択してください</option>
                            <option
                              v-for="lecture in lectures.filter(
                                (entry) => entry.id !== current?.id,
                              )"
                              :key="lecture.id"
                              :value="lecture.id"
                            >
                              {{ lecture.name }}（{{ lecture.academicYearStart }}年度）
                            </option>
                          </select></label
                        ><BasiqButton
                          tone="neutral"
                          variant="outline"
                          type="button"
                          @click="removeRelation(index)"
                          >入力を外す</BasiqButton
                        >
                      </div>
                    </div>
                    <p v-else class="empty-copy">関連するLectureは設定されていません。</p>
                  </BasiqCard>
                  <BasiqCard v-if="current" class="section-card">
                    <template #header
                      ><div class="card-heading">
                        <div>
                          <p class="card-kicker">SESSIONS</p>
                          <h2>開催の一覧</h2>
                        </div>
                        <BasiqButton
                          tone="neutral"
                          variant="outline"
                          type="button"
                          @click="resetSession"
                          ><AppIcon name="plus" :size="16" />開催を追加</BasiqButton
                        >
                      </div></template
                    >
                    <div v-if="sortedSessions.length" class="settings-session-list">
                      <article v-for="session in sortedSessions" :key="session.id">
                        <span
                          ><strong>{{ session.name }}</strong
                          ><small
                            >{{ session.date || "日付未定" }} ·
                            {{ session.status === "published" ? "公開" : "下書き" }}</small
                          ></span
                        >
                        <div class="session-actions">
                          <BasiqButton
                            tone="neutral"
                            variant="outline"
                            type="button"
                            @click="editSession(session)"
                            >編集</BasiqButton
                          >
                          <BasiqButton
                            tone="neutral"
                            variant="outline"
                            type="button"
                            @click="duplicateSession(session, false)"
                            >複製</BasiqButton
                          >
                          <BasiqButton
                            v-if="!session.isReplay"
                            tone="neutral"
                            variant="outline"
                            type="button"
                            @click="duplicateSession(session, true)"
                            >再放送として複製</BasiqButton
                          >
                        </div>
                      </article>
                    </div>
                    <p v-else class="empty-copy">開催はまだありません。</p>
                  </BasiqCard>
                  <footer class="sticky-actions">
                    <span>変更は属性単位の更新イベントとして記録されます。</span
                    ><BasiqButton type="submit" :disabled="saving">{{
                      saving ? "保存中…" : isNew ? "講習会を作成" : "講習会情報を保存"
                    }}</BasiqButton>
                  </footer>
                </form>
              </div>
            </div>
          </template>
        </BasiqTabs>

        <div
          v-if="flowModalOpen"
          class="flow-modal-backdrop"
          role="presentation"
          @click.self="flowModalOpen = false"
        >
          <BasiqCard
            class="flow-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="flow-modal-title"
          >
            <template #header>
              <div class="flow-modal-heading">
                <div>
                  <p class="card-kicker">FLOW STOCK</p>
                  <h2 id="flow-modal-title">Flowを追加</h2>
                </div>
                <BasiqButton
                  tone="neutral"
                  variant="outline"
                  type="button"
                  @click="flowModalOpen = false"
                  >閉じる</BasiqButton
                >
              </div>
            </template>
            <div class="flow-modal-body">
              <label class="native-field">
                <span>適用対象</span>
                <select v-model="selectedFlowTargetKey">
                  <option v-for="target in flowTargets" :key="target.key" :value="target.key">
                    {{ target.label }}
                  </option>
                </select>
              </label>
              <div v-if="applicableFlowClasses.length" class="flow-option-list">
                <div
                  v-for="flowClass in applicableFlowClasses"
                  :key="flowClass.id"
                  class="flow-option"
                >
                  <span
                    ><strong>{{ flowClass.name }}</strong
                    ><small>{{ flowTypeLabel(flowClass.type) }}</small></span
                  >
                  <BasiqButton
                    tone="neutral"
                    variant="outline"
                    type="button"
                    :disabled="applyingFlow"
                    @click="startFlow(flowClass.id, selectedFlowTarget!.targetId)"
                    >{{ applyingFlow ? "適用中…" : "適用して開始" }}</BasiqButton
                  >
                </div>
              </div>
              <div v-else class="empty-flow">
                <p>この対象に適用できるFlowClassがありません。</p>
                <RouterLink to="/stock">Flow Stockを開く</RouterLink>
              </div>
            </div>
          </BasiqCard>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
/* stylelint-disable no-descending-specificity */
.lecture-editor-page {
  width: min(1160px, 100%);
  padding: 30px 36px 96px;
}

.editor-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
}

.editor-header h1 {
  font-size: 30px;
  letter-spacing: -0.025em;
}

.header-actions,
.confirmation-actions,
.card-heading,
.session-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.derived-status,
.flow-state,
.snapshot-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px;
  border-radius: 999px;
  color: var(--basiq-color-content-subtle);
  background: var(--basiq-color-surface-muted);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.derived-status > span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentcolor;
}

.derived-status.published,
.flow-state.completed {
  color: var(--app-success);
  background: var(--app-success-soft);
}

.flow-state.active {
  color: var(--basiq-color-content-accent);
  background: var(--app-accent-soft);
}

.load-failure,
.confirmation-card {
  width: min(720px, 100%);
  margin: 36px auto;
}

.editor-tabs :deep([role="tabpanel"]) {
  background: var(--basiq-color-surface-base);
}

.add-tab-control {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--basiq-color-content-accent);
  font-weight: 700;
}

.tab-content {
  min-height: 680px;
  padding-top: 20px;
}

.lecture-form,
.session-form {
  width: min(900px, 100%);
  display: grid;
  gap: 16px;
  margin: 0 auto;
}

.flow-tab-panel {
  width: min(800px, 100%);
  margin: 0 auto;
}

.flow-tab-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 2px 12px;
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.flow-tab-header h2 {
  font-size: 24px;
}

.flow-tab-header p:last-child {
  color: var(--basiq-color-content-subtle);
  font-size: 12px;
}

.section-card,
.flow-focus-card,
.session-overview,
.confirmation-card {
  border: 1px solid var(--basiq-color-border-separator);
}

.section-card h2,
.flow-focus-card h2,
.confirmation-card h2 {
  font-size: 18px;
}

.session-overview h3 {
  margin-top: 6px;
  font-size: 17px;
}

.card-kicker {
  margin-bottom: 3px;
  color: var(--basiq-color-content-accent);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.form-stack {
  display: grid;
  gap: 17px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field-grid.three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.native-field {
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 6px;
  font-weight: 500;
}

.native-field > span {
  font-size: 12px;
}

.native-field select,
.native-field input {
  width: 100%;
  min-height: 40px;
  padding: 8px 11px;
  border: 1px solid var(--basiq-color-border-control);
  border-radius: var(--basiq-radius-sm);
  color: var(--basiq-color-content-default);
  background: var(--basiq-color-surface-base);
  font: inherit;
}

.native-field select[multiple] {
  min-height: 104px;
}

.switch-field {
  display: grid;
  align-content: center;
  gap: 5px;
  padding-top: 18px;
}

.switch-field small,
.section-lead,
.empty-copy,
.flow-description {
  color: var(--basiq-color-content-subtle);
  font-size: 12px;
}

.resource-editor-list,
.relation-list,
.flow-option-list,
.settings-session-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.resource-editor-row,
.relation-row {
  display: grid;
  grid-template-columns: 0.8fr 1.2fr auto;
  align-items: end;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
  background: var(--basiq-color-surface-container);
}

.flow-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 11px 12px;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
}

.flow-modal-backdrop {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(19 27 38 / 48%);
}

.flow-modal {
  width: min(560px, 100%);
  max-height: calc(100dvh - 48px);
  overflow: auto;
  border: 1px solid var(--basiq-color-border-control);
  box-shadow: 0 18px 60px rgb(19 27 38 / 24%);
}

.flow-modal-heading {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.flow-modal-heading h2 {
  font-size: 19px;
}

.flow-modal-body {
  display: grid;
  gap: 18px;
}

.flow-option > span {
  display: grid;
  gap: 2px;
}

.flow-option small {
  color: var(--basiq-color-content-subtle);
  font-size: 10px;
}

.empty-flow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.empty-flow a {
  color: var(--basiq-color-content-accent);
  font-weight: 700;
}

.flow-metrics,
.session-summary,
.confirmation-body dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  overflow: hidden;
  margin-top: 16px;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
}

.session-summary {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 0;
}

.flow-metrics > div,
.session-summary > div,
.confirmation-body dl > div {
  display: grid;
  gap: 3px;
  padding: 12px;
  border-right: 1px solid var(--basiq-color-border-separator);
}

.flow-metrics > div:last-child,
.session-summary > div:last-child,
.confirmation-body dl > div:last-child {
  border-right: 0;
}

.flow-metrics span,
.session-summary span,
.confirmation-body dt {
  color: var(--basiq-color-content-subtle);
  font-size: 10px;
}

.flow-metrics strong,
.session-summary strong,
.confirmation-body dd {
  font-size: 12px;
  font-weight: 700;
}

.snapshot-label {
  color: var(--basiq-color-content-accent);
  background: var(--app-accent-soft);
}

.flow-description code {
  font-size: 10px;
}

.session-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.session-form {
  padding: 18px;
  border: 2px solid var(--basiq-color-accent-default);
  border-radius: var(--basiq-radius-sm);
  background: var(--app-accent-faint);
}

.session-publish-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
  background: var(--basiq-color-surface-base);
}

.session-publish-control p {
  color: var(--basiq-color-content-subtle);
  font-size: 10px;
}

.replay-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.replay-options label {
  min-height: 54px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
  background: var(--basiq-color-surface-base);
}

.replay-options label.selected {
  border-color: var(--basiq-color-accent-default);
  background: var(--app-accent-soft);
}

.replay-options label > span {
  display: grid;
}

.replay-options small {
  color: var(--basiq-color-content-subtle);
  font-size: 10px;
}

.settings-session-list article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
  color: inherit;
  background: var(--basiq-color-surface-base);
  text-align: left;
}

.settings-session-list article > span {
  display: grid;
  gap: 3px;
}

.settings-session-list small {
  color: var(--basiq-color-content-subtle);
}

.sticky-actions {
  position: sticky;
  z-index: 20;
  bottom: 0;
  min-height: 66px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-top: 1px solid var(--basiq-color-border-separator);
  background: color-mix(in srgb, var(--basiq-color-surface-base) 96%, transparent);
  backdrop-filter: blur(8px);
}

.sticky-actions > span {
  color: var(--basiq-color-content-subtle);
  font-size: 11px;
}

.sticky-actions > div {
  display: flex;
  gap: 8px;
}

.confirmation-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.confirmation-mark {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--app-success);
  background: var(--app-success-soft);
}

.confirmation-body {
  display: grid;
  gap: 18px;
}

.confirmation-body > p {
  color: var(--basiq-color-content-subtle);
}

@media (width <= 760px) {
  .lecture-editor-page {
    padding: 18px 16px 122px;
  }

  .editor-header,
  .flow-tab-header,
  .card-heading,
  .session-actions,
  .sticky-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .field-grid,
  .field-grid.three,
  .replay-options,
  .resource-editor-row,
  .relation-row,
  .flow-metrics,
  .session-summary,
  .confirmation-body dl {
    grid-template-columns: 1fr;
  }

  .flow-metrics > div,
  .session-summary > div,
  .confirmation-body dl > div {
    border-right: 0;
    border-bottom: 1px solid var(--basiq-color-border-separator);
  }

  .header-actions {
    align-items: flex-end;
  }

  .editor-header h1 {
    font-size: 23px;
  }

  .flow-modal-backdrop {
    align-items: end;
    padding: 16px;
  }

  .flow-modal {
    max-height: calc(100dvh - 32px);
  }

  .flow-option {
    align-items: stretch;
    flex-direction: column;
  }
}

@media (width <= 390px) {
  .lecture-editor-page {
    padding-inline: 14px;
  }

  .add-tab-text {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}
</style>
