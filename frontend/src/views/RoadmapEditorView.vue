<script setup lang="ts">
import {
  BasiqButton,
  BasiqCard,
  BasiqFormField,
  BasiqInput,
  BasiqSwitch,
  BasiqTextarea,
} from "basiq-ui";
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  createRoadmap,
  getRoadmap,
  listLectures,
  updateRoadmap,
  type Lecture,
  type Roadmap,
  type RoadmapWrite,
} from "@/api/resources";
import AppIcon from "@/components/AppIcon.vue";

type Stage = RoadmapWrite["stages"][number];
const route = useRoute();
const router = useRouter();
const roadmapId = computed(() => (route.params.id ? String(route.params.id) : ""));
const isNew = computed(() => !roadmapId.value);
const lectures = ref<Lecture[]>([]);
const current = ref<Roadmap>();
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const notice = ref("");
const form = reactive({
  title: "",
  description: "",
  audience: "",
  published: false,
  stages: [] as Stage[],
});

function newStage(): Stage {
  return { id: crypto.randomUUID(), title: "", description: "", items: [] };
}
function fill(roadmap: Roadmap) {
  current.value = roadmap;
  Object.assign(form, {
    title: roadmap.title,
    description: roadmap.description,
    audience: roadmap.audience,
    published: roadmap.published,
    stages: structuredClone(roadmap.stages),
  });
}
function addStage() {
  form.stages.push(newStage());
}
function removeStage(index: number) {
  form.stages.splice(index, 1);
}
function moveStage(index: number, offset: number) {
  const destination = index + offset;
  if (destination < 0 || destination >= form.stages.length) return;
  const [stage] = form.stages.splice(index, 1);
  if (stage) form.stages.splice(destination, 0, stage);
}
function addItem(stage: Stage) {
  stage.items.push({ lectureId: "", note: "" });
}
function removeItem(stage: Stage, index: number) {
  stage.items.splice(index, 1);
}
function moveItem(stage: Stage, index: number, offset: number) {
  const destination = index + offset;
  if (destination < 0 || destination >= stage.items.length) return;
  const [item] = stage.items.splice(index, 1);
  if (item) stage.items.splice(destination, 0, item);
}
function lectureOptions(selectedId: string) {
  const used = new Set(form.stages.flatMap((stage) => stage.items.map((item) => item.lectureId)));
  return lectures.value.filter((lecture) => lecture.id === selectedId || !used.has(lecture.id));
}
function lectureName(id: string) {
  return lectures.value.find((lecture) => lecture.id === id)?.name ?? "講習会を選択";
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    lectures.value = await listLectures({ includeDraft: true });
    if (isNew.value) addStage();
    else fill(await getRoadmap(roadmapId.value, true));
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "読み込めませんでした";
  } finally {
    loading.value = false;
  }
}
async function save() {
  saving.value = true;
  error.value = "";
  notice.value = "";
  try {
    const body: RoadmapWrite = {
      title: form.title,
      description: form.description,
      audience: form.audience,
      published: form.published,
      stages: structuredClone(form.stages),
      expectedRevision: current.value?.revision ?? 0,
    };
    const saved = isNew.value
      ? await createRoadmap(body)
      : await updateRoadmap(roadmapId.value, body);
    if (isNew.value) await router.replace(`/admin/roadmaps/${saved.id}`);
    fill(saved);
    notice.value = "ロードマップを保存しました。";
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "保存できませんでした";
  } finally {
    saving.value = false;
  }
}
onMounted(load);
</script>

