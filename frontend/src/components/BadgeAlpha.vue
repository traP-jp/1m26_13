<script setup lang="ts">
import { computed } from "vue";

import { buildBadgeSvg } from "@/components/badgeGenerator";

const props = defineProps<{ lectureId: string; lectureName: string }>();
const svgMarkup = computed(() => buildBadgeSvg(`badge-alpha-v1:${props.lectureId}`));
</script>

<template>
  <span
    class="badge-alpha"
    role="img"
    :aria-label="`${lectureName}の講習会バッジ`"
    v-html="svgMarkup"
  ></span>
</template>

<style scoped>
.badge-alpha {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

.badge-alpha :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
