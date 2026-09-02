<template>
  <div class="search-bar-container">
    <div class="search-input-wrapper">
      <input
        type="text"
        v-model="keywordModel"
        placeholder="講習会タイトル、説明、講師名で検索..."
        @keyup.enter="emitSearch"
      />
      <button class="search-btn" @click="emitSearch" title="検索">
        🔍
      </button>
    </div>

    <!-- 逆三角形（▼）の高度な検索ボタン -->
    <button class="advanced-filter-btn" @click="$emit('open-modal')" title="高度な検索フィルタ">
      ▼
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits(['update:modelValue', 'search', 'open-modal']);

const keywordModel = computed({
  get: () => props.modelValue,
  set: (val: string) => emit('update:modelValue', val)
});

const emitSearch = () => {
  emit('search');
};
</script>

<style scoped>
.search-bar-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
}

.search-input-wrapper {
  display: flex;
  flex: 1;
  border: 1px solid #383838;
  border-radius: 40px;
  overflow: hidden;
  background-color: #121212;
}

.search-input-wrapper input {
  flex: 1;
  background: transparent;
  border: none;
  padding: 10px 18px;
  color: #fff;
  font-size: 15px;
  outline: none;
}

.search-btn {
  background-color: #222;
  border: none;
  border-left: 1px solid #383838;
  padding: 0 20px;
  cursor: pointer;
  color: #aaa;
  font-size: 16px;
  transition: background 0.2s;
}

.search-btn:hover {
  background-color: #333;
}

.advanced-filter-btn {
  background-color: #272727;
  border: 1px solid #3d3d3d;
  color: #aaa;
  border-radius: 50%;
  width: 42px;
  height: 42px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s;
}

.advanced-filter-btn:hover {
  background-color: #3f3f3f;
  color: #fff;
}
</style>