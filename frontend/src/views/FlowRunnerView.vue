<script setup lang="ts">
import { BasiqButton } from "basiq-ui";
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  getFlow,
  getLecture,
  getSession,
  updateFlow,
  updateLecture,
  updateSession,
  type Flow,
  type Lecture,
  type Session,
} from "@/api/resources";
import { expandValues, parseFlow } from "@/lib/flowParser";
const route = useRoute();
const router = useRouter();
const flow = ref<Flow>();
const lecture = ref<Lecture>();
const session = ref<Session>();
const answers = reactive<Record<string, string>>({});
const tasks = reactive<Record<string, boolean>>({});
const pageIndex = ref(0);
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const notice = ref("");
const pages = computed(() => (flow.value ? parseFlow(flow.value.text) : []));
const page = computed(() => pages.value[pageIndex.value]);
const isCompleted = computed(() => flow.value?.status === "completed");
const labels: Record<string, string> = {
  "lecture.name": "講習会名",
  "lecture.description": "講習会の説明",
  "lecture.targetAudience": "対象者",
  "session.name": "開催名",
  "session.description": "開催の説明",
  "session.date": "開催日",
  "session.startTime": "開始時刻",
  "session.location": "場所",
};
function targetAnswers() {
  if (lecture.value)
    Object.assign(answers, {
      "lecture.name": lecture.value.name,
      "lecture.description": lecture.value.description || "",
      "lecture.targetAudience": lecture.value.targetAudience || "",
    });
  if (session.value)
    Object.assign(answers, {
      "session.name": session.value.name,
      "session.description": session.value.description || "",
      "session.date": session.value.date || "",
      "session.startTime": session.value.startTime || "",
      "session.location": session.value.location || "",
      "lecture.name": lecture.value?.name || "",
    });
}
async function load() {
  loading.value = true;
  try {
    flow.value = await getFlow(String(route.params.id));
    Object.assign(answers, flow.value.answers);
    Object.assign(tasks, flow.value.tasks);
    pageIndex.value = flow.value.currentPage;
    if (flow.value.type === "session_main") {
      session.value = await getSession(flow.value.targetId, true);
      lecture.value = await getLecture(session.value.lectureId, true);
    } else lecture.value = await getLecture(flow.value.targetId, true);
    targetAnswers();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "読み込めませんでした";
  } finally {
    loading.value = false;
  }
}
async function saveTarget() {
  if (lecture.value) {
    const updated = await updateLecture(lecture.value.id, {
      name: answers["lecture.name"] || lecture.value.name,
      description: answers["lecture.description"] || undefined,
      academicYearStart: lecture.value.academicYearStart,
      academicYearEnd: lecture.value.academicYearEnd,
      fieldId: lecture.value.fieldId,
      organizerGroupIds: lecture.value.organizerGroupIds,
      organizerUserIds: lecture.value.organizerUserIds,
      contactGroupIds: lecture.value.contactGroupIds,
      contactUserIds: lecture.value.contactUserIds,
      targetAudience: answers["lecture.targetAudience"] || undefined,
      isIntroductory: lecture.value.isIntroductory,
      traqChannelId: lecture.value.traqChannelId,
      resources: lecture.value.resources,
      relations: lecture.value.relations,
      expectedRevision: lecture.value.revision,
    });
    lecture.value = updated;
  }
  if (session.value) {
    session.value = await updateSession(session.value.id, {
      name: answers["session.name"] || session.value.name,
      description: answers["session.description"] || undefined,
      order: session.value.order,
      date: answers["session.date"] || undefined,
      startTime: answers["session.startTime"] || undefined,
      location: answers["session.location"] || undefined,
      knoqUrl: session.value.knoqUrl,
      instructorIds: session.value.instructorIds,
      resources: session.value.resources,
      replayOfSessionIds: session.value.replayOfSessionIds,
      status: session.value.status,
      expectedRevision: session.value.revision,
    });
  }
}
async function persist(status: Flow["status"] = "active") {
  if (!flow.value) return;
  saving.value = true;
  error.value = "";
  try {
    await saveTarget();
    const ownAnswers = Object.fromEntries(
      Object.entries(answers).filter(([key]) => key.startsWith("answer.")),
    );
    flow.value = await updateFlow(flow.value.id, {
      answers: ownAnswers,
      tasks: { ...tasks },
      currentPage: pageIndex.value,
      status,
      expectedRevision: flow.value.revision,
    });
    notice.value = "進捗を保存しました。";
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "保存できませんでした";
    throw reason;
  } finally {
    saving.value = false;
  }
}
async function next() {
  if (pageIndex.value < pages.value.length - 1) pageIndex.value++;
  if (!isCompleted.value) await persist();
}
async function previous() {
  if (pageIndex.value > 0) pageIndex.value--;
  if (!isCompleted.value) await persist();
}
async function complete() {
  await persist("completed");
  if (lecture.value) await router.push(`/admin/lectures/${lecture.value.id}`);
}
async function copy(value: string) {
  await navigator.clipboard.writeText(expandValues(value, answers));
  notice.value = "文章をコピーしました。";
}
onMounted(load);
</script>
<template>
  <div class="page narrow">
    <div v-if="loading" class="loading-state">Flowを読み込んでいます</div>
    <div v-else-if="error && !flow" class="error-state">{{ error }}</div>
    <template v-else-if="flow && page"
      ><header class="page-heading">
        <div>
          <p class="eyebrow">FLOW · {{ pageIndex + 1 }}/{{ pages.length }}</p>
          <h1>{{ page.title }}</h1>
          <p>{{ flow.type }} · 適用時の本文を実行しています</p>
        </div>
        <span v-if="isCompleted" class="pill success">完了済み</span>
      </header>
      <p v-if="notice" class="notice">{{ notice }}</p>
      <p v-if="error" class="notice error">{{ error }}</p>
      <section class="surface flow-page">
        <div class="flow-content">
          <template v-for="(node, index) in page.nodes" :key="index"
            ><p v-if="node.kind === 'paragraph'" class="prose">
              {{ expandValues(node.text, answers) }}
            </p>
            <label v-else-if="node.kind === 'input'" class="field"
              ><span>{{ labels[node.key || ""] || node.key }}</span
              ><textarea
                v-model="answers[node.key || '']"
                class="textarea"
                :disabled="isCompleted"
              ></textarea></label
            ><label v-else-if="node.kind === 'task'" class="flow-task"
              ><input
                v-model="tasks[node.key || '']"
                type="checkbox"
                :disabled="isCompleted"
              /><span>{{ expandValues(node.text, answers) }}</span></label
            >
            <div v-else-if="node.kind === 'copy'" class="copy-block">
              <pre>{{ expandValues(node.text, answers) }}</pre>
              <button class="button secondary" type="button" @click="copy(node.text)">
                コピー
              </button>
            </div>
            <pre v-else-if="node.kind === 'code'" class="copy-block">{{ node.text }}</pre>
          </template>
        </div>
        <div class="form-actions">
          <BasiqButton
            v-if="pageIndex > 0"
            variant="outline"
            tone="neutral"
            :disabled="saving"
            @click="previous"
            >前へ</BasiqButton
          ><BasiqButton v-if="pageIndex < pages.length - 1" :disabled="saving" @click="next">{{
            isCompleted ? "次へ" : "保存して次へ"
          }}</BasiqButton
          ><BasiqButton v-else :disabled="saving || isCompleted" @click="complete">{{
            isCompleted ? "完了済み" : "Flowを完了"
          }}</BasiqButton>
        </div>
      </section></template
    >
  </div>
</template>
