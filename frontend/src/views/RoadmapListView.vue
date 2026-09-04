<script setup lang="ts">
import { BasiqCard } from "basiq-ui";
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
      <div>
        <h1>ロードマップ</h1>
        <span>目的に合った学ぶ順番を表示</span>
      </div>
      <strong v-if="!loading && !error">{{ roadmaps.length }}件</strong>
    </header>
    <div v-if="loading" class="loading-state">読み込んでいます</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <ul v-else-if="roadmaps.length" class="roadmap-grid">
      <li v-for="roadmap in roadmaps" :key="roadmap.id">
        <RouterLink :to="`/roadmaps/${roadmap.id}`" class="card-link">
          <BasiqCard class="discovery-card">
            <article class="discovery-card-content">
              <h2>{{ roadmap.title }}</h2>
              <div class="discovery-card-description">
                <p>{{ roadmap.description }}</p>
                <AppIcon name="chevron" :size="19" />
              </div>
              <p class="discovery-card-meta">
                {{ roadmap.totalItemCount }}講習会 · {{ roadmap.progressPercent }}% 完了<span
                  v-if="roadmap.audience"
                >
                  · 対象：{{ roadmap.audience }}</span
                >
              </p>
            </article>
          </BasiqCard>
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
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin: 4px 0 16px;
}

.results-heading > div {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 12px;
  align-items: baseline;
}

.results-heading h1 {
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
  border-radius: var(--basiq-radius-full);
  color: var(--basiq-color-content-accent);
  background: var(--app-accent-soft);
  text-align: center;
}

.roadmap-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  list-style: none;
}

.roadmap-grid > li,
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

  transition:
    border-color 140ms ease,
    box-shadow 140ms ease,
    transform 140ms ease;
}

.card-link:hover .discovery-card {
  border-color: var(--basiq-color-accent-default);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--basiq-color-content-default) 9%, transparent);
  transform: translateY(-2px);
}

.discovery-card-content {
  min-height: 170px;
  display: flex;
  flex-direction: column;
}

.discovery-card-content h2 {
  font-size: 1rem;
  line-height: 1.45;
}

.discovery-card-description {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.discovery-card-description p {
  font-size: 0.86rem;
  line-height: 1.75;
}

.discovery-card-description :deep(.app-icon) {
  color: var(--basiq-color-content-accent);
}

.discovery-card-meta {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--basiq-color-border-separator);
  color: var(--basiq-color-content-subtle);
  font-size: 0.74rem;
}

@media (width <= 1120px) {
  .roadmap-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 760px) {
  .results-heading {
    margin-top: 0;
  }

  .results-heading > div {
    display: block;
  }

  .results-heading span {
    display: block;
    margin-top: 2px;
  }

  .roadmap-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .discovery-card-content {
    min-height: 148px;
  }

  .card-link:hover .discovery-card {
    transform: none;
    box-shadow: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .discovery-card {
    transition: none;
  }
}
</style>
