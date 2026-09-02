<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { storageService } from '@/services/storageService'
import type { LectureSession } from '@/types/lecture'

const route = useRoute()
const lectures = ref<LectureSession[]>([])

const toSingleQueryValue = (value: unknown): string => {
  if (Array.isArray(value)) return value[0] ?? ''
  return typeof value === 'string' ? value : ''
}

const loadLectures = () => {
  lectures.value = storageService.getLectures()
}

onMounted(() => {
  loadLectures()
})

watch(
  () => route.query.q,
  () => {
    loadLectures()
  }
)

// URLの ?q= の値を取得
const searchQuery = computed(() => toSingleQueryValue(route.query.q).trim())

// 検索ワードに基づく絞り込みロジック
const filteredLectures = computed(() => {
  const kw = searchQuery.value.toLowerCase()
  if (!kw) return lectures.value

  return lectures.value.filter((item) => {
    const searchableText = [
      item.title,
      item.seriesTitle,
      item.description,
      item.team,
      item.instructors?.join(' '),
      item.location,
      item.date
    ]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .map((value) => value.toLowerCase())

    return searchableText.some((value) => value.includes(kw))
  })
})
</script>

<template>
  <main class="search-result-container">
    <div class="result-header">
      <h1>「{{ searchQuery }}」の検索結果</h1>
      <p class="count-text">{{ filteredLectures.length }}件ヒットしました</p>
    </div>

    <div v-if="filteredLectures.length > 0" class="lecture-list">
      <div v-for="lecture in filteredLectures" :key="lecture.id" class="lecture-card">
        <div class="card-header">
          <span class="category">{{ lecture.team }}</span>
        </div>
        <h2>{{ lecture.title }}</h2>
        <p>{{ lecture.year }}年度 開催</p>
        <RouterLink :to="'/lectures/' + lecture.id" class="detail-link">
          詳細を見る →
        </RouterLink>
      </div>
    </div>

    <div v-else class="no-results">
      <p>該当する講習会が見つかりませんでした。</p>
      <RouterLink to="/" class="back-link">← ホーム一覧に戻る</RouterLink>
    </div>
  </main>
</template>

<style scoped>
.search-result-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 16px;
}

.result-header {
  margin-bottom: 24px;
}

.result-header h1 {
  font-size: 1.5rem;
  color: #1a202c;
  margin: 0 0 4px 0;
}

.count-text {
  font-size: 0.9rem;
  color: #64748b;
  margin: 0;
}

.lecture-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
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
  margin-bottom: 8px;
}

.category {
  background: #eff6ff;
  color: #2563eb;
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

.no-results {
  text-align: center;
  padding: 48px 0;
  color: #64748b;
}

.back-link {
  display: inline-block;
  margin-top: 12px;
  color: #2563eb;
  text-decoration: none;
}
</style>