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
const activeTab = ref("lecture");
const current = ref<Lecture>();
const sessionEditorOpen = ref(false);
const sessionEditingId = ref("");

const editorTabs = [
  { label: "講習会情報", value: "lecture" },
  { label: "開催とFlow", value: "structure" },
];
const relationTypes: Array<{ value: RelationType; label: string }> = [
  { value: "prerequisite", label: "先に学ぶ（前提）" },
  { value: "previous_year", label: "前年度・過去年度版" },
  { value: "recommended_next", label: "次に学ぶ" },
];
const lectureFlowTypes: Array<{
  type: "lecture_pre" | "lecture_post";
  label: string;
  description: string;
}> = [
  {
    type: "lecture_pre",
    label: "講習会の事前Flow",
    description: "企画、準備、告知など、講習会全体を始める前の手順です。",
  },
  {
    type: "lecture_post",
    label: "講習会の事後Flow",
    description: "振り返り、教材整理、次年度への引き継ぎなどの手順です。",
  },
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
function flowStatusLabel(status: Flow["status"]) {
  if (status === "completed") return "完了";
  if (status === "cancelled") return "中断";
  return "進行中";
}
function flowOptions(type: FlowClass["type"], targetId: string) {
  return flowClasses.value.filter(
    (flowClass) =>
      flowClass.type === type &&
      (flowClass.listed ||
        appliedFlows.value.some(
          (flow) => flow.targetId === targetId && flow.flowClassId === flowClass.id,
        )),
  );
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
  fillSession(session);
  requestAnimationFrame(() =>
    document.querySelector("#session-editor")?.scrollIntoView({ behavior: "smooth" }),
  );
}
function resetSession() {
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
        activeTab.value = "structure";
        fillSession(requestedSession);
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
    confirmation.value = { kind: "session", name: saved.name };
  } catch (reason) {
    error.value = formatFailure(reason, "開催を保存できませんでした");
  } finally {
    saving.value = false;
  }
}
async function startFlow(flowClassId: string, targetId: string) {
  error.value = "";
  try {
    const existing = existingFlow(flowClassId, targetId);
    const flow = existing || (await applyFlow(flowClassId, targetId));
    await router.push(`/flows/${flow.id}`);
  } catch (reason) {
    error.value = formatFailure(reason, "Flowを適用できませんでした");
  }
}
function resumeEditing(tab: "lecture" | "structure") {
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
      <div>
        <p class="eyebrow">LECTURE EDITOR</p>
        <h1>{{ isNew ? "講習会を作成" : "講習会を編集" }}</h1>
        <p>講習会共通の情報と、各開催の情報を分けて管理します。</p>
      </div>
      <div v-if="current" class="header-actions">
        <span :class="['derived-status', { published: current.isPublished }]"
          ><span></span>{{ current.isPublished ? "公開対象" : "非公開" }}</span
        >
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
            {{ confirmation.kind === "lecture" ? "講習会情報" : "開催情報" }}を保存しました。
            公開状態はLectureではなく、公開中のSession数から決まります。
          </p>
          <dl>
            <div>
              <dt>公開中の開催</dt>
              <dd>{{ publishedSessionCount }}件</dd>
            </div>
            <div>
              <dt>講習会の表示</dt>
              <dd>
                {{ current.isPublished ? "学習者に表示されます" : "学習者には表示されません" }}
              </dd>
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
              @click="resumeEditing('lecture')"
              >講習会情報へ戻る</BasiqButton
            ><BasiqButton type="button" @click="resumeEditing('structure')"
              >開催とFlowを管理</BasiqButton
            >
          </div>
        </template>
      </BasiqCard>

      <template v-else>
        <section class="model-guide" aria-label="データの分け方">
          <div>
            <span class="model-label">Lecture</span><strong>講習会共通</strong
            ><small>内容・年度・分野・運営・共通資料</small>
          </div>
          <AppIcon name="chevron" :size="18" />
          <div>
            <span class="model-label">Session</span><strong>各開催</strong
            ><small>名前・日付・場所・講師・教材・公開状態</small>
          </div>
          <p>公開中のSessionが1件以上あると、Lectureが公開対象になります。</p>
        </section>

        <BasiqTabs
          v-model="activeTab"
          class="editor-tabs"
          :items="editorTabs"
          aria-label="講習会の編集項目"
          list-width="100%"
        >
          <template #content="{ item }">
            <div class="tab-content">
              <form
                v-if="item.value === 'lecture'"
                class="lecture-form"
                @submit.prevent="saveLecture"
              >
                <BasiqCard class="section-card">
                  <template #header
                    ><div>
                      <p class="card-kicker">LECTURE</p>
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
                          required
                      /></label>
                      <label class="native-field"
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
                      ><BasiqTextarea
                        v-model="form.targetAudience"
                        :rows="3"
                        placeholder="例：Linuxの基本操作を知っている人"
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
                    <p class="section-lead">
                      講師は各Sessionで設定します。ここでは講習会全体の運営と問い合わせ先を管理します。
                    </p>
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
                  <p class="section-lead">
                    各開催だけで使う教材はSession側へ登録します。自動継承はしません。
                  </p>
                  <div v-if="lectureResources.length" class="resource-editor-list">
                    <div
                      v-for="(resource, index) in lectureResources"
                      :key="index"
                      class="resource-editor-row"
                    >
                      <BasiqFormField label="表示名"
                        ><BasiqInput
                          v-model="resource.title"
                          placeholder="例：講義資料" /></BasiqFormField
                      ><BasiqFormField label="URL" required
                        ><BasiqInput
                          v-model="resource.url"
                          type="url"
                          placeholder="https://"
                          required /></BasiqFormField
                      ><BasiqButton
                        tone="neutral"
                        variant="outline"
                        type="button"
                        aria-label="このResource入力を外す"
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
                  <p class="section-lead">
                    関係は片方向です。年度版をまとめる上位オブジェクトは作りません。
                  </p>
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
                            v-for="lecture in lectures.filter((entry) => entry.id !== current?.id)"
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
                        aria-label="この関係入力を外す"
                        @click="removeRelation(index)"
                        >入力を外す</BasiqButton
                      >
                    </div>
                  </div>
                  <p v-else class="empty-copy">関連するLectureは設定されていません。</p>
                </BasiqCard>

                <footer class="sticky-actions">
                  <span>変更は保存操作ごとに属性単位の履歴として記録されます。</span
                  ><BasiqButton type="submit" :disabled="saving">{{
                    saving ? "保存中…" : isNew ? "講習会を作成" : "講習会情報を保存"
                  }}</BasiqButton>
                </footer>
              </form>

              <section v-else class="structure-panel">
                <div v-if="!current" class="empty-state">
                  先に「講習会情報」でLectureを保存してください。
                </div>
                <template v-else>
                  <BasiqCard class="flow-phase-card">
                    <template #header
                      ><div class="phase-heading">
                        <span class="phase-index">PRE</span>
                        <div>
                          <p class="card-kicker">LECTURE PRE</p>
                          <h2>{{ lectureFlowTypes[0]?.label }}</h2>
                          <p>{{ lectureFlowTypes[0]?.description }}</p>
                        </div>
                      </div></template
                    >
                    <div
                      v-if="flowOptions('lecture_pre', current.id).length"
                      class="flow-option-list"
                    >
                      <div
                        v-for="flowClass in flowOptions('lecture_pre', current.id)"
                        :key="flowClass.id"
                        class="flow-option"
                      >
                        <span
                          ><strong>{{ flowClass.name }}</strong
                          ><small v-if="existingFlow(flowClass.id, current.id)"
                            >{{ flowStatusLabel(existingFlow(flowClass.id, current.id)!.status) }} ·
                            適用時の本文を保持</small
                          ><small v-else>StockからこのLectureへ適用</small></span
                        ><BasiqButton
                          tone="neutral"
                          variant="outline"
                          type="button"
                          @click="startFlow(flowClass.id, current.id)"
                          >{{
                            existingFlow(flowClass.id, current.id) ? "再開・確認" : "適用して開始"
                          }}</BasiqButton
                        >
                      </div>
                    </div>
                    <div v-else class="empty-flow">
                      <p>利用できる事前Flowはありません。</p>
                      <RouterLink to="/stock">Flow Stockを開く</RouterLink>
                    </div>
                  </BasiqCard>

                  <section class="session-phase">
                    <header class="session-phase-heading">
                      <div>
                        <p class="card-kicker">SESSIONS</p>
                        <h2>各開催とメインFlow</h2>
                        <p>Sessionは1日で完結し、公開状態を個別に持ちます。</p>
                      </div>
                      <BasiqButton type="button" @click="resetSession"
                        ><AppIcon name="plus" :size="16" />開催を追加</BasiqButton
                      >
                    </header>
                    <div v-if="sortedSessions.length" class="session-timeline">
                      <article
                        v-for="(session, index) in sortedSessions"
                        :key="session.id"
                        class="session-item"
                      >
                        <div class="timeline-marker">{{ index + 1 }}</div>
                        <BasiqCard class="session-card">
                          <template #header
                            ><div class="session-card-heading">
                              <div>
                                <div class="session-badges">
                                  <span
                                    :class="[
                                      'pill',
                                      session.status === 'published' ? 'success' : 'draft',
                                    ]"
                                    >{{ session.status === "published" ? "公開" : "下書き" }}</span
                                  ><span v-if="session.isReplay" class="pill">再放送・総集編</span>
                                </div>
                                <h3>{{ session.name }}</h3>
                                <p>
                                  {{ session.date || "日付未定"
                                  }}<template v-if="session.startTime">
                                    {{ session.startTime }}</template
                                  >
                                  · {{ session.location || "場所未定" }}
                                </p>
                              </div>
                              <div class="session-actions">
                                <BasiqButton
                                  tone="neutral"
                                  variant="outline"
                                  type="button"
                                  @click="editSession(session)"
                                  ><AppIcon name="edit" :size="15" />編集</BasiqButton
                                ><BasiqButton
                                  tone="neutral"
                                  variant="outline"
                                  type="button"
                                  @click="duplicateSession(session, false)"
                                  ><AppIcon name="copy" :size="15" />内容を複製</BasiqButton
                                ><BasiqButton
                                  v-if="!session.isReplay"
                                  tone="neutral"
                                  variant="outline"
                                  type="button"
                                  @click="duplicateSession(session, true)"
                                  >再放送として複製</BasiqButton
                                >
                              </div>
                            </div></template
                          >
                          <div class="session-summary">
                            <div>
                              <span>表示順</span><strong>{{ session.order }}</strong>
                            </div>
                            <div>
                              <span>講師</span><strong>{{ session.instructorIds.length }}人</strong>
                            </div>
                            <div>
                              <span>Resource</span><strong>{{ session.resources.length }}件</strong>
                            </div>
                            <div v-if="session.isReplay">
                              <span>再放送元</span
                              ><strong>{{ session.replayOfSessionIds.length }}件</strong>
                            </div>
                          </div>
                          <section class="main-flow">
                            <div class="main-flow-heading">
                              <span>MAIN FLOW</span><strong>この開催のメインFlow</strong>
                            </div>
                            <div
                              v-if="flowOptions('session_main', session.id).length"
                              class="flow-option-list compact"
                            >
                              <div
                                v-for="flowClass in flowOptions('session_main', session.id)"
                                :key="flowClass.id"
                                class="flow-option"
                              >
                                <span
                                  ><strong>{{ flowClass.name }}</strong
                                  ><small v-if="existingFlow(flowClass.id, session.id)"
                                    >{{
                                      flowStatusLabel(
                                        existingFlow(flowClass.id, session.id)!.status,
                                      )
                                    }}
                                    · 適用時の本文を保持</small
                                  ><small v-else>StockからこのSessionへ適用</small></span
                                ><BasiqButton
                                  tone="neutral"
                                  variant="outline"
                                  type="button"
                                  @click="startFlow(flowClass.id, session.id)"
                                  >{{
                                    existingFlow(flowClass.id, session.id)
                                      ? "再開・確認"
                                      : "適用して開始"
                                  }}</BasiqButton
                                >
                              </div>
                            </div>
                            <div v-else class="empty-flow">
                              <p>利用できるメインFlowはありません。</p>
                            </div>
                          </section>
                        </BasiqCard>
                      </article>
                    </div>
                    <div v-else class="empty-session">
                      <strong>開催はまだありません</strong>
                      <p>
                        LectureはSession
                        0件でも保存できます。公開中のSessionを追加すると学習者に表示されます。
                      </p>
                    </div>
                  </section>

                  <form
                    v-if="sessionEditorOpen"
                    id="session-editor"
                    class="session-form"
                    @submit.prevent="saveSession"
                  >
                    <BasiqCard class="section-card">
                      <template #header
                        ><div class="card-heading">
                          <div>
                            <p class="card-kicker">SESSION</p>
                            <h2>{{ sessionEditingId ? "開催を編集" : "開催を追加" }}</h2>
                          </div>
                          <BasiqButton
                            tone="neutral"
                            variant="outline"
                            type="button"
                            @click="closeSessionEditor"
                            >閉じる</BasiqButton
                          >
                        </div></template
                      >
                      <div class="form-stack">
                        <div class="session-publish-control">
                          <div>
                            <strong>このSessionを学習者に公開する</strong>
                            <p>日時・場所・Resourceは未入力でも公開できます。</p>
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
                            ><input
                              v-model.number="sessionForm.order"
                              type="number"
                              min="0"
                              required /></label
                          ><label class="native-field"
                            ><span>日付</span
                            ><input v-model="sessionForm.date" type="date" /></label
                          ><label class="native-field"
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
                              placeholder="教室・Discord・Qallなどを自由記述" /></BasiqFormField
                          ><BasiqFormField label="knoQイベントURL"
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
                        1件以上選ぶと再放送として扱います。複数選ぶと総集編を表現できます。通常開催では何も選びません。
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
                      <p class="section-lead">Lecture共通Resourceとは独立して保存します。</p>
                      <div v-if="sessionResources.length" class="resource-editor-list">
                        <div
                          v-for="(resource, index) in sessionResources"
                          :key="index"
                          class="resource-editor-row"
                        >
                          <BasiqFormField label="表示名"
                            ><BasiqInput
                              v-model="resource.title"
                              placeholder="例：講義資料" /></BasiqFormField
                          ><BasiqFormField label="URL" required
                            ><BasiqInput
                              v-model="resource.url"
                              type="url"
                              placeholder="https://"
                              required /></BasiqFormField
                          ><BasiqButton
                            tone="neutral"
                            variant="outline"
                            type="button"
                            aria-label="このResource入力を外す"
                            @click="removeSessionResource(index)"
                            >入力を外す</BasiqButton
                          >
                        </div>
                      </div>
                      <p v-else class="empty-copy">この開催のResourceはありません。</p>
                    </BasiqCard>
                    <footer class="sticky-actions">
                      <span>予定・進行中・終了は状態として保存せず、日付から判断します。</span>
                      <div>
                        <BasiqButton
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

                  <BasiqCard class="flow-phase-card post">
                    <template #header
                      ><div class="phase-heading">
                        <span class="phase-index">POST</span>
                        <div>
                          <p class="card-kicker">LECTURE POST</p>
                          <h2>{{ lectureFlowTypes[1]?.label }}</h2>
                          <p>{{ lectureFlowTypes[1]?.description }}</p>
                        </div>
                      </div></template
                    >
                    <div
                      v-if="flowOptions('lecture_post', current.id).length"
                      class="flow-option-list"
                    >
                      <div
                        v-for="flowClass in flowOptions('lecture_post', current.id)"
                        :key="flowClass.id"
                        class="flow-option"
                      >
                        <span
                          ><strong>{{ flowClass.name }}</strong
                          ><small v-if="existingFlow(flowClass.id, current.id)"
                            >{{ flowStatusLabel(existingFlow(flowClass.id, current.id)!.status) }} ·
                            適用時の本文を保持</small
                          ><small v-else>StockからこのLectureへ適用</small></span
                        ><BasiqButton
                          tone="neutral"
                          variant="outline"
                          type="button"
                          @click="startFlow(flowClass.id, current.id)"
                          >{{
                            existingFlow(flowClass.id, current.id) ? "再開・確認" : "適用して開始"
                          }}</BasiqButton
                        >
                      </div>
                    </div>
                    <div v-else class="empty-flow">
                      <p>利用できる事後Flowはありません。</p>
                      <RouterLink to="/stock">Flow Stockを開く</RouterLink>
                    </div>
                  </BasiqCard>
                </template>
              </section>
            </div>
          </template>
        </BasiqTabs>
      </template>
    </template>
  </div>
