<template>
  <div class="roadmap-card" @click="$emit('select', roadmap.id)">
    <div class="card-header">
      <span class="badge team">{{ roadmap.team }}</span>
      <span class="badge year">{{ roadmap.year }}年度</span>
      <span class="count-badge">{{ roadmap.sessionIds.length }} 回の講習</span>
    </div>
    <h3 class="title">{{ roadmap.title }}</h3>
    <p class="description">{{ roadmap.description }}</p>
    <div class="card-footer">
      <span class="action-text">包含する講習会一覧を表示 →</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Roadmap } from '@/types/lecture';

defineProps<{ roadmap: Roadmap }>();
defineEmits(['select']);
</script>

<style scoped>
.roadmap-card {
  background-color: #1a2332;
  border: 1px solid #2c3e50;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s, background-color 0.2s;
}

.roadmap-card:hover {
  transform: translateY(-2px);
  border-color: #3ea6ff;
  background-color: #1e2c40;
}

.card-header {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}

.badge.team { background-color: #0055a5; color: #fff; }
.badge.year { background-color: #333; color: #ccc; }

.count-badge {
  font-size: 11px;
  color: #3ea6ff;
  margin-left: auto;
}

.title {
  font-size: 16px;
  margin: 0 0 8px 0;
  color: #fff;
}

.description {
  font-size: 13px;
  color: #bbb;
  margin-bottom: 12px;
  line-height: 1.4;
}

.card-footer {
  text-align: right;
  font-size: 12px;
  color: #3ea6ff;
  font-weight: bold;
}
</style>