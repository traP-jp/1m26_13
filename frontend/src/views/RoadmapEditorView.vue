<script setup lang="ts">
import { BasiqButton } from "basiq-ui";
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
  <div class="page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">ROADMAP EDITOR</p>
        <h1>{{ isNew ? "ロードマップを作成" : "ロードマップを編集" }}</h1>
        <p>段階と講習会を上から順に並べ、一本の学習経路を作ります。</p>
      </div>
      <RouterLink v-if="current?.published" class="button secondary" :to="`/roadmaps/${current.id}`"
        >公開画面を見る</RouterLink
      >
    </header>
    <div v-if="loading" class="loading-state">編集データを読み込んでいます</div>
    <form v-else class="editor-stack" @submit.prevent="save">
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      <p v-if="error" class="notice error" role="alert">{{ error }}</p>
      <section class="surface panel">
        <div class="form-grid">
          <label class="field full"
            ><span>タイトル *</span
            ><input v-model="form.title" class="input" required maxlength="200"
          /></label>
          <label class="field full"
            ><span>説明</span><textarea v-model="form.description" class="textarea"></textarea>
          </label>
          <label class="field full"
            ><span>対象者</span><textarea v-model="form.audience" class="textarea"></textarea>
          </label>
          <label class="checkbox"><input v-model="form.published" type="checkbox" />公開する</label>
        </div>
      </section>
      <section class="editor-stack" aria-labelledby="stages-heading">
        <div class="section-heading">
          <div>
            <h2 id="stages-heading">一本道の段階</h2>
            <p>公開時は、各段階に公開済みの講習会が必要です。</p>
          </div>
          <button class="button secondary" type="button" @click="addStage">段階を追加</button>
        </div>
        <article
          v-for="(stage, stageIndex) in form.stages"
          :key="stage.id"
          class="surface panel roadmap-stage-editor"
        >
          <div class="section-heading compact">
            <h2>段階 {{ stageIndex + 1 }}</h2>
            <div class="inline-actions">
              <button
                class="button secondary compact"
                type="button"
                :disabled="stageIndex === 0"
                @click="moveStage(stageIndex, -1)"
              >
                上へ
              </button>
              <button
                class="button secondary compact"
                type="button"
                :disabled="stageIndex === form.stages.length - 1"
                @click="moveStage(stageIndex, 1)"
              >
                下へ
              </button>
              <button class="button danger compact" type="button" @click="removeStage(stageIndex)">
                段階を外す
              </button>
            </div>
          </div>
          <div class="form-grid">
            <label class="field"
              ><span>段階名 *</span><input v-model="stage.title" class="input" required
            /></label>
            <label class="field"
              ><span>説明</span><input v-model="stage.description" class="input"
            /></label>
          </div>
          <div class="roadmap-item-editors">
            <div
              v-for="(item, itemIndex) in stage.items"
              :key="`${stage.id}-${itemIndex}`"
              class="roadmap-item-editor"
            >
              <label class="field"
                ><span>講習会 *</span
                ><select v-model="item.lectureId" class="select" required>
                  <option value="">選択してください</option>
                  <option
                    v-for="lecture in lectureOptions(item.lectureId)"
                    :key="lecture.id"
                    :value="lecture.id"
                  >
                    {{ lecture.name }}{{ lecture.isPublished ? "" : "（未公開）" }}
                  </option>
                </select></label
              >
              <label class="field"
                ><span>補足</span><input v-model="item.note" class="input" maxlength="2000"
              /></label>
              <div class="inline-actions item-actions">
                <button
                  class="button secondary compact"
                  type="button"
                  :disabled="itemIndex === 0"
                  @click="moveItem(stage, itemIndex, -1)"
                >
                  上へ
                </button>
                <button
                  class="button secondary compact"
                  type="button"
                  :disabled="itemIndex === stage.items.length - 1"
                  @click="moveItem(stage, itemIndex, 1)"
                >
                  下へ
                </button>
                <button
                  class="button danger compact"
                  type="button"
                  @click="removeItem(stage, itemIndex)"
                >
                  外す
                </button>
              </div>
            </div>
          </div>
          <button class="button secondary" type="button" @click="addItem(stage)">
            講習会を追加
          </button>
        </article>
      </section>
      <div class="form-actions">
        <BasiqButton type="submit" :disabled="saving">{{
          saving ? "保存中…" : "ロードマップを保存"
        }}</BasiqButton>
      </div>
    </form>
  </div>
</template>
