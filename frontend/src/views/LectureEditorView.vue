<script setup lang="ts">
import {
  BasiqButton,
  BasiqCard,
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

const route = useRoute();
const router = useRouter();
const lectureId = computed(() => (route.params.id ? String(route.params.id) : ""));
const isNew = computed(() => !lectureId.value);
const loading = ref(!isNew.value);
const saving = ref(false);
const error = ref("");
const notice = ref("");
const fields = ref<Field[]>([]);
const directory = ref<Directory>({ users: [], groups: [] });
const lectures = ref<Lecture[]>([]);
const flowClasses = ref<FlowClass[]>([]);
const appliedFlows = ref<Flow[]>([]);
const selectedFlowClassId = ref("");
const activeTab = ref("general");
const editorTabs = [
  { label: "全般", value: "general" },
  { label: "開催", value: "sessions" },
  { label: "Flow", value: "flows" },
  { label: "設定", value: "settings" },
];
const current = ref<Lecture>();
const preFlowClasses = computed(() =>
  flowClasses.value.filter((item) => item.type === "lecture_pre"),
);
const lectureFlowClasses = computed(() =>
  flowClasses.value.filter((item) => item.type !== "session_main"),
);
const sessionFlowClasses = computed(() =>
  flowClasses.value.filter((item) => item.type === "session_main"),
);
function targetFlows(targetId: string) {
  return appliedFlows.value.filter((flow) => flow.targetId === targetId);
}
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
  resourcesText: "",
  relationsText: "",
});
const sessionEditingId = ref("");
const sessionForm = reactive({
  name: "",
  description: "",
  order: 0,
  date: "",
  startTime: "",
  location: "",
  knoqUrl: "",
  instructorIds: [] as string[],
  resourcesText: "",
  replayOfSessionIds: [] as string[],
  status: "draft" as "draft" | "published",
  revision: 0,
});

function resourcesFromText(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, ...urlParts] = line.split("|");
      const url = urlParts.join("|").trim();
      return url ? { title: title?.trim() || undefined, url } : { url: title?.trim() || "" };
    });
}
function resourcesToText(resources: Lecture["resources"]) {
  return resources
    .map((resource) => (resource.title ? `${resource.title} | ${resource.url}` : resource.url))
    .join("\n");
}
function relationsFromText(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [type, toLectureId] = line.split(",").map((part) => part.trim());
      return {
        type: type as "prerequisite" | "previous_year" | "recommended_next",
        toLectureId: toLectureId || "",
      };
    });
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
    resourcesText: resourcesToText(lecture.resources),
    relationsText: lecture.relations
      .map((relation) => `${relation.type}, ${relation.toLectureId}`)
      .join("\n"),
  });
}
function resetSession() {
  sessionEditingId.value = "";
  Object.assign(sessionForm, {
    name: "",
    description: "",
    order: current.value?.sessions.length ?? 0,
    date: "",
    startTime: "",
    location: "",
    knoqUrl: "",
    instructorIds: [],
    resourcesText: "",
    replayOfSessionIds: [],
    status: "draft",
    revision: 0,
  });
}
function editSession(session: Session) {
  sessionEditingId.value = session.id;
  Object.assign(sessionForm, {
    name: session.name,
    description: session.description || "",
    order: session.order,
    date: session.date || "",
    startTime: session.startTime || "",
    location: session.location || "",
    knoqUrl: session.knoqUrl || "",
    instructorIds: [...session.instructorIds],
    resourcesText: resourcesToText(session.resources),
    replayOfSessionIds: [...session.replayOfSessionIds],
    status: session.status,
    revision: session.revision,
  });
  document.querySelector("#session-editor")?.scrollIntoView({ behavior: "smooth" });
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
  error.value = "";
  try {
    const [directoryValue, fieldValues, lectureValues, flowValues] = await Promise.all([
      getDirectory(),
      listFields(),
      listLecturesForEditor(),
      listFlowClasses(false),
    ]);
    directory.value = directoryValue;
    fields.value = fieldValues;
    lectures.value = lectureValues;
    flowClasses.value = flowValues;
    if (!isNew.value) {
      const lecture = await getLecture(lectureId.value, true);
      fillLecture(lecture);
      await refreshFlows(lecture);
    }
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "読み込めませんでした";
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
    name: form.name,
    description: form.description || undefined,
    academicYearStart: Number(form.academicYearStart),
    academicYearEnd: Number(form.academicYearEnd),
    fieldId: form.fieldId || undefined,
    organizerGroupIds: form.organizerGroupIds,
    organizerUserIds: form.organizerUserIds,
    contactGroupIds: form.contactGroupIds,
    contactUserIds: form.contactUserIds,
    targetAudience: form.targetAudience || undefined,
    isIntroductory: form.isIntroductory,
    traqChannelId: form.traqChannelId || undefined,
    resources: resourcesFromText(form.resourcesText),
    relations: relationsFromText(form.relationsText),
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
    if (isNew.value && selectedFlowClassId.value) {
      const flow = await applyFlow(selectedFlowClassId.value, saved.id);
      await router.replace(`/flows/${flow.id}`);
      return;
    }
    if (isNew.value) {
      await router.replace(`/admin/lectures/${saved.id}`);
    }
    fillLecture(saved);
    notice.value = "講習会を保存しました。";
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "保存できませんでした";
  } finally {
    saving.value = false;
  }
}
function sessionBody(): SessionWrite {
  return {
    name: sessionForm.name,
    description: sessionForm.description || undefined,
    order: Number(sessionForm.order),
    date: sessionForm.date || undefined,
    startTime: sessionForm.startTime || undefined,
    location: sessionForm.location || undefined,
    knoqUrl: sessionForm.knoqUrl || undefined,
    instructorIds: sessionForm.instructorIds,
    resources: resourcesFromText(sessionForm.resourcesText),
    replayOfSessionIds: sessionForm.replayOfSessionIds,
    status: sessionForm.status,
    expectedRevision: sessionForm.revision,
  };
}
async function saveSession() {
  if (!current.value) return;
  saving.value = true;
  error.value = "";
  try {
    if (sessionEditingId.value) await updateSession(sessionEditingId.value, sessionBody());
    else await createSession(current.value.id, sessionBody());
    const lecture = await getLecture(current.value.id, true);
    fillLecture(lecture);
    await refreshFlows(lecture);
    resetSession();
    notice.value = "開催を保存しました。";
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "開催を保存できませんでした";
  } finally {
    saving.value = false;
  }
}
async function startFlow(flowClassId: string, targetId: string) {
  try {
    const existing = appliedFlows.value.find(
      (flow) => flow.flowClassId === flowClassId && flow.targetId === targetId,
    );
    const flow = existing || (await applyFlow(flowClassId, targetId));
    await router.push(`/flows/${flow.id}`);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "Flowを適用できませんでした";
  }
}
onMounted(load);
</script>