<template>
  <div class="page roadmap-editor-page">
    <nav class="breadcrumb" aria-label="パンくずリスト">
      <RouterLink to="/admin">運営向けページ</RouterLink><AppIcon name="chevron" :size="14" />
      <span>ロードマップ管理</span><AppIcon name="chevron" :size="14" /><span>{{
        isNew ? "新規作成" : "編集"
      }}</span>
    </nav>
    <header class="editor-heading">
      <h1>{{ isNew ? "ロードマップを作成" : "ロードマップを編集" }}</h1>
      <p>ロードマップの内容と講習会の順番を編集します。</p>
    </header>

    <div v-if="loading" class="loading-state">編集データを読み込んでいます</div>
    <form v-else class="editor-form" @submit.prevent="save">
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      <p v-if="error" class="notice error" role="alert">{{ error }}</p>

      <BasiqCard title="基本情報">
        <div class="basic-grid">
          <BasiqFormField class="span-two" label="ロードマップ名" required
            ><BasiqInput v-model="form.title" required maxlength="200"
          /></BasiqFormField>
          <BasiqFormField class="span-two" label="概要" required
            ><BasiqTextarea v-model="form.description" :rows="3" resize="vertical"
          /></BasiqFormField>
          <BasiqFormField label="対象者" required
            ><BasiqInput v-model="form.audience" placeholder="例：Web開発を始めたい新入生"
          /></BasiqFormField>
          <div class="publication-field">
            <strong>公開状態</strong
            ><BasiqSwitch v-model="form.published"
              ><span>{{ form.published ? "公開中" : "下書き" }}</span></BasiqSwitch
            >
          </div>
        </div>
      </BasiqCard>

      <section class="sequence-section" aria-labelledby="sequence-title">
        <div class="sequence-heading">
          <div>
            <h2 id="sequence-title">学ぶ順番</h2>
            <p>段階ごとに講習会を上から順に並べます。</p>
          </div>
          <BasiqButton type="button" tone="neutral" variant="outline" @click="addStage"
            ><AppIcon name="plus" :size="18" />段階を追加</BasiqButton
          >
        </div>

        <div class="stage-list">
          <BasiqCard v-for="(stage, stageIndex) in form.stages" :key="stage.id" class="stage-card">
            <template #header>
              <div class="stage-heading">
                <span class="stage-number">{{ stageIndex + 1 }}</span>
                <strong>段階 {{ stageIndex + 1 }}</strong>
                <div class="stage-actions">
                  <BasiqButton
                    type="button"
                    tone="neutral"
                    variant="outline"
                    :disabled="stageIndex === 0"
                    @click="moveStage(stageIndex, -1)"
                    >上へ</BasiqButton
                  >
                  <BasiqButton
                    type="button"
                    tone="neutral"
                    variant="outline"
                    :disabled="stageIndex === form.stages.length - 1"
                    @click="moveStage(stageIndex, 1)"
                    >下へ</BasiqButton
                  >
                  <BasiqButton
                    type="button"
                    tone="danger"
                    variant="outline"
                    @click="removeStage(stageIndex)"
                    >外す</BasiqButton
                  >
                </div>
              </div>
            </template>
            <div class="stage-fields">
              <BasiqFormField label="段階名" required
                ><BasiqInput v-model="stage.title" required placeholder="例：最初の一歩"
              /></BasiqFormField>
              <BasiqFormField label="説明"
                ><BasiqInput v-model="stage.description" placeholder="この段階で身につけること"
              /></BasiqFormField>
            </div>

            <ol class="workshop-sequence">
              <li v-for="(item, itemIndex) in stage.items" :key="`${stage.id}-${itemIndex}`">
                <div class="sequence-item">
                  <AppIcon name="grip" :size="22" />
                  <span class="sequence-number">{{ itemIndex + 1 }}</span>
                  <AppIcon name="map" />
                  <span class="workshop-copy"
                    ><strong>{{ lectureName(item.lectureId) }}</strong
                    ><small>{{ item.note || "講習会" }}</small></span
                  >
                  <div class="sequence-inputs">
                    <select v-model="item.lectureId" required aria-label="講習会を選択">
                      <option value="">講習会を選択</option>
                      <option
                        v-for="lecture in lectureOptions(item.lectureId)"
                        :key="lecture.id"
                        :value="lecture.id"
                      >
                        {{ lecture.name }}{{ lecture.isPublished ? "" : "（未公開）" }}
                      </option>
                    </select>
                    <BasiqInput
                      v-model="item.note"
                      aria-label="補足"
                      placeholder="補足"
                      maxlength="2000"
                    />
                  </div>
                  <div class="sequence-actions">
                    <BasiqButton
                      type="button"
                      tone="neutral"
                      variant="outline"
                      :disabled="itemIndex === 0"
                      @click="moveItem(stage, itemIndex, -1)"
                      >↑</BasiqButton
                    >
                    <BasiqButton
                      type="button"
                      tone="neutral"
                      variant="outline"
                      :disabled="itemIndex === stage.items.length - 1"
                      @click="moveItem(stage, itemIndex, 1)"
                      >↓</BasiqButton
                    >
                    <BasiqButton
                      type="button"
                      tone="danger"
                      variant="outline"
                      @click="removeItem(stage, itemIndex)"
                      >外す</BasiqButton
                    >
                  </div>
                </div>
              </li>
            </ol>
            <template #footer
              ><BasiqButton type="button" tone="neutral" variant="outline" @click="addItem(stage)"
                ><AppIcon name="plus" :size="18" />講習会を追加</BasiqButton
              ></template
            >
          </BasiqCard>
        </div>
      </section>

      <div class="action-bar">
        <BasiqButton type="button" tone="neutral" variant="outline" @click="router.push('/admin')"
          >キャンセル</BasiqButton
        >
        <BasiqButton type="submit" :disabled="saving">{{
          saving ? "保存中…" : isNew ? "作成して保存" : "変更を保存"
        }}</BasiqButton>
      </div>
    </form>
  </div>
