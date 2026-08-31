<!-- src/components/BadgeCard.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Lecture } from '../types/lecture'
import BadgeSvg from './BadgeSvg.vue'

const props = defineProps<{
  lecture: Lecture
}>()

const isFlipped = ref(false)
const copied = ref(false)

// lecture.url があればそれを優先して読み込む
const detailUrl = computed(() => {
  return props.lecture.url || `${window.location.origin}/lectures/${props.lecture.id}`
})

const shareText = computed(() => {
  return `${props.lecture.title}を受講し終わりました！\n${detailUrl.value}`
})

const toggleFlip = () => {
  isFlipped.value = !isFlipped.value
  copied.value = false
}

const copyToClipboard = async (event: MouseEvent) => {
  event.stopPropagation()
  try {
    await navigator.clipboard.writeText(shareText.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy: ', err)
  }
}
</script>

<template>
  <div class="badge-card" :class="{ 'is-flipped': isFlipped }" @click="toggleFlip">
    <!-- 表面：バッジ表示 -->
    <div v-if="!isFlipped" class="card-front">
      <BadgeSvg :lecture="lecture" />
      <p class="badge-title">{{ lecture.title }}</p>
      <span class="badge-date">{{ lecture.completedAt || '獲得済み' }}</span>
      <span class="share-hint">クリックで共有</span>
    </div>

    <!-- 裏面：共有リンク表示 -->
    <div v-else class="card-back">
      <p class="share-label">＼ 共有文面 ／</p>
      <div class="share-preview">
        <p class="share-text">{{ shareText }}</p>
      </div>
      <button 
        class="copy-btn" 
        :class="{ 'is-copied': copied }"
        @click="copyToClipboard"
      >
        {{ copied ? 'コピー完了！' : 'コピー' }}
      </button>
      <span class="back-hint">クリックで戻る</span>
    </div>
  </div>
</template>

<style scoped>
.badge-card {
  width: 190px;
  height: 250px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px 12px;
  background-color: #ffffff;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.25s ease;
  user-select: none;
  box-sizing: border-box;
}

.badge-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(37, 99, 235, 0.12);
  border-color: #93c5fd;
}

.card-front {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.badge-title {
  font-size: 0.88rem;
  font-weight: bold;
  color: #1e293b;
  margin: 8px 0 4px;
  line-height: 1.3;
  text-align: center;
}

.badge-date {
  font-size: 0.78rem;
  color: #64748b;
}

.share-hint {
  font-size: 0.7rem;
  color: #3b82f6;
  opacity: 0.85;
}

.card-back {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  background-color: #f8fafc;
  border-radius: 12px;
  padding: 8px;
  box-sizing: border-box;
}

.share-label {
  font-size: 0.75rem;
  font-weight: bold;
  color: #3b82f6;
  margin: 0;
}

.share-preview {
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 8px;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.share-text {
  font-size: 0.72rem;
  color: #334155;
  word-break: break-all;
  white-space: pre-wrap;
  margin: 0;
  line-height: 1.35;
  text-align: left;
}

.copy-btn {
  width: 100%;
  padding: 6px 0;
  background-color: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.copy-btn:hover {
  background-color: #1d4ed8;
}

.copy-btn.is-copied {
  background-color: #16a34a;
}

.back-hint {
  font-size: 0.68rem;
  color: #94a3b8;
}
</style>