<script setup lang="ts">
import { BasiqButton, BasiqCard, BasiqCheckbox, BasiqFormField, BasiqTextarea } from "basiq-ui";
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
  <div class="page flow-runner-page">
    <div v-if="loading" class="loading-state">Flowを読み込んでいます</div>
    <div v-else-if="error && !flow" class="error-state">{{ error }}</div>
    <template v-else-if="flow && page">
      <div class="breadcrumb">
        <RouterLink :to="lecture ? `/admin/lectures/${lecture.id}` : '/admin'"
          >講習会を編集</RouterLink
        ><b>/</b><span>Flow</span>
      </div>
      <header class="runner-header">
        <div>
          <p class="eyebrow">FLOW · {{ pageIndex + 1 }}/{{ pages.length }}</p>
          <h1>{{ page.title }}</h1>
          <p>
            {{
              flow.type === "lecture_pre"
                ? "講習会の事前"
                : flow.type === "lecture_post"
                  ? "講習会の事後"
                  : "各開催のメイン"
            }}
          </p>
        </div>
        <span v-if="isCompleted" class="pill success">完了済み</span>
      </header>
      <ol
        class="flow-progress"
        :style="{ gridTemplateColumns: `repeat(${pages.length}, minmax(0, 1fr))` }"
        aria-label="Flowの進捗"
      >
        <li
          v-for="(entry, index) in pages"
          :key="entry.title"
          :class="{ current: index === pageIndex, complete: index < pageIndex || isCompleted }"
        >
          <span>{{ index < pageIndex || isCompleted ? "✓" : index + 1 }}</span
          ><small>{{ entry.title }}</small>
        </li>
      </ol>
      <p v-if="notice" class="notice">{{ notice }}</p>
      <p v-if="error" class="notice error">{{ error }}</p>
      <BasiqCard class="flow-card">
        <div class="flow-content">
          <template v-for="(node, index) in page.nodes" :key="index">
            <p v-if="node.kind === 'paragraph'" class="prose">
              {{ expandValues(node.text, answers) }}
            </p>
            <BasiqFormField
              v-else-if="node.kind === 'input'"
              :label="labels[node.key || ''] || node.key"
              ><BasiqTextarea v-model="answers[node.key || '']" :rows="4" :disabled="isCompleted"
            /></BasiqFormField>
            <label v-else-if="node.kind === 'task'" class="flow-task"
              ><BasiqCheckbox v-model="tasks[node.key || '']" :disabled="isCompleted" /><span>{{
                expandValues(node.text, answers)
              }}</span></label
            >
            <div v-else-if="node.kind === 'copy'" class="copy-panel">
              <pre>{{ expandValues(node.text, answers) }}</pre>
              <BasiqButton tone="neutral" variant="outline" type="button" @click="copy(node.text)"
                >コピー</BasiqButton
              >
            </div>
            <pre v-else-if="node.kind === 'code'" class="copy-panel">{{ node.text }}</pre>
          </template>
        </div>
      </BasiqCard>
      <footer class="runner-actions">
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
      </footer>
    </template>
  </div>
</template>

<style scoped>
.flow-runner-page {
  width: min(820px, 100%);
}

.runner-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 22px;
}

.runner-header h1 {
  font-size: 30px;
  letter-spacing: -0.025em;
}

.runner-header p:last-child {
  margin-top: 5px;
  color: var(--basiq-color-content-subtle);
}

.flow-progress {
  display: grid;
  margin: 0 0 22px;
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
  content: "";
  background: var(--basiq-color-border-separator);
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

.flow-progress li.current,
.flow-progress li.complete {
  color: var(--basiq-color-content-accent);
}

.flow-progress li.current > span {
  border-color: var(--basiq-color-accent-default);
  color: var(--basiq-color-content-on-accent);
  background: var(--basiq-color-accent-default);
}

.flow-progress li.complete > span {
  border-color: #24734a;
  color: #24734a;
  background: #edf7f1;
}

.flow-progress li.current::before,
.flow-progress li.complete::before {
  background: color-mix(in srgb, var(--basiq-color-accent-default) 44%, white);
}

.flow-progress small {
  max-width: 130px;
  overflow: hidden;
  font-size: 9px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice {
  margin-bottom: 12px;
}

.flow-card {
  border: 1px solid var(--basiq-color-border-separator);
}

.flow-content {
  min-height: 300px;
  display: grid;
  align-content: start;
  gap: 18px;
}

.flow-task {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 13px;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
  background: var(--basiq-color-surface-muted);
}

.copy-panel {
  display: grid;
  gap: 10px;
  padding: 15px;
  border-radius: var(--basiq-radius-sm);
  background: var(--basiq-color-surface-muted);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
  white-space: pre-wrap;
}

.copy-panel button {
  justify-self: end;
}

.runner-actions {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--basiq-color-border-separator);
  background: color-mix(in srgb, var(--basiq-color-surface-base) 96%, transparent);
  backdrop-filter: blur(8px);
}

.runner-actions button:last-child {
  margin-left: auto;
}

@media (width <= 760px) {
  .runner-header h1 {
    font-size: 22px;
  }

  .flow-progress small {
    max-width: 64px;
  }

  .runner-actions {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 63px;
    min-height: 58px;
    align-items: center;
    padding: 8px 16px;
  }

  .runner-actions button:last-child {
    flex: 1;
  }
}
</style>