</template>

<style scoped>
.roadmap-editor-page {
  width: min(1060px, 100%);
  padding-top: 28px;
}

.editor-heading {
  margin-bottom: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.editor-heading h1 {
  font-size: clamp(1.7rem, 3vw, 2rem);
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.editor-heading p {
  margin-top: 6px;
  color: var(--basiq-color-content-subtle);
}

.editor-form {
  display: grid;
  gap: 24px;
}

.basic-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.65fr);
  gap: 16px 22px;
}

.span-two {
  grid-column: 1 / -1;
}

.publication-field {
  min-height: 90px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 13px 15px;
  border-radius: var(--basiq-radius-sm);
  background: var(--basiq-color-surface-base);
}

.sequence-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 18px;
  margin-bottom: 12px;
}

.sequence-heading h2 {
  font-size: 1.25rem;
}

.sequence-heading p {
  margin-top: 3px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.84rem;
}

.sequence-heading button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.stage-list {
  display: grid;
  gap: 14px;
}

.stage-card {
  border: 1px solid var(--basiq-color-border-separator);
}

.stage-heading {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stage-number,
.sequence-number {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 50%;
  color: var(--basiq-color-content-on-accent);
  background: var(--basiq-color-accent-default);
  font-weight: 800;
}

.stage-number {
  width: 34px;
  height: 34px;
}

.stage-actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.stage-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.workshop-sequence {
  display: grid;
  gap: 10px;
  margin-top: 18px;
  list-style: none;
}

.workshop-sequence li {
  padding: 12px;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
  background: var(--basiq-color-surface-base);
}

.sequence-item {
  min-width: 0;
  display: grid;
  grid-template-columns: 24px 32px 20px minmax(120px, 0.7fr) minmax(220px, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.sequence-item > :deep(.app-icon) {
  color: var(--basiq-color-content-accent);
}

.sequence-number {
  width: 32px;
  height: 32px;
}

.workshop-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.workshop-copy strong,
.workshop-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workshop-copy strong {
  font-size: 0.9rem;
}

.workshop-copy small {
  color: var(--basiq-color-content-subtle);
  font-size: 0.7rem;
}

.sequence-inputs {
  min-width: 0;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 6px;
}

.sequence-inputs select {
  min-width: 0;
  height: 40px;
  padding: 0 10px;
  border: var(--basiq-border-width-strong) solid var(--basiq-color-text-control-border);
  border-radius: var(--basiq-radius-sm);
  background: var(--basiq-color-text-control-background);
}

.sequence-actions {
  display: flex;
  gap: 6px;
}

.sequence-actions button {
  min-width: 40px;
  padding-inline: 9px;
}

.action-bar {
  position: sticky;
  z-index: 10;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 13px 0;
  border-top: 1px solid var(--basiq-color-border-separator);
  background: color-mix(in srgb, var(--basiq-color-surface-base) 94%, transparent);
  backdrop-filter: blur(8px);
}

@media (width <= 900px) {
  .sequence-item {
    grid-template-columns: 24px 32px minmax(0, 1fr) auto;
  }

  .sequence-item > :deep(.app-icon:nth-of-type(2)) {
    display: none;
  }

  .sequence-inputs {
    grid-column: 3 / -1;
    width: 100%;
  }
}

@media (width <= 760px) {
  .roadmap-editor-page {
    padding-top: 18px;
    padding-bottom: 112px;
  }

  .breadcrumb a:first-child,
  .breadcrumb a:first-child + :deep(.app-icon) {
    display: none;
  }

  .editor-heading {
    margin-bottom: 16px;
    padding-bottom: 14px;
  }

  .editor-heading h1 {
    font-size: 1.65rem;
  }

  .basic-grid,
  .stage-fields {
    grid-template-columns: 1fr;
  }

  .span-two {
    grid-column: auto;
  }

  .publication-field {
    min-height: 78px;
  }

  .sequence-heading {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .sequence-heading button {
    margin-left: auto;
  }

  .stage-heading {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .stage-actions {
    width: 100%;
  }

  .stage-actions button {
    flex: 1;
  }

  .sequence-item {
    grid-template-columns: 24px 32px minmax(0, 1fr);
    align-items: start;
  }

  .sequence-item > :deep(.app-icon:nth-of-type(2)) {
    display: none;
  }

  .sequence-inputs {
    grid-column: 3;
    grid-template-columns: 1fr;
  }

  .sequence-actions {
    grid-column: 3;
  }

  .action-bar {
    position: fixed;
    inset: auto 0 64px;
    padding: 10px 16px;
  }

  .action-bar button:last-child {
    flex: 1;
  }
}
</style>
