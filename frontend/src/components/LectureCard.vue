<template>
  <div class="lecture-card" @click="goDetail">
    <div class="card-header">
      <span class="badge team">{{ session.team }}</span>
      <span class="badge year">{{ session.year }}年度 {{ session.season }}</span>
      <span class="badge format">{{ session.format }}</span>
    </div>
    <h3 class="title">{{ session.title }}</h3>
    <p class="description">{{ session.description }}</p>
    <div class="card-footer">
      <span class="instructors">講師: {{ session.instructors.map(i => '@' + i).join(', ') }}</span>
      <span v-if="session.date" class="date">{{ session.date }} {{ session.location }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { LectureSession } from '@/types/lecture';

const props = defineProps<{ session: LectureSession }>();
const router = useRouter();

const goDetail = () => {
  router.push({ name: 'lecture-detail', params: { id: props.session.id } });
};
</script>

<style scoped>
.lecture-card {
  background-color: #1f1f1f;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
}

.lecture-card:hover {
  transform: translateY(-2px);
  border-color: #555;
}

.card-header {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}

.badge.team { background-color: #0055a5; color: #fff; }
.badge.year { background-color: #333; color: #ccc; }
.badge.format { background-color: #2e5b38; color: #fff; }

.title {
  font-size: 16px;
  margin: 0 0 8px 0;
  color: #fff;
}

.description {
  font-size: 13px;
  color: #aaa;
  margin-bottom: 12px;
  line-height: 1.4;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #777;
}
</style>