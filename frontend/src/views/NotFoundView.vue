<script setup lang="ts">
import { BasiqButton, BasiqCard } from "basiq-ui";
import { useRouter } from "vue-router";
const router = useRouter();
</script>
<template>
  <div class="page not-found">
    <BasiqCard class="not-found-card"
      ><p class="eyebrow">404</p>
      <h1>ページが見つかりません</h1>
      <p>URLを確認するか、ホームから探してください。</p>
      <BasiqButton @click="router.push('/')">ホームへ戻る</BasiqButton></BasiqCard
    >
  </div>
</template>
<style scoped>
.not-found {
  min-height: 70vh;
  display: grid;
  place-items: center;
}

.not-found-card {
  width: min(520px, 100%);
  display: grid;
  gap: 15px;
  border: 1px solid var(--basiq-color-border-separator);
  text-align: center;
}

.not-found-card h1 {
  font-size: 24px;
}

.not-found-card p:not(.eyebrow) {
  color: var(--basiq-color-content-subtle);
}

.not-found-card button {
  justify-self: center;
}
</style>
