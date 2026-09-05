<script setup lang="ts">
import { BasiqAvatar, BasiqButton, BasiqNavigationItem, BasiqNavigationList } from "basiq-ui";
import { computed } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import AppIcon from "@/components/AppIcon.vue";
import { useAuthStore } from "@/stores/auth";

const emit = defineEmits<{ navigate: [] }>();
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const avatarUrl = computed(() =>
  auth.user ? `https://q.trap.jp/api/v3/public/icon/${encodeURIComponent(auth.user.traqId)}` : "",
);

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
    <RouterLink class="site-brand" to="/" aria-label="stoQ ホーム" @click="notifyNavigation">
      <img class="brand-mark" src="/brand/leqtures.png" alt="" />
      <span class="brand-copy"><strong>stoQ</strong></span>
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
          :current="route.path.startsWith('/lectures')"
          href="/lectures"
          @click="navigate($event, '/lectures')"
        >
          <AppIcon name="search" /><span>講習会を探す</span>
        </BasiqNavigationItem>
        <BasiqNavigationItem
          class="navigation-link"
          :current="route.path.startsWith('/roadmaps')"
          href="/roadmaps"
          @click="navigate($event, '/roadmaps')"
        >
          <AppIcon name="map" /><span>ロードマップ</span>
        </BasiqNavigationItem>
      </BasiqNavigationList>
    </div>

    <div class="desktop-operation">
      <BasiqButton
        class="sidebar-create"
        tone="neutral"
        variant="outline"
        type="button"
        @click="navigate($event, '/admin/lectures/new')"
        ><AppIcon name="plus" :size="18" />講習会を作る</BasiqButton
      >
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
      <RouterLink
        v-if="auth.user"
        class="sidebar-profile"
        :class="{ active: route.path.startsWith('/profiles') }"
        :aria-current="route.path.startsWith('/profiles') ? 'page' : undefined"
        :to="`/profiles/${auth.user.traqId}`"
        @click="notifyNavigation"
      >
        <BasiqAvatar alt="" :name="auth.user.displayName" :src="avatarUrl" :size="32" shape="circle"
          ><template #fallback>{{
            auth.user.displayName.slice(0, 1).toLocaleUpperCase("ja-JP")
          }}</template></BasiqAvatar
        >
        <span
          ><strong>プロフィール</strong
          ><small>{{ auth.user.displayName }} · @{{ auth.user.traqId }}</small></span
        >
      </RouterLink>
    </div>
  </aside>
</template>
