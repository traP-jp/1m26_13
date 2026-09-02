<template>
  <div class="tabs-container">
    <button
      :class="['tab-btn', { active: activeTab === 'lectures' }]"
      @click="$emit('update:activeTab', 'lectures')"
    >
      講習会 ({{ lectureCount }})
    </button>
    <button
      :class="['tab-btn', { active: activeTab === 'roadmaps' }]"
      @click="$emit('update:activeTab', 'roadmaps')"
    >
      ロードマップ ({{ roadmapCount }})
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  activeTab: 'lectures' | 'roadmaps';
  lectureCount: number;
  roadmapCount: number;
}>();

defineEmits(['update:activeTab']);
</script>

<style scoped>
.tabs-container {
  display: flex;
  border-bottom: 1px solid #383838;
  margin: 20px 0;
}

.tab-btn {
  background: none;
  border: none;
  color: #aaa;
  padding: 10px 20px;
  font-size: 15px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tab-btn.active {
  color: #fff;
  font-weight: bold;
  border-bottom-color: #fff;
}
</style>