<template>
  <div class="page editor-page">
    <div class="breadcrumb">
      <RouterLink to="/admin">運営向けページ</RouterLink><b>/</b
      ><span>{{ isNew ? "講習会を登録" : "講習会を編集" }}</span>
    </div>
    <header class="editor-header">
      <div>
        <h1>{{ isNew ? "講習会を登録" : "講習会を編集" }}</h1>
        <p>講習会の情報、開催、Flowをひとつの画面で管理します。</p>
      </div>
      <div class="header-actions">
        <span v-if="current" :class="['header-status', current.isPublished ? '' : 'draft']"
          ><span></span>{{ current.isPublished ? "公開中" : "下書き" }}</span
        >
        <BasiqButton
          v-if="current?.isPublished"
          tone="neutral"
          variant="outline"
          @click="router.push(`/lectures/${current.id}`)"
          >公開画面を見る</BasiqButton
        >
      </div>
    </header>

    <div v-if="loading" class="loading-state">編集データを読み込んでいます</div>
    <template v-else>
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      <p v-if="error" class="notice error" role="alert">{{ error }}</p>

      <BasiqTabs
        v-model="activeTab"
        class="section-tabs"
        :items="editorTabs"
        aria-label="講習会の編集項目"
        list-width="100%"
      >
        <template #content="{ item }">
          <div class="tab-content">
            <form v-if="item.value === 'general'" @submit.prevent="saveLecture">
              <BasiqCard class="editor-card">
                <template #header
                  ><div>
                    <p class="card-kicker">全般</p>
                    <h2>講習会の基本情報</h2>
                  </div></template
                >
                <div class="form-stack">
                  <p class="step-lead">講習会そのものに共通する名前、概要、対象を設定します。</p>
                  <BasiqFormField label="講習会名" required
                    ><BasiqInput v-model="form.name" required maxlength="200"
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
                      ><small>初めて学ぶ人向けの入口として表示します。</small>
                    </div>
                  </div>
                  <BasiqFormField label="対象者"
                    ><BasiqTextarea v-model="form.targetAudience" :rows="3"
                  /></BasiqFormField>
                  <label v-if="isNew" class="native-field"
                    ><span>保存後に始める事前Flow</span
                    ><select v-model="selectedFlowClassId">
                      <option value="">Flowを使わず保存</option>
                      <option
                        v-for="flowClass in preFlowClasses"
                        :key="flowClass.id"
                        :value="flowClass.id"
                      >
                        {{ flowClass.name }}
                      </option>
                    </select></label
                  >
                </div>
              </BasiqCard>
              <footer class="sticky-actions">
                <BasiqButton type="submit" :disabled="saving">{{
                  saving ? "保存中…" : isNew ? "講習会を作成" : "変更を保存"
                }}</BasiqButton>
              </footer>
            </form>

            <section v-else-if="item.value === 'sessions'" class="tab-panel">
              <BasiqCard class="editor-card">
                <template #header
                  ><div class="card-heading">
                    <div>
                      <p class="card-kicker">開催</p>
                      <h2>開催の一覧</h2>
                    </div>
                    <BasiqButton tone="neutral" variant="outline" @click="resetSession"
                      ><AppIcon name="plus" :size="16" />開催を追加</BasiqButton
                    >
                  </div></template
                >
                <div v-if="current?.sessions.length" class="round-list">
                  <button
                    v-for="(session, index) in current.sessions"
                    :key="session.id"
                    type="button"
                    :class="{ selected: sessionEditingId === session.id }"
                    @click="editSession(session)"
                  >
                    <span class="round-number">{{ index + 1 }}</span
                    ><span
                      ><strong>{{ session.name }}</strong
                      ><small
                        >{{ session.date || "日時未定" }} ·
                        {{ session.isReplay ? "再放送" : "通常開催" }}</small
                      ></span
                    ><span
                      :class="['pill', session.status === 'published' ? 'success' : 'draft']"
                      >{{ session.status === "published" ? "公開" : "下書き" }}</span
                    ><AppIcon name="chevron" :size="16" />
                  </button>
                </div>
                <p v-else class="empty-copy">講習会を保存すると開催を追加できます。</p>
              </BasiqCard>

              <form id="session-editor" @submit.prevent="saveSession">
                <BasiqCard class="editor-card">
                  <template #header
                    ><div>
                      <p class="card-kicker">
                        {{ sessionEditingId ? "開催を編集" : "新しい開催" }}
                      </p>
                      <h2>開催内容</h2>
                    </div></template
                  >
                  <div v-if="current" class="form-stack">
                    <BasiqFormField label="開催名" required
                      ><BasiqInput v-model="sessionForm.name" required
                    /></BasiqFormField>
                    <BasiqFormField label="説明"
                      ><BasiqTextarea v-model="sessionForm.description" :rows="4"
                    /></BasiqFormField>
                    <div class="field-grid three">
                      <label class="native-field"
                        ><span>表示順</span
                        ><input v-model.number="sessionForm.order" type="number" min="0"
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
                        ><BasiqInput v-model="sessionForm.location" /></BasiqFormField
                      ><BasiqFormField label="knoQ URL"
                        ><BasiqInput
                          v-model="sessionForm.knoqUrl"
                          type="url"
                          placeholder="https://"
                      /></BasiqFormField>
                    </div>
                    <div class="field-grid">
                      <label class="native-field"
                        ><span>公開状態</span
                        ><select v-model="sessionForm.status">
                          <option value="draft">下書き</option>
                          <option value="published">公開</option>
                        </select></label
                      ><label class="native-field"
                        ><span>講師</span
                        ><select v-model="sessionForm.instructorIds" multiple>
                          <option v-for="user in directory.users" :key="user.id" :value="user.id">
                            {{ user.displayName }}
                          </option>
                        </select></label
                      >
                    </div>
                    <label class="native-field"
                      ><span>再放送元（同じ講習会の通常開催）</span
                      ><select v-model="sessionForm.replayOfSessionIds" multiple>
                        <option
                          v-for="session in current.sessions.filter(
                            (entry) => !entry.isReplay && entry.id !== sessionEditingId,
                          )"
                          :key="session.id"
                          :value="session.id"
                        >
                          {{ session.name }}
                        </option>
                      </select></label
                    >
                    <BasiqFormField label="教材（1行ごとに「タイトル | URL」）"
                      ><BasiqTextarea v-model="sessionForm.resourcesText" :rows="4"
                    /></BasiqFormField>
                  </div>
                  <p v-else class="empty-copy">先に全般タブで講習会を保存してください。</p>
                </BasiqCard>
                <footer v-if="current" class="sticky-actions">
                  <BasiqButton
                    v-if="sessionEditingId"
                    tone="neutral"
                    variant="outline"
                    type="button"
                    @click="resetSession"
                    >新規入力へ戻す</BasiqButton
                  ><BasiqButton type="submit" :disabled="saving">{{
                    saving ? "保存中…" : "開催を保存"
                  }}</BasiqButton>
                </footer>
              </form>
            </section>

            <section v-else-if="item.value === 'flows'" class="tab-panel">
              <BasiqCard class="editor-card">
                <template #header
                  ><div class="card-heading">
                    <div>
                      <p class="card-kicker">講習会</p>
                      <h2>事前・事後Flow</h2>
                    </div>
                    <BasiqButton tone="neutral" variant="outline" @click="router.push('/stock')"
                      >Stockを開く</BasiqButton
                    >
                  </div></template
                >
                <div v-if="current" class="flow-list">
                  <div v-for="flowClass in lectureFlowClasses" :key="flowClass.id" class="flow-row">
                    <span
                      ><strong>{{ flowClass.name }}</strong
                      ><small>{{
                        flowClass.type === "lecture_pre" ? "講習会の事前" : "講習会の事後"
                      }}</small></span
                    ><BasiqButton
                      tone="neutral"
                      variant="outline"
                      @click="startFlow(flowClass.id, current.id)"
                      >{{
                        targetFlows(current.id).some((flow) => flow.flowClassId === flowClass.id)
                          ? "再開"
                          : "開始"
                      }}</BasiqButton
                    >
                  </div>
                </div>
                <p v-else class="empty-copy">講習会を保存するとFlowを適用できます。</p>
              </BasiqCard>
              <BasiqCard v-if="current" class="editor-card"
                ><template #header
                  ><div>
                    <p class="card-kicker">各開催</p>
                    <h2>メインFlow</h2>
                  </div></template
                >
                <div class="session-flow-list">
                  <section v-for="session in current.sessions" :key="session.id">
                    <div>
                      <strong>{{ session.name }}</strong
                      ><small>{{ session.date || "日時未定" }}</small>
                    </div>
                    <div class="flow-buttons">
                      <BasiqButton
                        v-for="flowClass in sessionFlowClasses"
                        :key="flowClass.id"
                        tone="neutral"
                        variant="outline"
                        @click="startFlow(flowClass.id, session.id)"
                        >{{ flowClass.name }}を{{
                          targetFlows(session.id).some((flow) => flow.flowClassId === flowClass.id)
                            ? "再開"
                            : "開始"
                        }}</BasiqButton
                      >
                    </div>
                  </section>
                </div></BasiqCard
              >
            </section>

            <form v-else class="settings-overview" @submit.prevent="saveLecture">
              <header>
                <h2>すべての設定</h2>
                <p>必要な項目を開いて編集します。</p>
              </header>
              <div class="settings-accordion">
                <details open>
                  <summary>
                    <span
                      ><strong>運営と問い合わせ</strong><small>担当グループ・メンバー</small></span
                    >
                  </summary>
                  <div class="accordion-content">
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
                      ><label class="native-field"
                        ><span>運営メンバー</span
                        ><select v-model="form.organizerUserIds" multiple>
                          <option v-for="user in directory.users" :key="user.id" :value="user.id">
                            {{ user.displayName }}
                          </option>
                        </select></label
                      ><label class="native-field"
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
                      ><label class="native-field"
                        ><span>問い合わせメンバー</span
                        ><select v-model="form.contactUserIds" multiple>
                          <option v-for="user in directory.users" :key="user.id" :value="user.id">
                            {{ user.displayName }}
                          </option>
                        </select></label
                      >
                    </div>
                    <BasiqFormField label="traQチャンネルID"
                      ><BasiqInput v-model="form.traqChannelId"
                    /></BasiqFormField>
                  </div>
                </details>
                <details>
                  <summary>
                    <span><strong>資料</strong><small>講習会共通のリンク</small></span>
                  </summary>
                  <div class="accordion-content">
                    <BasiqFormField label="1行ごとに「タイトル | URL」"
                      ><BasiqTextarea
                        v-model="form.resourcesText"
                        :rows="6"
                        placeholder="講義資料 | https://example.com/slides"
                    /></BasiqFormField>
                  </div>
                </details>
                <details>
                  <summary>
                    <span
                      ><strong>関連する講習会</strong
                      ><small>前提・前年度・次におすすめ</small></span
                    >
                  </summary>
                  <div class="accordion-content">
                    <BasiqFormField label="1行ごとに「prerequisite, Lecture ID」"
                      ><BasiqTextarea v-model="form.relationsText" :rows="6"
                    /></BasiqFormField>
                  </div>
                </details>
              </div>
              <footer class="sticky-actions">
                <BasiqButton type="submit" :disabled="saving">{{
                  saving ? "保存中…" : "変更を保存"
                }}</BasiqButton>
              </footer>
            </form>
          </div>
        </template>
      </BasiqTabs>
    </template>
  </div>
