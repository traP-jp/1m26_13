<script setup lang="ts">
import { BasiqButton } from "basiq-ui";
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
function flowClassName(id: string) {
  return flowClasses.value.find((item) => item.id === id)?.name || "Flow";
}
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
  <div class="page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">LECTURE EDITOR</p>
        <h1>{{ isNew ? "講習会を登録" : "講習会を編集" }}</h1>
        <p>Lectureの共通情報を保存し、開催とFlowを追加します。</p>
      </div>
      <RouterLink
        v-if="current?.isPublished"
        class="button secondary"
        :to="`/lectures/${current.id}`"
        >公開画面を見る</RouterLink
      >
    </header>
    <div v-if="loading" class="loading-state">編集データを読み込んでいます</div>
    <div v-else class="editor-stack">
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      <p v-if="error" class="notice error" role="alert">{{ error }}</p>
      <form class="surface panel" @submit.prevent="saveLecture">
        <div class="form-grid">
          <label class="field full"
            ><span>講習会名 *</span
            ><input v-model="form.name" class="input" required maxlength="200" /></label
          ><label class="field full"
            ><span>説明</span
            ><textarea v-model="form.description" class="textarea"></textarea></label
          ><label class="field"
            ><span>開始学年度 *</span
            ><input
              v-model.number="form.academicYearStart"
              class="input"
              type="number"
              min="2000"
              max="2200"
              required /></label
          ><label class="field"
            ><span>終了学年度 *</span
            ><input
              v-model.number="form.academicYearEnd"
              class="input"
              type="number"
              min="2000"
              max="2200"
              required /></label
          ><label class="field"
            ><span>分野</span
            ><select v-model="form.fieldId" class="select">
              <option value="">未指定</option>
              <option v-for="field in fields" :key="field.id" :value="field.id">
                {{ field.name }}
              </option>
            </select></label
          ><label class="checkbox"
            ><input v-model="form.isIntroductory" type="checkbox" />その分野の0→1講習</label
          ><label class="field full"
            ><span>対象者</span
            ><textarea v-model="form.targetAudience" class="textarea"></textarea></label
          ><label class="field"
            ><span>運営グループ</span
            ><select v-model="form.organizerGroupIds" class="select" multiple>
              <option v-for="group in directory.groups" :key="group.id" :value="group.id">
                {{ group.name }}
              </option>
            </select></label
          ><label class="field"
            ><span>運営メンバー</span
            ><select v-model="form.organizerUserIds" class="select" multiple>
              <option v-for="user in directory.users" :key="user.id" :value="user.id">
                {{ user.displayName }} (@{{ user.traqId }})
              </option>
            </select></label
          ><label class="field"
            ><span>問い合わせグループ</span
            ><select v-model="form.contactGroupIds" class="select" multiple>
              <option v-for="group in directory.groups" :key="group.id" :value="group.id">
                {{ group.name }}
              </option>
            </select></label
          ><label class="field"
            ><span>問い合わせメンバー</span
            ><select v-model="form.contactUserIds" class="select" multiple>
              <option v-for="user in directory.users" :key="user.id" :value="user.id">
                {{ user.displayName }}
              </option>
            </select></label
          ><label class="field full"
            ><span>traQチャンネルID</span
            ><input v-model="form.traqChannelId" class="input" /></label
          ><label class="field full"
            ><span>資料（1行ごとに「タイトル | https://...」）</span
            ><textarea
              v-model="form.resourcesText"
              class="textarea"
              placeholder="講義資料 | https://example.com/slides"
            ></textarea></label
          ><label class="field full"
            ><span>講習会の関係（1行ごとに「prerequisite, Lecture ID」）</span
            ><textarea v-model="form.relationsText" class="textarea"></textarea></label
          ><label v-if="isNew" class="field full"
            ><span>保存後に始める事前Flow</span
            ><select v-model="selectedFlowClassId" class="select">
              <option value="">Flowを使わず保存</option>
              <option v-for="flowClass in preFlowClasses" :key="flowClass.id" :value="flowClass.id">
                {{ flowClass.name }}
              </option>
            </select></label
          >
        </div>
        <div class="form-actions">
          <BasiqButton type="submit" :disabled="saving">{{
            saving ? "保存中…" : isNew ? "Lectureを作成" : "変更を保存"
          }}</BasiqButton>
        </div>
      </form>
      <template v-if="current"
        ><section class="surface panel">
          <div class="section-heading">
            <h2>開催</h2>
            <button class="button secondary" type="button" @click="resetSession">新しい開催</button>
          </div>
          <div v-if="current.sessions.length" class="editor-list">
            <div v-for="session in current.sessions" :key="session.id" class="editor-row">
              <button class="editor-main-action" type="button" @click="editSession(session)">
                <strong>{{ session.name }}</strong>
                <p>
                  {{ session.date || "日時未定" }} · {{ session.isReplay ? "再放送" : "通常開催" }}
                </p></button
              ><span :class="['pill', session.status === 'published' ? 'success' : 'draft']">{{
                session.status === "published" ? "公開" : "下書き"
              }}</span>
            </div>
          </div>
          <p v-else>開催はまだありません。</p>
        </section>
        <form id="session-editor" class="surface panel" @submit.prevent="saveSession">
          <h2>{{ sessionEditingId ? "開催を編集" : "開催を追加" }}</h2>
          <div class="form-grid">
            <label class="field full"
              ><span>開催名 *</span
              ><input v-model="sessionForm.name" class="input" required /></label
            ><label class="field full"
              ><span>説明</span
              ><textarea v-model="sessionForm.description" class="textarea"></textarea></label
            ><label class="field"
              ><span>表示順</span
              ><input
                v-model.number="sessionForm.order"
                class="input"
                type="number"
                min="0" /></label
            ><label class="field"
              ><span>公開状態</span
              ><select v-model="sessionForm.status" class="select">
                <option value="draft">下書き</option>
                <option value="published">公開</option>
              </select></label
            ><label class="field"
              ><span>日付</span
              ><input v-model="sessionForm.date" class="input" type="date" /></label
            ><label class="field"
              ><span>開始時刻</span
              ><input
                v-model="sessionForm.startTime"
                class="input"
                type="time"
                :disabled="!sessionForm.date" /></label
            ><label class="field full"
              ><span>場所</span><input v-model="sessionForm.location" class="input" /></label
            ><label class="field full"
              ><span>knoQ URL</span
              ><input v-model="sessionForm.knoqUrl" class="input" type="url" /></label
            ><label class="field"
              ><span>講師</span
              ><select v-model="sessionForm.instructorIds" class="select" multiple>
                <option v-for="user in directory.users" :key="user.id" :value="user.id">
                  {{ user.displayName }}
                </option>
              </select></label
            ><label class="field"
              ><span>再放送元（同じLectureの通常開催）</span
              ><select v-model="sessionForm.replayOfSessionIds" class="select" multiple>
                <option
                  v-for="session in current.sessions.filter(
                    (item) => !item.isReplay && item.id !== sessionEditingId,
                  )"
                  :key="session.id"
                  :value="session.id"
                >
                  {{ session.name }}
                </option>
              </select></label
            ><label class="field full"
              ><span>教材（1行ごとに「タイトル | URL」）</span
              ><textarea v-model="sessionForm.resourcesText" class="textarea"></textarea>
            </label>
          </div>
          <div class="form-actions">
            <button
              v-if="sessionEditingId"
              class="button secondary"
              type="button"
              @click="resetSession"
            >
              新規入力へ戻す</button
            ><BasiqButton type="submit" :disabled="saving">{{
              saving ? "保存中…" : "開催を保存"
            }}</BasiqButton>
          </div>
        </form>
        <section class="surface panel">
          <div class="section-heading">
            <h2>講習会の事前・事後Flow</h2>
            <RouterLink to="/stock">Stockを開く</RouterLink>
          </div>
          <div class="editor-list">
            <div v-for="flowClass in lectureFlowClasses" :key="flowClass.id" class="editor-row">
              <span
                ><strong>{{ flowClass.name }}</strong>
                <p>{{ flowClass.type === "lecture_pre" ? "事前" : "事後" }}</p></span
              ><button
                class="button secondary"
                type="button"
                @click="startFlow(flowClass.id, current.id)"
              >
                {{
                  targetFlows(current.id).some((flow) => flow.flowClassId === flowClass.id)
                    ? "再開"
                    : "開始"
                }}
              </button>
            </div>
          </div>
          <div v-if="targetFlows(current.id).length" class="applied-flow-list">
            <RouterLink
              v-for="flow in targetFlows(current.id)"
              :key="flow.id"
              :to="`/flows/${flow.id}`"
              >{{ flowClassName(flow.flowClassId) }} · {{ flow.status }}</RouterLink
            >
          </div>
        </section>
        <section class="surface panel">
          <h2>各開催のメインFlow</h2>
          <div v-for="session in current.sessions" :key="session.id" class="session-flow-group">
            <strong>{{ session.name }}</strong>
            <div class="inline-actions">
              <button
                v-for="flowClass in sessionFlowClasses"
                :key="flowClass.id"
                class="button secondary compact"
                type="button"
                @click="startFlow(flowClass.id, session.id)"
              >
                {{ flowClass.name }}を{{
                  targetFlows(session.id).some((flow) => flow.flowClassId === flowClass.id)
                    ? "再開"
                    : "開始"
                }}
              </button>
            </div>
            <div class="applied-flow-list">
              <RouterLink
                v-for="flow in targetFlows(session.id)"
                :key="flow.id"
                :to="`/flows/${flow.id}`"
                >{{ flowClassName(flow.flowClassId) }} · {{ flow.status }}</RouterLink
              >
            </div>
          </div>
        </section></template
      >
    </div>
  </div>
</template>
