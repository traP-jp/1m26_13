<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <main :class="$style.root">
    <h1>ページが見つかりません</h1>
    <RouterLink to="/">トップへ戻る</RouterLink>
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