</template>

<style scoped>
/* stylelint-disable no-descending-specificity */
.lecture-editor-page {
  width: min(1160px, 100%);
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

.editor-header > div:first-child > p:last-child {
  margin-top: 4px;
  color: var(--basiq-color-content-subtle);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.derived-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px;
  border-radius: 999px;
  color: var(--basiq-color-content-subtle);
  background: var(--basiq-color-surface-muted);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.derived-status > span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentcolor;
}

.derived-status.published {
  color: var(--app-success);
  background: var(--app-success-soft);
}

.load-failure,
.confirmation-card {
  width: min(720px, 100%);
  margin: 36px auto;
}

.load-failure p {
  color: var(--basiq-color-content-subtle);
}

.model-guide {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px 15px;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
  background: var(--basiq-color-surface-container);
}

.model-guide > div {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0 10px;
}

.model-guide strong {
  font-size: 13px;
}

.model-guide small {
  grid-column: 2;
  color: var(--basiq-color-content-subtle);
  font-size: 10px;
}

.model-guide > p {
  grid-column: 1 / -1;
  padding-top: 9px;
  border-top: 1px solid var(--basiq-color-border-separator);
  color: var(--basiq-color-content-subtle);
  font-size: 11px;
  text-align: center;
}

.model-label {
  grid-row: 1 / 3;
  align-self: center;
  padding: 3px 7px;
  border-radius: 999px;
  color: var(--basiq-color-content-accent);
  background: var(--app-accent-soft);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.tab-content {
  min-height: 660px;
  padding-top: 20px;
}

.lecture-form,
.structure-panel,
.session-form {
  width: min(940px, 100%);
  display: grid;
  gap: 16px;
  margin: 0 auto;
}

.section-card,
.flow-phase-card,
.session-card,
.confirmation-card {
  border: 1px solid var(--basiq-color-border-separator);
}

.section-card h2,
.flow-phase-card h2,
.confirmation-card h2 {
  font-size: 18px;
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
.empty-copy {
  color: var(--basiq-color-content-subtle);
  font-size: 12px;
}

.card-heading,
.confirmation-actions {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.resource-editor-list,
.relation-list {
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

.sticky-actions {
  position: sticky;
  z-index: 20;
  bottom: 0;
  min-height: 66px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 2px;
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

.confirmation-body dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
}

.confirmation-body dl > div {
  display: grid;
  gap: 3px;
  padding: 13px;
  border-right: 1px solid var(--basiq-color-border-separator);
}

.confirmation-body dl > div:last-child {
  border-right: 0;
}

.confirmation-body dt {
  color: var(--basiq-color-content-subtle);
  font-size: 10px;
  font-weight: 700;
}

.confirmation-body dd {
  font-weight: 700;
}

.phase-heading {
  display: flex;
  align-items: center;
  gap: 13px;
}

.phase-heading p:last-child,
.session-phase-heading p {
  color: var(--basiq-color-content-subtle);
  font-size: 11px;
}

.phase-index {
  width: 46px;
  height: 38px;
  display: grid;
  place-items: center;
  flex: none;
  border-radius: var(--basiq-radius-sm);
  color: var(--basiq-color-content-accent);
  background: var(--app-accent-soft);
  font-size: 10px;
  font-weight: 800;
}

.flow-phase-card.post .phase-index {
  color: var(--app-success);
  background: var(--app-success-soft);
}

.flow-option-list {
  display: grid;
  gap: 8px;
}

.flow-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 12px;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
}

.flow-option > span {
  min-width: 0;
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
  color: var(--basiq-color-content-subtle);
}

.empty-flow a {
  color: var(--basiq-color-content-accent);
  font-weight: 700;
}

.session-phase {
  display: grid;
  gap: 14px;
  padding: 8px 0;
}

.session-phase-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}

.session-phase-heading h2 {
  font-size: 20px;
}

.session-timeline {
  display: grid;
}

.session-item {
  position: relative;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 12px;
  padding-bottom: 14px;
}

.session-item:not(:last-child)::after {
  position: absolute;
  z-index: 0;
  top: 39px;
  bottom: -3px;
  left: 22px;
  width: 2px;
  background: var(--basiq-color-border-separator);
  content: "";
}

.timeline-marker {
  z-index: 1;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  justify-self: center;
  margin-top: 15px;
  border: 2px solid var(--basiq-color-accent-default);
  border-radius: 50%;
  color: var(--basiq-color-content-accent);
  background: var(--basiq-color-surface-base);
  font-size: 11px;
  font-weight: 800;
}

.session-card {
  min-width: 0;
}

.session-card-heading {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.session-card-heading h3 {
  margin-top: 6px;
  font-size: 17px;
}

.session-card-heading p {
  margin-top: 3px;
  color: var(--basiq-color-content-subtle);
  font-size: 11px;
}

.session-badges,
.session-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.session-actions {
  justify-content: flex-end;
}

.session-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
}

.session-summary > div {
  display: grid;
  gap: 2px;
  padding: 9px 11px;
  border-right: 1px solid var(--basiq-color-border-separator);
}

.session-summary > div:last-child {
  border-right: 0;
}

.session-summary span {
  color: var(--basiq-color-content-subtle);
  font-size: 9px;
}

.session-summary strong {
  font-size: 12px;
}

.main-flow {
  display: grid;
  gap: 9px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--basiq-color-border-separator);
}

.main-flow-heading {
  display: flex;
  align-items: center;
  gap: 9px;
}

.main-flow-heading span {
  color: var(--basiq-color-content-accent);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.main-flow-heading strong {
  font-size: 12px;
}

.flow-option-list.compact .flow-option {
  padding-block: 8px;
  background: var(--basiq-color-surface-container);
}

.empty-session {
  display: grid;
  gap: 4px;
  padding: 26px;
  border: 1px dashed var(--basiq-color-border-control);
  border-radius: var(--basiq-radius-sm);
  color: var(--basiq-color-content-subtle);
  text-align: center;
}

.empty-session strong {
  color: var(--basiq-color-content-default);
}

.session-form {
  margin-block: 12px 18px;
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

@media (width <= 920px) {
  .session-card-heading {
    flex-direction: column;
  }

  .session-actions {
    justify-content: flex-start;
  }

  .resource-editor-row,
  .relation-row {
    grid-template-columns: 1fr 1fr;
  }

  .resource-editor-row > button,
  .relation-row > button {
    grid-column: 1 / -1;
    justify-self: end;
  }
}

@media (width <= 760px) {
  .editor-header {
    gap: 10px;
  }

  .editor-header h1 {
    font-size: 22px;
  }

  .editor-header > div:first-child > p:last-child,
  .header-actions > button {
    display: none;
  }

  .model-guide {
    grid-template-columns: 1fr;
  }

  .model-guide > svg {
    display: none;
  }

  .model-guide > p {
    grid-column: 1;
    text-align: left;
  }

  .tab-content {
    padding-top: 16px;
  }

  .field-grid,
  .field-grid.three,
  .replay-options {
    grid-template-columns: 1fr;
  }

  .card-heading,
  .session-phase-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .resource-editor-row,
  .relation-row {
    grid-template-columns: 1fr;
  }

  .resource-editor-row > button,
  .relation-row > button {
    grid-column: auto;
    width: 100%;
  }

  .sticky-actions {
    position: fixed;
    right: 0;
    bottom: 63px;
    left: 0;
    min-height: 58px;
    padding: 8px 16px;
  }

  .sticky-actions > span {
    display: none;
  }

  .sticky-actions > button,
  .sticky-actions > div,
  .sticky-actions > div button:last-child {
    flex: 1;
  }

  .confirmation-body dl {
    grid-template-columns: 1fr;
  }

  .confirmation-body dl > div {
    border-right: 0;
    border-bottom: 1px solid var(--basiq-color-border-separator);
  }

  .confirmation-body dl > div:last-child {
    border-bottom: 0;
  }

  .confirmation-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .session-item {
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 7px;
  }

  .session-item:not(:last-child)::after {
    left: 16px;
  }

  .timeline-marker {
    width: 30px;
    height: 30px;
  }

  .session-actions {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr;
  }

  .session-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .session-summary > div:nth-child(2) {
    border-right: 0;
  }

  .session-summary > div:nth-child(-n + 2) {
    border-bottom: 1px solid var(--basiq-color-border-separator);
  }

  .flow-option,
  .empty-flow,
  .session-publish-control {
    align-items: flex-start;
    flex-direction: column;
  }

  .flow-option > button {
    width: 100%;
  }

  .session-form {
    padding: 10px;
  }
}
</style>
