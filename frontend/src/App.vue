<script setup lang="ts">
import { BasiqThemeProvider } from "basiq-ui";
import { onMounted } from "vue";
import { RouterLink, RouterView } from "vue-router";

import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
onMounted(() => auth.load());
</script>

<template>
  <BasiqThemeProvider mode="light">
    <a class="skip-link" href="#main-content">本文へ移動</a>
    <div class="app-shell">
      <header class="topbar">
        <RouterLink class="brand" to="/" aria-label="1-Monthon ホーム">
          <span class="brand-mark">1M</span>
          <span><strong>1-Monthon</strong><small>講習会を、次の人の資産に</small></span>
        </RouterLink>
        <nav class="main-nav" aria-label="メインナビゲーション">
          <RouterLink to="/">探す</RouterLink>
          <RouterLink to="/roadmaps">ロードマップ</RouterLink>
          <RouterLink to="/stock">Flow Stock</RouterLink>
          <RouterLink to="/admin">運営</RouterLink>
          <RouterLink v-if="auth.user" :to="`/profiles/${auth.user.traqId}`">{{
            auth.user.displayName
          }}</RouterLink>
        </nav>
      </header>
      <RouterView v-slot="{ Component }">
        <main id="main-content" tabindex="-1"><component :is="Component" /></main>
      </RouterView>
      <footer><span>1-Monthon</span><span>traP内講習会アーカイブ</span></footer>
    </div>
  </BasiqThemeProvider>
</template>
