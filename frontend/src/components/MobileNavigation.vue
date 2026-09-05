<script setup lang="ts">
import { BasiqAvatar } from "basiq-ui";
import { computed } from "vue";
import { useRoute } from "vue-router";

import AppIcon from "@/components/AppIcon.vue";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const auth = useAuthStore();
const profilePath = computed(() => (auth.user ? `/profiles/${auth.user.traqId}` : "/"));
const avatarUrl = computed(() =>
  auth.user ? `https://q.trap.jp/api/v3/public/icon/${encodeURIComponent(auth.user.traqId)}` : "",
);
</script>

<template>
  <nav class="mobile-navigation" aria-label="メインナビゲーション">
    <RouterLink to="/" class="mobile-nav-item" :class="{ active: route.path === '/' }">
      <AppIcon name="home" :size="20" /><span>ホーム</span>
    </RouterLink>
    <RouterLink
      to="/lectures"
      class="mobile-nav-item"
      :class="{ active: route.path.startsWith('/lectures') }"
    >
      <AppIcon name="search" :size="20" /><span>探す</span>
    </RouterLink>
    <RouterLink
      to="/roadmaps"
      class="mobile-nav-item"
      :class="{ active: route.path.startsWith('/roadmaps') }"
    >
      <AppIcon name="map" :size="20" /><span>ロードマップ</span>
    </RouterLink>

    <RouterLink
      to="/admin"
      class="mobile-nav-item"
      :class="{
        active: route.path.startsWith('/admin'),
      }"
    >
      <AppIcon name="edit" :size="20" /><span>運営</span>
    </RouterLink>
    <RouterLink
      :to="profilePath"
      class="mobile-nav-item"
      :class="{ active: route.path.startsWith('/profiles') }"
    >
      <BasiqAvatar
        v-if="auth.user"
        alt=""
        :name="auth.user.displayName"
        :src="avatarUrl"
        :size="24"
        shape="circle"
        ><template #fallback>{{
          auth.user.displayName.slice(0, 1).toLocaleUpperCase("ja-JP")
        }}</template></BasiqAvatar
      >
      <AppIcon v-else name="user" :size="20" />
      <span>プロフィール</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.mobile-navigation {
  position: fixed;
  z-index: 50;
  right: 0;
  bottom: 0;
  left: 0;
  min-height: calc(64px + env(safe-area-inset-bottom));
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  padding: 4px 4px env(safe-area-inset-bottom);
  border-top: 1px solid var(--basiq-color-border-separator);
  background: var(--basiq-color-surface-base);
}

.mobile-nav-item {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 2px;
  border-radius: var(--basiq-radius-sm);
  color: var(--basiq-color-content-subtle);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
}

.mobile-nav-item.active {
  font-weight: 700;
  color: var(--basiq-color-content-accent);
}

.mobile-nav-item:focus-visible {
  outline: 2px solid var(--basiq-color-accent-default);
  outline-offset: -2px;
}
</style>