</template>

<style scoped>
/* stylelint-disable no-descending-specificity */
.editor-page {
  width: min(1160px, 100%);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 22px;
}

.editor-header h1 {
  font-size: 30px;
  letter-spacing: -0.025em;
}

.editor-header p,
.step-lead,
.empty-copy,
.settings-overview > header p {
  color: var(--basiq-color-content-subtle);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px;
  border-radius: 999px;
  color: #24734a;
  background: #edf7f1;
  font-size: 12px;
  font-weight: 700;
}

.header-status.draft {
  color: var(--basiq-color-content-subtle);
  background: var(--basiq-color-surface-muted);
}

.header-status > span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentcolor;
}

.tab-content {
  min-height: 650px;
  padding-top: 20px;
}

.tab-content > form,
.tab-panel,
.settings-overview {
  width: min(900px, 100%);
  margin: auto;
}

.tab-panel,
.form-stack,
.settings-overview {
  display: grid;
  gap: 16px;
}

.editor-card {
  border: 1px solid var(--basiq-color-border-separator);
}

.editor-card h2 {
  font-size: 18px;
}

.card-kicker {
  margin-bottom: 3px;
  color: var(--basiq-color-content-accent);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.card-heading {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
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
  min-height: 94px;
}

.switch-field {
  display: grid;
  align-content: center;
  gap: 5px;
  padding-top: 20px;
}

.switch-field small {
  color: var(--basiq-color-content-subtle);
}

.sticky-actions {
  position: sticky;
  z-index: 20;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--basiq-color-border-separator);
  background: color-mix(in srgb, var(--basiq-color-surface-base) 96%, transparent);
  backdrop-filter: blur(8px);
}

