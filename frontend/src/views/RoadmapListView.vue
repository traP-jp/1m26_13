<script setup lang="ts">
import { onMounted, ref } from "vue";

import { listRoadmaps, type Roadmap } from "@/api/resources";
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
  <div class="page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">ROADMAPS</p>
        <h1>学ぶ順番から探す</h1>
        <p>講習会を一本道に並べた、目的別の学習経路です。</p>
      </div>
    </header>
    <div v-if="loading" class="loading-state">読み込んでいます</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <div v-else-if="roadmaps.length" class="card-grid">
      <RouterLink
        v-for="roadmap in roadmaps"
        :key="roadmap.id"
        class="roadmap-card"
        :to="`/roadmaps/${roadmap.id}`"
        ><div class="card-meta">
          <span class="pill">{{ roadmap.progressPercent }}%</span>
        </div>
        <h2>{{ roadmap.title }}</h2>
        <p>{{ roadmap.description }}</p>
        <div class="card-footer">
          <span>{{ roadmap.completedItemCount }}/{{ roadmap.totalItemCount }}完了</span
          ><span>開く →</span>
        </div></RouterLink
      >
    </div>
    <div v-else class="empty-state">公開中のロードマップはありません。</div>
  </div>
</template>
