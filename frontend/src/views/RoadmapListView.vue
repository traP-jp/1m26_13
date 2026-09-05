<script setup lang="ts">
import { onMounted, ref } from "vue";

import { listRoadmaps, type Roadmap } from "@/api/resources";
import AppIcon from "@/components/AppIcon.vue";

const roadmaps = ref<Roadmap[]>([]);
const loading = ref(true);
const error = ref("");
async function load() {
  loading.value = true;
  error.value = "";
  try {
    roadmaps.value = await listRoadmaps();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "読み込めませんでした";
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>

<template>
  <div class="page roadmap-list-page">
    <header class="results-heading">
      <h1>ロードマップ</h1>
      <span v-if="!loading && !error">{{ roadmaps.length }}件</span>
    </header>
    <div v-if="loading" class="loading-state">読み込んでいます</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <ul v-else-if="roadmaps.length" class="roadmap-list">
      <li v-for="roadmap in roadmaps" :key="roadmap.id">
        <RouterLink :to="`/roadmaps/${roadmap.id}`" class="roadmap-link">
          <article class="roadmap-row">
            <div>
              <h2>{{ roadmap.title }}</h2>
              <p v-if="roadmap.description">{{ roadmap.description }}</p>
            </div>
            <p class="roadmap-meta">
              {{ roadmap.totalItemCount }}項目 · {{ roadmap.progressPercent }}% 完了<span
                v-if="roadmap.audience"
              >
                · 対象：{{ roadmap.audience }}</span
              >
            </p>
            <AppIcon name="chevron" :size="18" />
          </article>
        </RouterLink>
      </li>
    </ul>
    <div v-else class="empty-state">公開中のロードマップはありません。</div>
  </div>
</template>

<style scoped>
.roadmap-list-page {
  width: min(100%, 1200px);
}

.results-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 24px;
  margin: 0 0 16px;
}

.results-heading h1 {
  font-size: 1.5rem;
  line-height: 1.35;
}

.results-heading span {
  color: var(--basiq-color-content-subtle);
  font-size: 0.875rem;
}

.roadmap-list {
  border-top: 1px solid var(--basiq-color-border-separator);
  list-style: none;
}

.roadmap-list > li {
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.roadmap-link {
  display: block;
  text-decoration: none;
}

.roadmap-link:hover {
  background: var(--basiq-color-surface-container);
}

.roadmap-link:focus-visible {
  outline: 2px solid var(--basiq-color-accent-default);
  outline-offset: -2px;
}

.roadmap-row {
  min-height: 64px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(160px, 0.65fr) 20px;
  align-items: center;
  gap: 24px;
  padding: 12px 8px;
}

.roadmap-row > div {
  min-width: 0;
}

.roadmap-row h2 {
  font-size: 0.875rem;
  line-height: 1.45;
}

.roadmap-row > div p {
  margin-top: 4px;
  overflow: hidden;
  color: var(--basiq-color-content-subtle);
  font-size: 0.875rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.roadmap-row :deep(.app-icon) {
  color: var(--basiq-color-content-accent);
}

.roadmap-meta {
  color: var(--basiq-color-content-subtle);
  font-size: 0.75rem;
  text-align: right;
}

@media (width <= 760px) {
  .results-heading {
    margin-top: 0;
  }

  .roadmap-row {
    min-height: 0;
    grid-template-columns: minmax(0, 1fr) 18px;
    gap: 8px;
    padding: 12px 4px;
  }

  .roadmap-meta {
    grid-column: 1;
    text-align: left;
  }

  .roadmap-row :deep(.app-icon) {
    grid-column: 2;
    grid-row: 1 / 3;
  }

  .roadmap-row > div p {
    white-space: normal;
  }
}
</style>
