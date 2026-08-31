<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import type { Lecture } from '../types/lecture'
import { getLectures, toggleLectureCompletion } from '../utils/storage'

const route = useRoute()
const lecture = ref<Lecture | null>(null)

const loadLecture = () => {
  const lectureId = route.params.id as string
  const lectures = getLectures()
  const found = lectures.find((l) => l.id === lectureId)
  lecture.value = found || null
}

const handleToggle = () => {
  if (!lecture.value) return
  const updated = toggleLectureCompletion(String(lecture.value.id))
  if (updated) {
    lecture.value = { ...updated }
  }
}

onMounted(() => {
  loadLecture()
})
</script>

<template>
  <main class="detail-container">
    <div v-if="lecture">
      <span class="category">{{ lecture.category }}</span>
      <h1>{{ lecture.title }}</h1>
      <p class="year">{{ lecture.academicYear }}年度 0→1講習会</p>

      <div class="action-box">
        <button
          :class="['complete-btn', { completed: lecture.completed }]"
          @click="handleToggle"
        >
          {{ lecture.completed ? '受講し終わった！（完了済み）' : '受講し終わった！' }}
        </button>
        <p v-if="lecture.completed" class="completed-date">
          完了日: {{ lecture.completedAt }}
        </p>
      </div>

      <p class="back-link">
        <RouterLink to="/">← 一覧に戻る</RouterLink>
      </p>
    </div>
    <div v-else>
      <p>該当する講習会が見つかりませんでした。</p>
      <RouterLink to="/">トップへ戻る</RouterLink>
    </div>
  </main>
</template>

<style scoped>
.detail-container {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.category {
  background: #eff6ff;
  color: #2563eb;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
}
.year {
  color: #64748b;
  margin-bottom: 24px;
}
.action-box {
  margin: 32px 0;
  padding: 20px;
  background: #f8fafc;
  border-radius: 8px;
  text-align: center;
}
.complete-btn {
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: bold;
  color: white;
  background-color: #2563eb;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.complete-btn:hover {
  background-color: #1d4ed8;
}
.complete-btn.completed {
  background-color: #16a34a;
}
.complete-btn.completed:hover {
  background-color: #15803d;
}
.completed-date {
  margin-top: 12px;
  color: #166534;
  font-size: 0.9rem;
}
.back-link {
  margin-top: 24px;
}
</style>