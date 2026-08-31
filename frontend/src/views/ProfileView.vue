<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Lecture } from '../types/lecture'
import { getLectures } from '../utils/storage'
import BadgeCard from '../components/BadgeCard.vue'

// 環境変数からユーザーIDを取得
const userId = import.meta.env.VITE_TRAQ_USER_ID

const userIconUrl = userId 
  ? `https://q.trap.jp/api/v3/public/icon/${userId}` 
  : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23cbd5e1"/></svg>'

const userName = ref<string>(userId || 'ゲスト')

const currentTab = ref<'achievements' | 'history'>('achievements')
const lectures = ref<Lecture[]>([])

// 完了判定＋最新順ソート
const completedLectures = computed(() => {
  return lectures.value
    .filter((lecture) => lecture.completed)
    .sort((a, b) => {
      const dateA = a.completedAt ?? ''
      const dateB = b.completedAt ?? ''
      return dateB.localeCompare(dateA)
    })
})

onMounted(() => {
  lectures.value = getLectures()
})
</script>

<template>
  <main class="profile-container">
    <div class="user-info">
      <img :src="userIconUrl" alt="ユーザーアイコン" class="avatar" />
      <div>
        <h2>{{ userName }}</h2>
        <p class="stats">完了した講習会: {{ completedLectures.length }}件</p>
      </div>
    </div>

    <div class="tab-menu">
      <button
        :class="{ active: currentTab === 'achievements' }"
        @click="currentTab = 'achievements'"
      >
        アチーブメント
      </button>
      <button
        :class="{ active: currentTab === 'history' }"
        @click="currentTab = 'history'"
      >
        履歴
      </button>
    </div>

    <!-- アチーブメントタブ：BadgeCardを表示 -->
    <section v-if="currentTab === 'achievements'" class="tab-content">
      <h3>獲得したバッジ</h3>
      <div v-if="completedLectures.length > 0" class="badge-grid">
        <BadgeCard
          v-for="lecture in completedLectures"
          :key="lecture.id"
          :lecture="lecture"
        />
      </div>
      <p v-else>まだバッジを獲得していません。</p>
    </section>

    <!-- 履歴タブ -->
    <section v-if="currentTab === 'history'" class="tab-content">
      <h3>完了した講習会一覧</h3>
      <ul v-if="completedLectures.length > 0" class="history-list">
        <li v-for="lecture in completedLectures" :key="lecture.id" class="history-item">
          <div class="history-info">
            <span class="badge-category">{{ lecture.category }}</span>
            <span class="lecture-title">{{ lecture.title }}</span>
            <span class="academic-year">({{ lecture.academicYear }}年度)</span>
            <span v-if="lecture.completedAt" class="completed-date">（完了日: {{ lecture.completedAt }}）</span>
          </div>
          <!-- 右側に配置する詳細リンク -->
          <RouterLink :to="`/lectures/${lecture.id}`" class="detail-link">
            詳細
          </RouterLink>
        </li>
      </ul>
      <p v-else>まだ完了した講習会はありません。</p>
    </section>

    <p class="back-link">
      <RouterLink to="/">トップページへ戻る</RouterLink>
    </p>
  </main>
</template>

<style scoped>
/* 横幅統一とGridレイアウトの設定 */
.badge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 190px);
  gap: 20px;
  margin-top: 16px;
}

.profile-container { max-width: 800px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
.user-info { display: flex; align-items: center; gap: 20px; margin-bottom: 24px; }
.avatar { width: 80px; height: 80px; border-radius: 50%; background-color: #cbd5e1; object-fit: cover; }
.stats { color: #64748b; font-size: 0.9rem; margin-top: 4px; }
.tab-menu { display: flex; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px; }
.tab-menu button { padding: 10px 20px; background: none; border: none; font-size: 1rem; font-weight: bold; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
.tab-menu button.active { color: #2563eb; border-bottom-color: #2563eb; }
.tab-content { min-height: 200px; }

/* 履歴タブのスタイル調整 */
.history-list { list-style: none; padding: 0; margin-top: 16px; }
.history-item { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  gap: 12px; 
  padding: 12px 4px; 
  border-bottom: 1px solid #f1f5f9; 
}
.history-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.badge-category { background-color: #eff6ff; color: #2563eb; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: bold; }
.academic-year, .completed-date { color: #94a3b8; font-size: 0.85rem; }

/* 詳細リンクの追加スタイル */
.detail-link {
  color: #2563eb;
  font-size: 0.9rem;
  font-weight: bold;
  text-decoration: none;
  white-space: nowrap;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.detail-link:hover {
  background-color: #eff6ff;
  text-decoration: underline;
}

.back-link { margin-top: 32px; }
</style>