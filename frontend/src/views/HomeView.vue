<template>
  <div class="home-view">
    <!-- 検索ヘッダー -->
    <header class="search-section">
      <SearchBar
        v-model="filter.keyword"
        @open-modal="isModalOpen = true"
      />
      <QuickNavButtons
        @select-team="(team) => filter.team = team"
        @select-year="(year) => filter.year = year"
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
          該当する講習会が見つかりませんでした。条件を変更してください。
        </p>
      </div>

      <!-- ロードマップリスト -->
      <div v-if="activeTab === 'roadmaps'" class="card-grid">
        <div v-for="roadmap in filteredRoadmaps" :key="roadmap.id" class="roadmap-card-stub">
          <h3>{{ roadmap.title }}</h3>
          <p>{{ roadmap.description }}</p>
        </div>
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
import { useSearch } from '@/composables/useSearch';

const {
  activeTab,
  isModalOpen,
  filter,
  filteredLectures,
  filteredRoadmaps,
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

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.no-results {
  grid-column: 1 / -1;
  text-align: center;
  color: #777;
  padding: 40px 0;
}

.roadmap-card-stub {
  background-color: #1f1f1f;
  border: 1px solid #3d3d3d;
  padding: 16px;
  border-radius: 8px;
}
</style>