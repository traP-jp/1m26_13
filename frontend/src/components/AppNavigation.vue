<script setup lang="ts">
import { BasiqNavigationItem, BasiqNavigationList } from "basiq-ui";
import { RouterLink, useRoute, useRouter } from "vue-router";

import AppIcon from "@/components/AppIcon.vue";
import { useAuthStore } from "@/stores/auth";

const emit = defineEmits<{ navigate: [] }>();
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

function notifyNavigation(event: MouseEvent) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  emit("navigate");
}

function navigate(event: MouseEvent, to: string) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  void router.push(to);
  emit("navigate");
}
</script>

<template>
  <aside class="site-sidebar" aria-label="サイトナビゲーション">
    <RouterLink class="site-brand" to="/" aria-label="leQtures ホーム" @click="notifyNavigation">
      <span class="brand-mark">leQ</span>
      <span class="brand-copy"><strong>leQtures</strong></span>
    </RouterLink>

    <div class="desktop-nav">
      <p>学ぶ</p>
      <BasiqNavigationList aria-label="学ぶ">
        <BasiqNavigationItem
          class="navigation-link"
          :current="route.path === '/'"
          href="/"
          @click="navigate($event, '/')"
        >
          <AppIcon name="home" /><span>ホーム</span>
        </BasiqNavigationItem>
        <BasiqNavigationItem
          class="navigation-link"
          :current="route.path.startsWith('/roadmaps')"
          href="/roadmaps"
          @click="navigate($event, '/roadmaps')"
        >
          <AppIcon name="map" /><span>ロードマップ</span>
        </BasiqNavigationItem>
        <BasiqNavigationItem
          v-if="auth.user"
          class="navigation-link"
          :current="route.path.startsWith('/profiles')"
          :href="`/profiles/${auth.user.traqId}`"
          @click="navigate($event, `/profiles/${auth.user?.traqId}`)"
        >
          <AppIcon name="user" /><span>プロフィール</span>
        </BasiqNavigationItem>
      </BasiqNavigationList>
    </div>

    <div class="desktop-operation">
      <p>運営</p>
      <BasiqNavigationList aria-label="運営">
        <BasiqNavigationItem
          class="navigation-link"
          :current="route.path.startsWith('/admin')"
          href="/admin"
          @click="navigate($event, '/admin')"
        >
          <AppIcon name="edit" :size="18" /><span>運営向けページ</span>
        </BasiqNavigationItem>
        <BasiqNavigationItem
          class="navigation-link"
          :current="route.path.startsWith('/stock') || route.path.startsWith('/flows')"
          href="/stock"
          @click="navigate($event, '/stock')"
        >
          <AppIcon name="archive" :size="17" /><span>Flow Stock</span>
        </BasiqNavigationItem>
      </BasiqNavigationList>
    </div>
  </aside>
</template>
