<script setup lang="ts">
import { RouterLink } from 'vue-router'
import SearchBar from '@/components/SearchBar.vue'
import { useSearch } from '@/composables/useSearch'

const userId = import.meta.env.VITE_TRAQ_USER_ID

// IDが存在する場合はtraQの画像、ない場合はグレーの円SVGを使用
const userIconUrl = userId
  ? `https://q.trap.jp/api/v3/public/icon/${userId}`
  : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%23cbd5e1"/></svg>'

// 検索ロジックと状態の取得
const { filter, isModalOpen } = useSearch()
</script>

<template>
  <header class="app-header">
    <div class="logo">
      <RouterLink to="/">講習会ポータル</RouterLink>
    </div>

    <!-- ヘッダー中央の検索バー -->
    <div class="search-container">
      <SearchBar
        v-model="filter.keyword"
        @open-modal="isModalOpen = true"
      />
    </div>

    <div class="user-menu">
      <RouterLink to="/profile" title="プロフィールを見る">
        <img :src="userIconUrl" alt="ユーザーアイコン" class="user-icon" />
      </RouterLink>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  gap: 16px;
}

.logo {
  flex-shrink: 0;
}

.logo a {
  font-weight: bold;
  font-size: 1.1rem;
  text-decoration: none;
  color: #1a202c;
  white-space: nowrap;
}

.search-container {
  flex: 1;
  max-width: 560px;
}

.user-menu {
  flex-shrink: 0;
}

.user-menu a {
  display: flex;
  align-items: center;
}

.user-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #cbd5e1;
  object-fit: cover;
  border: 1px solid #cbd5e1;
  cursor: pointer;
  transition: opacity 0.2s;
}

.user-icon:hover {
  opacity: 0.8;
}
</style>