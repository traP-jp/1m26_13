<script setup lang="ts">
import { BasiqButton, BasiqCard, BasiqFormField, BasiqInput } from "basiq-ui";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  getDirectory,
  listFields,
  listLectures,
  listRoadmaps,
  type Directory,
  type Field,
  type Lecture,
  type Roadmap,
} from "@/api/resources";
import AppIcon from "@/components/AppIcon.vue";

const route = useRoute();
const router = useRouter();
const q = ref(String(route.query.q ?? ""));
const year = ref(String(route.query.year ?? ""));
const fieldId = ref(String(route.query.field ?? ""));
const lectures = ref<Lecture[]>([]);
const roadmaps = ref<Roadmap[]>([]);
const fields = ref<Field[]>([]);
const directory = ref<Directory>({ users: [], groups: [] });
const loading = ref(true);
const error = ref("");

const visibleRoadmaps = computed(() => {
  const query = q.value.trim().toLocaleLowerCase("ja");
  if (!query) return roadmaps.value;
  return roadmaps.value.filter((roadmap) =>
    `${roadmap.title} ${roadmap.description}`.toLocaleLowerCase("ja").includes(query),
  );
});

function academicYear(lecture: Lecture) {
  return lecture.academicYearStart === lecture.academicYearEnd
    ? `${lecture.academicYearStart}年度`
    : `${lecture.academicYearStart}–${lecture.academicYearEnd}年度`;
}

function sessionCountLabel(lecture: Lecture) {
  const count = lecture.sessions.filter((session) => !session.isReplay).length;
  if (count === 0) return "開催準備中";
  return count === 1 ? "1回完結" : `全${count}回`;
}

