<script setup lang="ts">
import { BasiqThemeProvider } from "basiq-ui";
import { computed, onMounted } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";

import AppIcon from "@/components/AppIcon.vue";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const route = useRoute();

const isAdmin = computed(
  () =>
    route.path.startsWith("/admin") ||
    route.path.startsWith("/stock") ||
    route.path.startsWith("/flows"),
);
const mobileLabel = computed(() => {
  if (route.path.startsWith("/admin/lectures")) return "講習会管理";
  if (route.path.startsWith("/admin/roadmaps")) return "ロードマップ管理";
  if (isAdmin.value) return "運営";
  if (route.path.startsWith("/roadmaps")) return "ロードマップ";
  if (route.path.startsWith("/profiles")) return "プロフィール";
  if (route.path.startsWith("/lectures") || route.path.startsWith("/sessions")) return "講習会詳細";
  return "講習会アーカイブ";
});

onMounted(() => auth.load());
</script>

<template>
  <BasiqThemeProvider mode="light" class="app-theme">
    <a class="skip-link" href="#main-content">本文へ移動</a>
    <div class="app-shell">
      <aside class="site-sidebar">
        <RouterLink class="site-brand" to="/" aria-label="1-Monthon ホーム">
          <span class="brand-mark">1M</span>
          <span class="brand-copy"><strong>1-Monthon</strong><small>講習会アーカイブ</small></span>
        </RouterLink>

        <nav class="desktop-nav" aria-label="メインナビゲーション">
          <p>学ぶ</p>
          <RouterLink to="/"><AppIcon name="home" /><span>ホーム</span></RouterLink>
          <RouterLink to="/roadmaps"><AppIcon name="map" /><span>ロードマップ</span></RouterLink>
          <RouterLink v-if="auth.user" :to="`/profiles/${auth.user.traqId}`">
            <AppIcon name="user" /><span>プロフィール</span>
          </RouterLink>
        </nav>

        <nav class="desktop-operation" aria-label="運営ナビゲーション">
          <p>運営</p>
          <RouterLink class="operation-link" to="/admin"
            ><AppIcon name="edit" :size="18" /><span>運営向けページ</span></RouterLink
          >
          <RouterLink class="stock-link" to="/stock"
            ><AppIcon name="archive" :size="17" /><span>Flow Stock</span></RouterLink
          >
        </nav>
        <small class="site-version">α · production</small>
      </aside>

      <section class="site-workspace">
        <header class="mobile-header">
          <RouterLink class="mobile-brand" to="/">
            <span class="brand-mark">1M</span><strong>1-Monthon</strong>
          </RouterLink>
          <span>{{ mobileLabel }}</span>
        </header>

        <RouterView v-slot="{ Component }">
          <main id="main-content" tabindex="-1"><component :is="Component" /></main>
        </RouterView>

        <nav class="mobile-nav" aria-label="モバイルナビゲーション">
          <RouterLink to="/"><AppIcon name="home" /><span>ホーム</span></RouterLink>
          <RouterLink to="/roadmaps"><AppIcon name="map" /><span>ロードマップ</span></RouterLink>
          <RouterLink v-if="auth.user" :to="`/profiles/${auth.user.traqId}`">
            <AppIcon name="user" /><span>プロフィール</span>
          </RouterLink>
          <RouterLink to="/admin"><AppIcon name="edit" /><span>運営</span></RouterLink>
        </nav>
      </section>
    </div>
  </BasiqThemeProvider>
</template>
