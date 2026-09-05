<script setup lang="ts">
import { computed, useId } from "vue";

import { buildLectureBadge } from "@/components/badgeDesign";

const props = defineProps<{ lectureName: string; hostGroupNames?: string[]; family?: string }>();
const instanceId = useId();
const svgMarkup = computed(
  () =>
    buildLectureBadge({
      lectureName: props.lectureName,
      hostGroupNames: props.hostGroupNames,
      family: props.family,
      instanceId,
    }).svg,
);
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
