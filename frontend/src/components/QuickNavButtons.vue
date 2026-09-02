<template>
  <div class="quick-nav-container">
    <div class="dropdown">
      <button class="nav-btn">班から探す ▾</button>
      <div class="dropdown-menu">
        <a
          v-for="team in teams"
          :key="team"
          @click.prevent="$emit('select-team', team)"
        >
          {{ team }}
        </a>
      </div>
    </div>

    <div class="dropdown">
      <button class="nav-btn">年度から探す ▾</button>
      <div class="dropdown-menu">
        <a
          v-for="year in years"
          :key="year"
          @click.prevent="$emit('select-year', year)"
        >
          {{ year }}年度
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Team } from '@/types/lecture';

defineEmits(['select-team', 'select-year']);

const teams: Team[] = ['SysAd', 'Game', 'CTF', 'Algorithm', 'Kaggle', 'Graphics', 'Sound'];
const years = [2026, 2025, 2024];
</script>

<style scoped>
.quick-nav-container {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 12px;
}

.dropdown {
  position: relative;
}

.nav-btn {
  background-color: #272727;
  color: #f1f1f1;
  border: none;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.nav-btn:hover {
  background-color: #3f3f3f;
}

.dropdown-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  background-color: #282828;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  overflow: hidden;
  z-index: 100;
  min-width: 120px;
}

.dropdown:hover .dropdown-menu {
  display: block;
}

.dropdown-menu a {
  display: block;
  padding: 8px 12px;
  color: #eee;
  text-decoration: none;
  font-size: 13px;
  cursor: pointer;
}

.dropdown-menu a:hover {
  background-color: #3e3e3e;
}
</style>