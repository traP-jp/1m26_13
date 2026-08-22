<script setup lang="ts">
import { onMounted, ref } from "vue";

import { getHealth } from "@/api/health";

const backendStatus = ref("確認中");

onMounted(async () => {
  try {
    const health = await getHealth();
    backendStatus.value = health.status === "ok" ? "接続済み" : "異常";
  } catch {
    backendStatus.value = "未接続";
  }
});
</script>

<template>
  <main :class="$style.root">
    <h1>1m26_13</h1>
    <p>開発環境の準備ができました。</p>
    <p>バックエンド: {{ backendStatus }}</p>
  </main>
</template>

<style module>
.root {
  box-sizing: border-box;
  width: min(100%, 64rem);
  margin-inline: auto;
  padding: 2rem;
}
</style>
