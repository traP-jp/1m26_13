<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import type { Lecture } from '../types/lecture'
import { getLectures } from '../utils/storage'

const lectures = ref<Lecture[]>([])

onMounted(() => {
  lectures.value = getLectures()
})
</script>

<template>
  <main class="home-container">
    <h1>講習会一覧</h1>
    <div class="lecture-list">
      <div v-for="lecture in lectures" :key="lecture.id" class="lecture-card">
        <div class="card-header">
          <span class="category">{{ lecture.category }}</span>
          <span v-if="lecture.completed" class="status-badge">受講済み</span>
        </div>
        <h2>{{ lecture.title }}</h2>
        <p>{{ lecture.academicYear }}年度 開催</p>
        <RouterLink :to="'/lectures/' + lecture.id" class="detail-link">
          詳細を見る →
        </RouterLink>
      </div>
    </div>
  </main>
</template>

<style scoped>
.home-container {
  max-width: 800px;
  margin: 0 auto;
}
.lecture-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 20px;
}
.lecture-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.category {
  background: #eff6ff;
  color: #2563eb;
  font-size: 0.8rem;
  padding: 2px 8px;
  border-radius: 4px;
}
.status-badge {
  background: #dcfce7;
  color: #166534;
  font-size: 0.8rem;
  padding: 2px 8px;
  border-radius: 4px;
}
.detail-link {
  display: inline-block;
  margin-top: 12px;
  color: #2563eb;
  text-decoration: none;
  font-weight: bold;
}
</style>