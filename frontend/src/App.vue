<script setup lang="ts">
import { BasiqSidebarLayout, BasiqThemeProvider } from "basiq-ui";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";

import AppNavigation from "@/components/AppNavigation.vue";
import MobileNavigation from "@/components/MobileNavigation.vue";
import { useAuthStore } from "@/stores/auth";

const desktopMediaQuery = "(min-width: 54rem)";
const auth = useAuthStore();
const route = useRoute();
const isDesktop = ref(false);
const layoutReady = ref(false);
let mediaQuery: MediaQueryList | undefined;

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
  if (route.path === "/lectures") return "講習会を探す";
  if (route.path.startsWith("/lectures") || route.path.startsWith("/sessions")) return "講習会詳細";
  return "ホーム";
});

function syncLayout(matches: boolean) {
  isDesktop.value = matches;
}

function onMediaQueryChange(event: MediaQueryListEvent) {
  syncLayout(event.matches);
}

onMounted(() => {
  void auth.load();
  mediaQuery = window.matchMedia(desktopMediaQuery);
  syncLayout(mediaQuery.matches);
  mediaQuery.addEventListener("change", onMediaQueryChange);
  layoutReady.value = true;
});

onBeforeUnmount(() => mediaQuery?.removeEventListener("change", onMediaQueryChange));
</script>

<template>
  <BasiqThemeProvider mode="light" class="app-theme">
    <a class="skip-link" href="#main-content">本文へ移動</a>
    <BasiqSidebarLayout v-show="isDesktop" class="app-layout desktop-layout">
      <template #sidebar><AppNavigation /></template>
      <div id="desktop-layout-content" class="layout-content"></div>
    </BasiqSidebarLayout>

    <div v-show="!isDesktop" class="app-layout mobile-layout">
      <div id="mobile-layout-content" class="layout-content"></div>
      <MobileNavigation />
    </div>

    <Teleport
      v-if="layoutReady"
      :to="isDesktop ? '#desktop-layout-content' : '#mobile-layout-content'"
    >
      <section class="site-workspace">
        <header class="mobile-header">
          <RouterLink class="mobile-brand" to="/">
            <img class="brand-mark" src="/brand/leqtures.png" alt="" /><strong>stoQ</strong>
          </RouterLink>
          <span>{{ mobileLabel }}</span>
        </header>

        <RouterView v-slot="{ Component }">
          <main id="main-content" tabindex="-1"><component :is="Component" /></main>
        </RouterView>
      </section>
    </Teleport>
  </BasiqThemeProvider>
</template>
