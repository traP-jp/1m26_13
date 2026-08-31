<script setup lang="ts">
import { computed } from 'vue'
import type { Lecture } from '../types/lecture.ts'

const props = defineProps<{
  lecture: Lecture
}>()

// 各班・カテゴリに対応するスタンプのUUIDマップ
// ※取得した実際のUUIDに置き換えてください
const STAMP_UUID_MAP: Record<string, string> = {
  algorithm: '2b8c9c89-9431-4a77-8d42-efddddce3ac7', // 例: 取得したUUIDを入れる
  ctf: '4002072f-1f15-4a38-9317-70e1e6760274',
  game: 'bb6d4344-b8a4-4ced-a2cf-b8791cefd7cb',
  graphics: '611f5e84-0842-4c95-ae7f-462552711784',
  kaggle: '1db60ebd-d191-4642-9fb8-8e8d7f239b34',
  sound: '9d5b48a7-a556-48ae-889e-67fea4ad3312',
  sysad: 'b9f3ffbe-a79d-4aaa-8cd1-aeaf0d9eaa22'
}

// カテゴリに対応する UUID を取得
const stampId = computed(() => {
  const cat = props.lecture.category.toLowerCase()
  if (cat.includes('algorithm') || cat.includes('アルゴリズム')) return STAMP_UUID_MAP.algorithm
  if (cat.includes('ctf')) return STAMP_UUID_MAP.ctf
  if (cat.includes('game') || cat.includes('ゲーム')) return STAMP_UUID_MAP.game
  if (cat.includes('graphics') || cat.includes('グラフィックス')) return STAMP_UUID_MAP.graphics
  if (cat.includes('kaggle')) return STAMP_UUID_MAP.kaggle
  if (cat.includes('sound') || cat.includes('サウンド')) return STAMP_UUID_MAP.sound
  if (cat.includes('sysad')) return STAMP_UUID_MAP.sysad
  return null
})

// image-proxy または traQ パブリックAPI
const stampUrl = computed(() => {
  if (!stampId.value || stampId.value.startsWith('YOUR_')) return null
  return `https://image-proxy.trap.jp/stamp/${stampId.value}?width=64&height=64&format=webp`
  // 直接取得の場合は以下:
  //return `https://q.trap.jp/api/1.0/public/emoji/${stampId.value}`
})
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 140 140"
    class="badge-svg"
  >
    <defs>
      <linearGradient id="badgeBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#eff6ff" />
      </linearGradient>
      <linearGradient id="bannerBg" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#2563eb" />
        <stop offset="100%" stop-color="#1d4ed8" />
      </linearGradient>
    </defs>

    <!-- 外枠＆背景 -->
    <circle cx="70" cy="70" r="66" fill="url(#badgeBg)" stroke="#3b82f6" stroke-width="4" />
    <circle cx="70" cy="70" r="61" fill="none" stroke="#93c5fd" stroke-width="1.5" />

    <!-- 上部：年度バナー -->
    <rect x="35" y="18" width="70" height="20" rx="10" fill="url(#bannerBg)" />
    <text x="70" y="32" fill="#ffffff" font-size="11" font-weight="bold" text-anchor="middle">
      {{ lecture.academicYear }}
    </text>

    <!-- 中央：スタンプ画像（UUID未設定・取得失敗時はテキスト） -->
    <g transform="translate(70, 75)">
      <image
        v-if="stampUrl"
        :href="stampUrl"
        x="-28"
        y="-28"
        width="56"
        height="56"
      />
      <circle v-else cx="0" cy="0" r="26" fill="#ffffff" stroke="#93c5fd" stroke-width="2" />
      <text
        v-if="!stampUrl"
        x="0"
        y="4"
        fill="#1e40af"
        font-size="12"
        font-weight="bold"
        text-anchor="middle"
      >
        {{ lecture.category }}
      </text>
    </g>
  </svg>
</template>

<style scoped>
.badge-svg {
  width: 120px;
  height: 120px;
  filter: drop-shadow(0 4px 6px rgba(37, 99, 235, 0.15));
  transition: transform 0.2s ease;
}
.badge-svg:hover {
  transform: translateY(-2px) scale(1.04);
}
</style>