.round-list,
.flow-list,
.session-flow-list {
  display: grid;
  gap: 9px;
}

.round-list > button,
.flow-row,
.session-flow-list > section {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
  color: inherit;
  background: var(--basiq-color-surface-base);
  text-align: left;
}

.round-list > button {
  cursor: pointer;
}

.round-list > button:hover,
.round-list > button.selected {
  border-color: var(--basiq-color-accent-default);
  background: var(--accent-soft);
}

.round-list > button > span:nth-child(2),
.flow-row > span,
.session-flow-list > section > div:first-child {
  min-width: 0;
  display: grid;
  gap: 2px;
  flex: 1;
}

.round-list small,
.flow-row small,
.session-flow-list small {
  color: var(--basiq-color-content-subtle);
}

.round-number {
  width: 42px;
  height: 34px;
  display: grid;
  place-items: center;
  flex: none;
  border-radius: var(--basiq-radius-sm);
  color: var(--basiq-color-content-accent);
  background: var(--accent-soft);
  font-weight: 700;
}

.flow-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.settings-overview > header {
  display: grid;
  gap: 3px;
}

.settings-accordion {
  display: grid;
  gap: 10px;
}

.settings-accordion details {
  overflow: hidden;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
  background: var(--basiq-color-surface-base);
}

