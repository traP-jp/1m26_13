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
    <div class="breadcrumb">
      <RouterLink to="/">ホーム</RouterLink><b>/</b><span>ロードマップ</span>
    </div>
    <header class="page-heading">
      <div>
        <p class="eyebrow">ROADMAPS</p>
        <h1>学ぶ順番から探す</h1>
        <p>目的までの講習会を、一本道の学習経路にまとめています。</p>
      </div>
    </header>
    <div v-if="loading" class="loading-state">読み込んでいます</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <div v-else-if="roadmaps.length" class="roadmap-grid">
      <RouterLink v-for="roadmap in roadmaps" :key="roadmap.id" :to="`/roadmaps/${roadmap.id}`">
        <BasiqCard class="roadmap-card">
          <template #header
            ><div class="card-top">
              <span class="map-icon"><AppIcon name="map" :size="19" /></span
              ><span class="pill">{{ roadmap.progressPercent }}%</span>
            </div></template
          >
          <div class="card-content">
            <h2>{{ roadmap.title }}</h2>
            <p>{{ roadmap.description }}</p>
            <div class="progress">
              <span :style="{ width: `${roadmap.progressPercent}%` }"></span>
            </div>
          </div>
          <template #footer
            ><span>{{ roadmap.completedItemCount }}/{{ roadmap.totalItemCount }}完了</span
            ><strong>ロードマップを見る <AppIcon name="arrow" :size="15" /></strong
          ></template>
        </BasiqCard>
      </RouterLink>
    </div>
    <div v-else class="empty-state">公開中のロードマップはありません。</div>
  </div>
</template>

<style scoped>
.roadmap-list-page {
  width: min(1080px, 100%);
}

.roadmap-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.roadmap-grid > a {
  text-decoration: none;
}

.roadmap-card {
  height: 100%;
  border: 1px solid var(--basiq-color-border-separator);
  transition:
    transform 0.15s,
    border-color 0.15s;
}

.roadmap-card:hover {
  transform: translateY(-2px);
  border-color: var(--basiq-color-accent-default);
}

.card-top {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.map-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: var(--basiq-radius-sm);
  color: var(--basiq-color-content-accent);
  background: var(--app-accent-soft);
}

.card-content {
  min-height: 145px;
  display: grid;
  align-content: start;
  gap: 10px;
}

.card-content h2 {
  font-size: 18px;
}

.card-content p {
  display: -webkit-box;
  overflow: hidden;
  color: var(--basiq-color-content-subtle);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.progress {
  height: 6px;
  overflow: hidden;
  margin-top: auto;
  border-radius: 99px;
  background: var(--basiq-color-surface-muted);
}

.progress span {
  height: 100%;
  display: block;
  border-radius: inherit;
  background: var(--basiq-color-accent-default);
}

.roadmap-card :deep([class*="footer"]) {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--basiq-color-content-subtle);
  font-size: 12px;
}

.roadmap-card :deep([class*="footer"]) strong {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--basiq-color-content-accent);
}

@media (width <= 760px) {
  .roadmap-grid {
    grid-template-columns: 1fr;
  }

  .card-content {
    min-height: auto;
  }
}
</style>
