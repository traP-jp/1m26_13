<script setup lang="ts">
import { BasiqButton, BasiqCard } from "basiq-ui";
import { onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  listFields,
  listLectures,
  listRoadmaps,
  type Field,
  type Lecture,
  type Roadmap,
} from "@/api/resources";

const route = useRoute();
const router = useRouter();
const q = ref(String(route.query.q ?? ""));
const year = ref(String(route.query.year ?? ""));
const fieldId = ref(String(route.query.field ?? ""));
const lectures = ref<Lecture[]>([]);
const roadmaps = ref<Roadmap[]>([]);
const fields = ref<Field[]>([]);
const loading = ref(true);
const error = ref("");

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const queryYear = Number(year.value);
    [lectures.value, roadmaps.value, fields.value] = await Promise.all([
      listLectures({
        q: q.value || undefined,
        year: Number.isFinite(queryYear) && queryYear > 0 ? queryYear : undefined,
        fieldId: fieldId.value || undefined,
      }),
      listRoadmaps(),
      listFields(),
    ]);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "読み込めませんでした";
  } finally {
    loading.value = false;
  }
}

async function search() {
  await router.replace({
    query: {
      q: q.value || undefined,
      year: year.value || undefined,
      field: fieldId.value || undefined,
    },
  });
  await load();
}

watch(
  () => route.query,
  () => {
    q.value = String(route.query.q ?? "");
    year.value = String(route.query.year ?? "");
    fieldId.value = String(route.query.field ?? "");
  },
  { deep: true },
);
onMounted(load);
</script>

<template>
  <div class="page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">DISCOVER</p>
        <h1>次に学ぶ講習会を探す</h1>
        <p>開催資料と運営の知見を、年度を越えて探し、たどり、学び終えた記録まで残せます。</p>
      </div>
      <RouterLink class="button secondary" to="/admin/lectures/new">講習会をつくる</RouterLink>
    </header>

    <form class="surface search-panel" aria-label="講習会を検索" @submit.prevent="search">
      <label class="field"
        ><span>キーワード</span
        ><input v-model="q" class="input" type="search" placeholder="講習会名・説明から検索"
      /></label>
      <label class="field"
        ><span>学年度</span
        ><input v-model="year" class="input" inputmode="numeric" placeholder="2026"
      /></label>
      <label class="field"
        ><span>分野</span
        ><select v-model="fieldId" class="select">
          <option value="">すべて</option>
          <option v-for="field in fields" :key="field.id" :value="field.id">
            {{ field.name }}
          </option>
        </select></label
      >
      <BasiqButton type="submit">検索</BasiqButton>
    </form>

    <div v-if="loading" class="loading-state" aria-live="polite">講習会を読み込んでいます</div>
    <div v-else-if="error" class="error-state" role="alert">
      <p>{{ error }}</p>
      <button class="button secondary" type="button" @click="load">再試行</button>
    </div>
    <template v-else>
      <div class="section-heading">
        <div>
          <h2>講習会</h2>
          <p>{{ lectures.length }}件</p>
        </div>
      </div>
      <div v-if="lectures.length" class="card-grid">
        <RouterLink
          v-for="lecture in lectures"
          :key="lecture.id"
          class="lecture-card"
          :to="`/lectures/${lecture.id}`"
        >
          <div class="card-meta">
            <span class="pill">{{
              lecture.academicYearStart === lecture.academicYearEnd
                ? `${lecture.academicYearStart}年度`
                : `${lecture.academicYearStart}–${lecture.academicYearEnd}年度`
            }}</span
            ><span v-if="lecture.isIntroductory" class="pill success">0→1</span>
          </div>
          <h2>{{ lecture.name }}</h2>
          <p>{{ lecture.description || "説明はまだありません。" }}</p>
          <div class="card-footer">
            <span>{{ lecture.sessions.length }}開催</span
            ><span
              >{{ lecture.completedSessionCount }}/{{ lecture.requiredSessionCount }} 完了</span
            >
          </div>
        </RouterLink>
      </div>
      <div v-else class="empty-state">
        <h2>条件に合う講習会はありません</h2>
        <p>検索語や絞り込みを減らしてみてください。</p>
      </div>

      <div class="section-heading">
        <div>
          <h2>ロードマップ</h2>
          <p>目的別の一本道</p>
        </div>
        <RouterLink to="/roadmaps">すべて見る</RouterLink>
      </div>
      <div v-if="roadmaps.length" class="card-grid">
        <RouterLink
          v-for="roadmap in roadmaps.slice(0, 3)"
          :key="roadmap.id"
          class="roadmap-card"
          :to="`/roadmaps/${roadmap.id}`"
        >
          <div class="card-meta">
            <span class="pill">{{ roadmap.progressPercent }}%</span>
          </div>
          <h2>{{ roadmap.title }}</h2>
          <p>{{ roadmap.description }}</p>
          <div class="card-footer">
            <span>{{ roadmap.completedItemCount }}/{{ roadmap.totalItemCount }} 講習会</span
            ><span>順番を見る →</span>
          </div>
        </RouterLink>
      </div>
      <BasiqCard
        v-else
        title="公開中のロードマップはありません"
        description="運営ページから最初の学習経路を作成できます。"
      />
    </template>
  </div>
</template>