function organizerLabel(lecture: Lecture) {
  if (!lecture.organizer) return "運営未設定";
  if (lecture.organizer.kind === "group") {
    return lecture.organizer.groupName || "運営グループ";
  }
  return (
    directory.value.users.find((item) => item.id === lecture.organizer?.id)?.displayName ??
    "運営担当者"
  );
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const queryYear = Number(year.value);
    [lectures.value, roadmaps.value, fields.value, directory.value] = await Promise.all([
      listLectures({
        q: q.value || undefined,
        year: Number.isFinite(queryYear) && queryYear > 0 ? queryYear : undefined,
        fieldId: fieldId.value || undefined,
      }),
      listRoadmaps(),
      listFields(),
      getDirectory(),
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

async function clearFilters() {
  q.value = "";
  year.value = "";
  fieldId.value = "";
  await search();
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
  <div class="page discovery-page">
    <h1 class="visually-hidden">講習会とロードマップを探す</h1>

    <section class="view-panel" aria-labelledby="lecture-results-heading">
      <BasiqCard class="filter-card">
        <template #header>
          <div class="filter-header">
            <div>
              <span class="filter-icon"><AppIcon name="search" /></span>
              <div>
                <strong>講習会とロードマップを探す</strong
                ><small>キーワードで両方を検索できます</small>
              </div>
            </div>
            <button class="clear-button" type="button" @click="clearFilters">条件をクリア</button>
          </div>
        </template>
        <form class="filter-grid" @submit.prevent="search">
          <BasiqFormField label="キーワード" class="keyword-field">
            <BasiqInput v-model="q" type="search" placeholder="例：Web、Git、インフラ" />
          </BasiqFormField>
          <BasiqFormField label="分野">
            <template #default="{ id, describedBy }">
              <select :id="id" v-model="fieldId" :aria-describedby="describedBy">
                <option value="">すべての分野</option>
                <option v-for="field in fields" :key="field.id" :value="field.id">
                  {{ field.name }}
                </option>
              </select>
            </template>
          </BasiqFormField>
          <BasiqFormField label="年度">
            <BasiqInput v-model="year" inputmode="numeric" placeholder="すべての年度" />
          </BasiqFormField>
          <BasiqButton type="submit" class="search-button"
            ><AppIcon name="search" :size="18" />この条件で検索</BasiqButton
          >
        </form>
      </BasiqCard>

      <div v-if="loading" class="loading-state" aria-live="polite">講習会を読み込んでいます</div>
      <div v-else-if="error" class="error-state" role="alert">
        <p>{{ error }}</p>
        <BasiqButton tone="neutral" variant="outline" @click="load">再試行</BasiqButton>
      </div>
      <template v-else>
        <div id="lecture-results-heading" class="results-heading">
          <div>
            <h2>講習会</h2>
            <span>見つかった教材を新しい順に表示</span>
          </div>
          <strong>{{ lectures.length }}件</strong>
        </div>

        <ul v-if="lectures.length" class="discovery-grid">
          <li v-for="lecture in lectures" :key="lecture.id">
            <RouterLink :to="`/lectures/${lecture.id}`" class="card-link">
              <BasiqCard class="discovery-card">
                <article class="discovery-card-content">
                  <h3>{{ lecture.name }}</h3>
                  <div class="card-description">
                    <p>{{ lecture.description || "説明はまだありません。" }}</p>
                    <AppIcon name="chevron" :size="19" />
                  </div>
                  <p class="card-meta">
                    {{ sessionCountLabel(lecture) }} · {{ organizerLabel(lecture) }} ·
                    {{ academicYear(lecture) }}
                  </p>
                </article>
              </BasiqCard>
            </RouterLink>
          </li>
        </ul>
        <div v-else class="empty-state">
          <strong>条件に合う講習会はありません</strong>
          <p>検索語や絞り込みを減らしてみてください。</p>
        </div>
      </template>
    </section>

    <section class="view-panel roadmap-section" aria-labelledby="roadmap-results-heading">
      <div id="roadmap-results-heading" class="results-heading">
        <div>
          <h2>ロードマップ</h2>
          <span>目的に合った学ぶ順番を表示</span>
        </div>
        <strong>{{ visibleRoadmaps.length }}件</strong>
      </div>
      <ul v-if="visibleRoadmaps.length" class="discovery-grid">
        <li v-for="roadmap in visibleRoadmaps" :key="roadmap.id">
          <RouterLink :to="`/roadmaps/${roadmap.id}`" class="card-link">
            <BasiqCard class="discovery-card">
              <article class="discovery-card-content">
                <h3>{{ roadmap.title }}</h3>
                <div class="card-description">
                  <p>{{ roadmap.description }}</p>
                  <AppIcon name="chevron" :size="19" />
                </div>
                <p class="card-meta">
                  {{ roadmap.totalItemCount }}講習会 · {{ roadmap.progressPercent }}% 完了
                </p>
              </article>
            </BasiqCard>
          </RouterLink>
        </li>
      </ul>
      <div v-else-if="!loading" class="empty-state">公開中のロードマップはありません。</div>
    </section>
  </div>
</template>

<style scoped>
/* stylelint-disable no-descending-specificity */
.discovery-page {
  --discovery-content: 1120px;

  width: min(100%, calc(var(--discovery-content) + 80px));
}

.view-panel {
  width: 100%;
  padding-top: 4px;
}

.roadmap-section {
  margin-top: 64px;
  padding-top: 48px;
  border-top: 1px solid var(--basiq-color-border-separator);
}

.filter-card {
  border: 1px solid var(--basiq-color-border-separator);

  --basiq-color-card-background: var(--basiq-color-surface-base);
}

.filter-header,
.filter-header > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.filter-header > div > div {
  display: flex;
  flex-direction: column;
}

.filter-header small {
  margin-top: 1px;
  color: var(--basiq-color-content-subtle);
}

.filter-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 50%;
  color: var(--basiq-color-content-accent);
  background: var(--app-accent-soft);
}

.clear-button {
  border: 0;
  padding: 8px;
  color: var(--basiq-color-content-accent);
  background: transparent;
  font-weight: 700;
  cursor: pointer;
}

.filter-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(160px, 0.8fr) minmax(140px, 0.65fr) auto;
  gap: 16px;
  align-items: end;
}

.filter-grid > * {
  min-width: 0;
}

.filter-grid :deep(input) {
  min-width: 0;
}

.filter-grid select {
  width: 100%;
  height: 40px;
  padding: 0 34px 0 12px;
  border: var(--basiq-border-width-strong) solid var(--basiq-color-text-control-border);
  border-radius: var(--basiq-radius-sm);
  color: var(--basiq-color-text-control-content);
  background: var(--basiq-color-text-control-background);
}

.search-button {
  min-width: 172px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.results-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  margin: 40px 0 16px;
}

.results-heading > div {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 12px;
  align-items: baseline;
}

.results-heading h2 {
  font-size: 1.45rem;
  line-height: 1.35;
}

.results-heading span {
  color: var(--basiq-color-content-subtle);
  font-size: 0.82rem;
}

.results-heading > strong {
  min-width: 52px;
  padding: 4px 12px;
  border-radius: 999px;
  color: var(--basiq-color-content-accent);
  background: var(--app-accent-soft);
  text-align: center;
}

.discovery-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  list-style: none;
}

.discovery-grid > li,
.card-link,
.discovery-card {
  height: 100%;
}

.card-link {
  display: block;
  text-decoration: none;
}

.discovery-card {
  border: 1px solid transparent;

  --basiq-color-card-background: var(--basiq-color-surface-container);

  transition: border-color 140ms ease;
}

.card-link:hover .discovery-card {
  border-color: var(--basiq-color-accent-default);
}

.card-link:focus-visible {
  border-radius: var(--basiq-radius-sm);
  outline: 2px solid var(--basiq-color-accent-default);
  outline-offset: 3px;
}

.discovery-card-content {
  min-height: 170px;
  display: flex;
  flex-direction: column;
}

.discovery-card-content h3 {
  font-size: 1rem;
  line-height: 1.45;
}

.card-description {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.card-description p {
  font-size: 0.86rem;
  line-height: 1.75;
}

.card-description :deep(.app-icon) {
  color: var(--basiq-color-content-accent);
}

.card-meta {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--basiq-color-border-separator);
  color: var(--basiq-color-content-subtle);
  font-size: 0.74rem;
}

.empty-state p {
  margin-top: 4px;
}

@media (width <= 1120px) {
  .discovery-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-grid {
    grid-template-columns: minmax(0, 1.3fr) minmax(150px, 0.8fr) minmax(130px, 0.6fr);
  }

  .search-button {
    grid-column: 1 / -1;
    width: max-content;
  }
}

@media (width <= 760px) {
  .discovery-page {
    width: 100%;
  }

  .view-panel {
    padding-top: 0;
  }

  .roadmap-section {
    margin-top: 48px;
    padding-top: 40px;
  }

  .filter-header {
    align-items: flex-start;
  }

  .clear-button {
    display: none;
  }

  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .keyword-field,
  .search-button {
    grid-column: 1 / -1;
  }

  .search-button {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .results-heading {
    margin-top: 32px;
  }

  .results-heading > div {
    display: block;
  }

  .results-heading span {
    display: block;
    margin-top: 2px;
  }

  .discovery-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .discovery-card-content {
    min-height: 148px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .discovery-card {
    transition: none;
  }
}
</style>