.settings-accordion summary {
  min-height: 62px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  list-style: none;
}

.settings-accordion summary::-webkit-details-marker {
  display: none;
}

.settings-accordion summary::after {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border: 1px solid var(--basiq-color-border-control);
  border-radius: 50%;
  content: "+";
}

.settings-accordion details[open] summary::after {
  content: "−";
}

.settings-accordion summary > span {
  display: grid;
  gap: 2px;
}

.settings-accordion summary small {
  color: var(--basiq-color-content-subtle);
}

.accordion-content {
  display: grid;
  gap: 18px;
  padding: 18px 16px;
  border-top: 1px solid var(--basiq-color-border-separator);
  background: var(--basiq-color-surface-container);
}

@media (width <= 760px) {
  .editor-header {
    gap: 10px;
  }

  .editor-header h1 {
    font-size: 22px;
  }

  .editor-header p {
    display: none;
  }

  .header-actions button {
    display: none;
  }

  .tab-content {
    padding-top: 16px;
  }

  .field-grid,
  .field-grid.three {
    grid-template-columns: 1fr;
  }

  .card-heading {
    align-items: flex-start;
  }

  .round-list > button {
    padding: 9px;
  }

  .flow-row,
  .session-flow-list > section {
    align-items: flex-start;
    flex-direction: column;
  }

  .sticky-actions {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 63px;
    min-height: 58px;
    align-items: center;
    margin: 0;
    padding: 8px 16px;
  }

  .sticky-actions button:last-child {
    flex: 1;
  }
}
</style>
