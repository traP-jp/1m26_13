<template>
  <div class="quick-nav-container">
    <!-- 班から探す -->
    <div class="select-group">
      <label class="select-label">班</label>
      <select :value="filter.team" @change="onTeamChange" class="custom-select">
        <option value="">すべて</option>

        <option v-for="team in teams" :key="team" :value="team">
          {{ team }}
        </option>
      </select>
    </div>

    <!-- 年度から探す -->
    <div class="select-group">
      <label class="select-label">年度</label>

      <select
        :value="filter.year || ''"
        @change="onYearChange"
        class="custom-select"
      >
        <option value="">すべて</option>

        <option v-for="year in years" :key="year" :value="year">
          {{ year }}年度
        </option>
      </select>
    </div>

    <!-- 条件をクリアボタン -->
    <button class="clear-btn" @click="$emit('reset')">条件をクリア</button>
  </div>
</template>

<script setup lang="ts">
import type { SearchFilter, Team } from "@/types/lecture";

const props = defineProps<{
  filter: SearchFilter;
}>();

const emit = defineEmits(["update:filter", "reset"]);

const teams: Team[] = [
  "SysAd",
  "Game",
  "CTF",
  "Algorithm",
  "Kaggle",
  "Graphics",
  "Sound",
  "融合系",
];
const years = [2026, 2025, 2024];

const onTeamChange = (e: Event) => {
  const val = (e.target as HTMLSelectElement).value as Team | "";
  props.filter.team = val;
};

const onYearChange = (e: Event) => {
  const val = (e.target as HTMLSelectElement).value;
  props.filter.year = val ? Number(val) : null;
};
</script>

<style scoped>
.quick-nav-container {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.select-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 160px;
}

.select-label {
  font-size: 14px;
  font-weight: bold;
  color: #eee;
}

.custom-select {
  background-color: #f8f9fa;
  color: #121212;
  border: 1px solid #717d8a;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  outline: none;
  cursor: pointer;
  appearance: auto;
}

.custom-select:focus {
  border-color: #3ea6ff;
  box-shadow: 0 0 0 2px rgba(62, 166, 255, 0.2);
}

.custom-select option {
  background-color: #ffffff;
  color: #121212;
}

.clear-btn {
  background-color: #272727;
  color: #f1f1f1;
  border: 1px solid #444;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  height: 38px;
  transition: background 0.2s;
}

.clear-btn:hover {
  background-color: #3f3f3f;
  color: #fff;
}
</style>