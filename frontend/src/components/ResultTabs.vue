<template>
  <div class="tabs-container">
    <button
      :class="['tab-btn', { active: activeTab === 'lectures' }]"
      @click="$emit('update:activeTab', 'lectures')"
    >
      講習会
      <span class="count-badge">{{ lectureCount }}</span>
    </button>

    <button
      :class="['tab-btn', { active: activeTab === 'roadmaps' }]"
      @click="$emit('update:activeTab', 'roadmaps')"
    >
      ロードマップ
      <span class="count-badge">{{ roadmapCount }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  activeTab: "lectures" | "roadmaps";
  lectureCount: number;
  roadmapCount: number;
}>();

defineEmits(["update:activeTab"]);
</script>

<style scoped>
.tabs-container {
  display: flex;
  gap: 12px;
  border-bottom: 2px solid #e0e0e0;
  margin-bottom: 20px;
  padding-bottom: 4px;
}

.tab-btn {
  background: none;
  border: none;
  padding: 10px 16px;
  font-size: 15px;
  font-weight: bold;

  /* 白背景でも可視性を担保する濃いグレー */
  color: #555555;

  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 3px solid transparent;
  transition: all 0.2s ease;
  margin-bottom: -6px;
}

.tab-btn:hover {
  color: #0066cc;
}

/* アクティブ時のスタイル */
.tab-btn.active {
  color: #0066cc;
  border-bottom-color: #0066cc;
}

/* 件数バッジの可視性調整 */
.count-badge {
  background-color: #e8e8e8;
  color: #333333;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: normal;
}

.tab-btn.active .count-badge {
  background-color: #e3f2fd;
  color: #0066cc;
  font-weight: bold;
}
</style>