<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ lectureId: string; lectureName: string }>();
const palettes = [
  ["#ef4444", "#fca5a5", "#ffffff"],
  ["#3b82f6", "#93c5fd", "#f59e0b"],
  ["#10b981", "#6ee7b7", "#ffffff"],
  ["#f59e0b", "#fde68a", "#ef4444"],
  ["#8b5cf6", "#c4b5fd", "#06b6d4"],
  ["#06b6d4", "#a5f3fc", "#f43f5e"],
  ["#ff5722", "#ffcc80", "#ffffff"],
  ["#f8fafc", "#64748b", "#38bdf8"],
];
function cyrb53(value: string, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let index = 0, character; index < value.length; index++) {
    character = value.charCodeAt(index);
    h1 = Math.imul(h1 ^ character, 2654435761);
    h2 = Math.imul(h2 ^ character, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
const model = computed(() => {
  const hash = cyrb53(`badge-alpha-v1:${props.lectureId}`);
  return {
    palette: palettes[hash % palettes.length]!,
    composition: hash % 6,
    symmetry: [3, 4, 6, 8][Math.floor(hash / 7) % 4]!,
  };
});
</script>

<template>
  <svg viewBox="0 0 360 360" role="img" :aria-label="`${lectureName}の講習会バッジ`">
    <circle cx="180" cy="180" r="166" fill="#172338" />
    <circle cx="180" cy="180" r="146" :fill="model.palette[0]" stroke="#0b1324" stroke-width="10" />
    <g v-if="model.composition === 0">
      <g
        v-for="index in model.symmetry"
        :key="index"
        :transform="`rotate(${(360 / model.symmetry) * index} 180 180)`"
      >
        <path
          d="M164 44h32l20 92-36 28-36-28z"
          :fill="model.palette[1]"
          stroke="#172338"
          stroke-width="8"
        />
      </g>
    </g>
    <g v-else-if="model.composition === 1">
      <path
        d="M180 52 294 137 251 276H109L66 137z"
        :fill="model.palette[1]"
        stroke="#172338"
        stroke-width="12"
      />
      <path d="m180 92 69 50-26 84h-86l-26-84z" :fill="model.palette[0]" />
    </g>
    <g v-else-if="model.composition === 2">
      <g v-for="index in 4" :key="index" :transform="`rotate(${index * 90} 180 180)`">
        <path
          d="M78 80h112v48h-60v82H78z"
          :fill="index % 2 ? model.palette[1] : model.palette[0]"
          stroke="#172338"
          stroke-width="8"
        />
      </g>
    </g>
    <g v-else-if="model.composition === 3">
      <g
        v-for="index in model.symmetry"
        :key="index"
        :transform="`rotate(${(360 / model.symmetry) * index} 180 180)`"
      >
        <path
          d="m180 48 42 80-42 31-42-31z"
          :fill="index % 2 ? model.palette[1] : model.palette[0]"
          stroke="#172338"
          stroke-width="8"
        />
      </g>
    </g>
    <g v-else-if="model.composition === 4">
      <g v-for="row in 3" :key="row">
        <rect
          v-for="column in 3"
          :key="column"
          :x="78 + (column - 1) * 70"
          :y="78 + (row - 1) * 70"
          width="64"
          height="64"
          :fill="(row + column) % 2 ? model.palette[1] : model.palette[0]"
          stroke="#172338"
          stroke-width="7"
        />
      </g>
    </g>
    <g v-else>
      <path
        d="M180 48 302 180 180 312 58 180z"
        :fill="model.palette[1]"
        stroke="#172338"
        stroke-width="12"
      />
      <path
        d="M180 88 260 180 180 272 100 180z"
        :fill="model.palette[0]"
        stroke="#172338"
        stroke-width="8"
      />
    </g>
    <g class="badge-accent">
      <path
        d="M180 102 222 180 180 258 138 180z"
        :fill="model.palette[2]"
        stroke="#172338"
        stroke-width="9"
      />
    </g>
    <circle cx="180" cy="180" r="24" fill="#172338" />
    <circle cx="180" cy="180" r="10" :fill="model.palette[2]" />
  </svg>
</template>

<style scoped>
.badge-accent {
  transform-origin: 180px 180px;
  animation: reverse-spin 40s linear infinite;
}

@keyframes reverse-spin {
  to {
    transform: rotate(-360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .badge-accent {
    animation: none;
  }
}
</style>
