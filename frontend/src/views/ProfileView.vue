<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import { getProfile, type Profile } from "@/api/resources";
import BadgeAlpha from "@/components/BadgeAlpha.vue";
const route = useRoute();
const profile = ref<Profile>();
const activeTab = ref<"badges" | "completions" | "roadmaps">("badges");
const loading = ref(true);
const error = ref("");
async function load() {
  loading.value = true;
  try {
    profile.value = await getProfile(String(route.params.traqId));
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "読み込めませんでした";
  } finally {
    loading.value = false;
  }
}
function selectTab(tab: typeof activeTab.value) {
  activeTab.value = tab;
}
const tabOrder = ["badges", "completions", "roadmaps"] as const;
async function onTabKeydown(event: KeyboardEvent) {
  const currentIndex = tabOrder.indexOf(activeTab.value);
  let nextIndex: number;
  if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabOrder.length;
  else if (event.key === "ArrowLeft")
    nextIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
  else if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = tabOrder.length - 1;
  else return;
  event.preventDefault();
  activeTab.value = tabOrder[nextIndex] || "badges";
  await nextTick();
  document.querySelector<HTMLElement>(`#profile-tab-${activeTab.value}`)?.focus();
}
onMounted(load);
</script>
<template>
  <div class="page">
    <div v-if="loading" class="loading-state">プロフィールを読み込んでいます</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <template v-else-if="profile"
      ><header class="page-heading">
        <div>
          <p class="eyebrow">PROFILE</p>
          <h1>{{ profile.user.displayName }}</h1>
          <p>@{{ profile.user.traqId }} · {{ profile.completions.length }}開催を完了</p>
        </div>
      </header>
      <div class="tabs" role="tablist" aria-label="プロフィール表示">
        <button
          id="profile-tab-badges"
          class="tab"
          role="tab"
          :aria-selected="activeTab === 'badges'"
          aria-controls="profile-panel-badges"
          :tabindex="activeTab === 'badges' ? 0 : -1"
          @keydown="onTabKeydown"
          @click="selectTab('badges')"
        >
          バッジ</button
        ><button
          id="profile-tab-completions"
          class="tab"
          role="tab"
          :aria-selected="activeTab === 'completions'"
          aria-controls="profile-panel-completions"
          :tabindex="activeTab === 'completions' ? 0 : -1"
          @keydown="onTabKeydown"
          @click="selectTab('completions')"
        >
          完了した開催</button
        ><button
          id="profile-tab-roadmaps"
          class="tab"
          role="tab"
          :aria-selected="activeTab === 'roadmaps'"
          aria-controls="profile-panel-roadmaps"
          :tabindex="activeTab === 'roadmaps' ? 0 : -1"
          @keydown="onTabKeydown"
          @click="selectTab('roadmaps')"
        >
          ロードマップ
        </button>
      </div>
      <section
        id="profile-panel-badges"
        v-if="activeTab === 'badges'"
        role="tabpanel"
        aria-labelledby="profile-tab-badges"
      >
        <div v-if="profile.badges.length" class="badge-grid">
          <RouterLink
            v-for="badge in profile.badges"
            :key="badge.lectureId"
            class="surface badge-card"
            :to="`/lectures/${badge.lectureId}`"
            ><BadgeAlpha :lecture-id="badge.lectureId" :lecture-name="badge.lectureName" />
            <h3>{{ badge.lectureName }}</h3>
            <p>
              {{ badge.academicYearStart }}年度 ·
              {{ new Date(badge.earnedAt).toLocaleDateString("ja-JP") }}獲得
            </p></RouterLink
          >
        </div>
        <div v-else class="empty-state">
          通常開催をすべて完了すると、講習会バッジが表示されます。
        </div>
      </section>
      <section
        id="profile-panel-completions"
        v-else-if="activeTab === 'completions'"
        role="tabpanel"
        aria-labelledby="profile-tab-completions"
        class="surface panel"
      >
        <div v-if="profile.completions.length" class="editor-list">
          <div
            v-for="completion in profile.completions"
            :key="completion.sessionId"
            class="editor-row"
          >
            <span
              ><strong>開催の完了記録</strong>
              <p>{{ new Date(completion.completedAt).toLocaleString("ja-JP") }}</p></span
            ><RouterLink :to="`/sessions/${completion.sessionId}`">開催を見る</RouterLink>
          </div>
        </div>
        <p v-else>完了した開催はありません。</p>
      </section>
      <section
        id="profile-panel-roadmaps"
        v-else
        role="tabpanel"
        aria-labelledby="profile-tab-roadmaps"
      >
        <div class="card-grid">
          <RouterLink
            v-for="roadmap in profile.roadmaps"
            :key="roadmap.id"
            class="roadmap-card"
            :to="`/roadmaps/${roadmap.id}`"
            ><div class="card-meta">
              <span class="pill">{{ roadmap.progressPercent }}%</span>
            </div>
            <h2>{{ roadmap.title }}</h2>
            <div class="progress-track">
              <span :style="{ width: `${roadmap.progressPercent}%` }"></span></div
          ></RouterLink>
        </div></section
    ></template>
  </div>
</template>
