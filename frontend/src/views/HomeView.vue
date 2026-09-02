<template>
  <div class="home-view">
    <!-- 検索ヘッダー -->
    <header class="search-section">
      <SearchBar
        v-model="filter.keyword"
        @open-modal="isModalOpen = true"
      />
      <!-- 条件をクリアボタンを「○○から探す」の隣に配置したQuickNavButtons -->
      <QuickNavButtons
        :filter="filter"
        @reset="resetFilter"
      />
    </header>

    <!-- 高度な検索モーダル -->
    <AdvancedSearchModal
      :is-open="isModalOpen"
      :filter="filter"
      @close="isModalOpen = false"
      @reset="resetFilter"
    />

    <!-- 結果表示領域 -->
    <main class="results-section">
      <div v-if="selectedRoadmap" class="active-roadmap-banner">
        <span>ロードマップ <strong>「{{ selectedRoadmap.title }}」</strong> 内の講習会を表示中</span>
        <button class="clear-roadmap-btn" @click="clearRoadmapFilter">絞り込み解除 ✕</button>
      </div>

      <ResultTabs
        v-model:activeTab="activeTab"
        :lecture-count="filteredLectures.length"
        :roadmap-count="filteredRoadmaps.length"
      />

      <!-- 講習会リスト -->
      <div v-if="activeTab === 'lectures'" class="card-grid">
        <LectureCard
          v-for="session in filteredLectures"
          :key="session.id"
          :session="session"
        />
        <p v-if="filteredLectures.length === 0" class="no-results">
          該当する講習会が見つかりませんでした。
        </p>
      </div>

      <!-- ロードマップリスト -->
      <div v-if="activeTab === 'roadmaps'" class="card-grid">
        <RoadmapCard
          v-for="roadmap in filteredRoadmaps"
          :key="roadmap.id"
          :roadmap="roadmap"
          @select="selectRoadmapFilter"
        />
        <p v-if="filteredRoadmaps.length === 0" class="no-results">
          該当するロードマップが見つかりませんでした。
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import SearchBar from '@/components/SearchBar.vue';
import QuickNavButtons from '@/components/QuickNavButtons.vue';
import AdvancedSearchModal from '@/components/AdvancedSearchModal.vue';
import ResultTabs from '@/components/ResultTabs.vue';
import LectureCard from '@/components/LectureCard.vue';
import RoadmapCard from '@/components/RoadmapCard.vue';
import { useSearch } from '@/composables/useSearch';

const {
  activeTab,
  isModalOpen,
  filter,
  selectedRoadmap,
  filteredLectures,
  filteredRoadmaps,
  selectRoadmapFilter,
  clearRoadmapFilter,
  resetFilter
} = useSearch();
</script>

<style scoped>
.home-view {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px 16px;
  color: #fff;
}

.active-roadmap-banner {
  background-color: #1e2c40;
  border: 1px solid #3ea6ff;
  border-radius: 8px;
  padding: 10px 16px;
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.clear-roadmap-btn {
  background: none;
  border: none;
  color: #ff6b6b;
  cursor: pointer;
  font-weight: bold;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.no-results {
  grid-column: 1 / -1;
  text-align: center;
  color: #aaa;
  padding: 40px 0;
}
</style>