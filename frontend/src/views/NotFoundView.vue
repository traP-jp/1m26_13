<script setup lang="ts">
import { BasiqButton } from "basiq-ui";
import { useRouter } from "vue-router";
const router = useRouter();
</script>
<template>
  <div class="page not-found">
    <section class="not-found-card">
      <h1>ページが見つかりません</h1>
      <p>URLを確認するか、ホームから探してください。</p>
      <BasiqButton @click="router.push('/')">ホームへ戻る</BasiqButton>
    </section>
  </div>
</template>
<style scoped>
.not-found {
  width: min(720px, 100%);
}

.not-found-card {
  width: min(520px, 100%);
  display: grid;
  gap: 15px;
  padding-block: 24px;
  border-block: 1px solid var(--basiq-color-border-separator);
}

.not-found-card h1 {
  font-size: 24px;
}

.not-found-card p {
  color: var(--basiq-color-content-subtle);
}

.not-found-card button {
  justify-self: start;
}
</style>
