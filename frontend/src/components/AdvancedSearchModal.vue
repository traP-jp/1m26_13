<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>検索フィルタ</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="filter-grid">
        <!-- 班カテゴリ -->
        <div class="filter-column">
          <h3>対象の班</h3>
          <button
            v-for="team in teams"
            :key="team"
            :class="{ active: filter.team === team }"
            @click="selectTeam(team)"
          >
            {{ team }}
          </button>
        </div>

        <!-- 年度 -->
        <div class="filter-column">
          <h3>年度</h3>
          <button
            v-for="y in years"
            :key="y"
            :class="{ active: filter.year === y }"
            @click="selectYear(y)"
          >
            {{ y }}年度
          </button>
        </div>

        <!-- 形式 -->
        <div class="filter-column">
          <h3>開催形式</h3>
          <button
            v-for="fmt in formats"
            :key="fmt"
            :class="{ active: filter.format === fmt }"
            @click="selectFormat(fmt)"
          >
            {{ fmt }}
          </button>
        </div>

        <!-- 講師・日付範囲 -->
        <div class="filter-column wide">
          <h3>講師名 (traQ ID)</h3>
          <input
            type="text"
            v-model="filter.instructor"
            placeholder="例: METCH722"
            class="input-field"
          />

          <h3 style="margin-top: 16px;">開催期間</h3>
          <div class="date-range">
            <input type="date" v-model="filter.startDate" class="input-field" />
            <span>〜</span>
            <input type="date" v-model="filter.endDate" class="input-field" />
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="reset-btn" @click="$emit('reset')">条件をクリア</button>
        <button class="apply-btn" @click="$emit('close')">適用して検索</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SearchFilter, Team, LectureFormat } from '@/types/lecture';

const props = defineProps<{
  isOpen: boolean;
  filter: SearchFilter;
}>();

defineEmits(['close', 'reset']);

const teams: Team[] = ['SysAd', 'Game', 'CTF', 'Algorithm', 'Kaggle', 'Graphics', 'Sound', '融合系'];
const years = [2026, 2025, 2024];
const formats: LectureFormat[] = ['対面', 'オンライン', 'ハイブリッド', 'アーカイブ/動画'];

const selectTeam = (team: Team) => {
  props.filter.team = props.filter.team === team ? '' : team;
};

const selectYear = (year: number) => {
  props.filter.year = props.filter.year === year ? null : year;
};

const selectFormat = (fmt: LectureFormat) => {
  props.filter.format = props.filter.format === fmt ? '' : fmt;
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: #212121;
  color: #fff;
  width: 90%;
  max-width: 800px;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #383838;
  padding-bottom: 12px;

  h2 {
    font-size: 18px;
    margin: 0;
  }
}

.close-btn {
  background: none;
  border: none;
  color: #aaa;
  font-size: 20px;
  cursor: pointer;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.filter-column {
  h3 {
    font-size: 14px;
    color: #aaa;
    margin-bottom: 10px;
  }

  button {
    display: block;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    color: #ddd;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    margin-bottom: 2px;
  }

  button.active {
    background-color: #383838;
    color: #fff;
    font-weight: bold;
  }

  button:hover {
    background-color: #2d2d2d;
  }
}

.input-field {
  width: 100%;
  background-color: #121212;
  border: 1px solid #383838;
  color: #fff;
  padding: 8px;
  border-radius: 4px;
  font-size: 13px;
  box-sizing: border-box;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 6px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid #383838;
  padding-top: 16px;
}

.reset-btn {
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
}

.apply-btn {
  background-color: #3ea6ff;
  color: #0f0f0f;
  border: none;
  padding: 8px 16px;
  border-radius: 18px;
  font-weight: bold;
  cursor: pointer;
}
</style>