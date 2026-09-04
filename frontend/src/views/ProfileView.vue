<script setup lang="ts">
import { BasiqCard, BasiqTabs } from "basiq-ui";
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import { getProfile, type Profile } from "@/api/resources";
import BadgeAlpha from "@/components/BadgeAlpha.vue";

const route = useRoute();
const profile = ref<Profile>();
const activeTab = ref("badges");
const tabs = [
  { label: "バッジ", value: "badges" },
  { label: "完了した開催", value: "completions" },
  { label: "ロードマップ", value: "roadmaps" },
];
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
onMounted(load);
</script>

<template>
  <div class="page profile-page">
    <div v-if="loading" class="loading-state">プロフィールを読み込んでいます</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <template v-else-if="profile">
      <div class="breadcrumb">
        <RouterLink to="/">ホーム</RouterLink><b>/</b><span>プロフィール</span>
      </div>
      <header class="profile-header">
        <div class="avatar">{{ profile.user.displayName.slice(0, 1) }}</div>
        <div>
          <p class="eyebrow">PROFILE</p>
          <h1>{{ profile.user.displayName }}</h1>
          <p>@{{ profile.user.traqId }} · {{ profile.completions.length }}開催を完了</p>
        </div>
      </header>
      <BasiqTabs v-model="activeTab" class="profile-tabs" :items="tabs" list-width="100%">
        <template #content="{ item }">
          <section v-if="item.value === 'badges'" class="tab-panel">
            <div v-if="profile.badges.length" class="badge-grid">
              <RouterLink
                v-for="badge in profile.badges"
                :key="badge.lectureId"
                :to="`/lectures/${badge.lectureId}`"
              >
                <BasiqCard class="badge-card"
                  ><BadgeAlpha :lecture-id="badge.lectureId" :lecture-name="badge.lectureName" />
                  <div>
                    <h2>{{ badge.lectureName }}</h2>
                    <p>
                      {{ badge.academicYearStart }}年度 ·
                      {{ new Date(badge.earnedAt).toLocaleDateString("ja-JP") }}獲得
                    </p>
                  </div></BasiqCard
                >
              </RouterLink>
            </div>
            <div v-else class="empty-state">
              通常開催をすべて完了すると、講習会バッジが表示されます。
            </div>
          </section>
          <section v-else-if="item.value === 'completions'" class="tab-panel">
            <BasiqCard class="list-card">
              <div v-if="profile.completions.length" class="record-list">
                <RouterLink
                  v-for="completion in profile.completions"
                  :key="completion.sessionId"
                  :to="`/sessions/${completion.sessionId}`"
                  ><span
                    ><strong>開催の完了記録</strong
                    ><small>{{
                      new Date(completion.completedAt).toLocaleString("ja-JP")
                    }}</small></span
                  ><b>開催を見る →</b></RouterLink
                >
              </div>
              <p v-else class="empty-copy">完了した開催はありません。</p>
            </BasiqCard>
          </section>
          <section v-else class="tab-panel">
            <div v-if="profile.roadmaps.length" class="roadmap-grid">
              <RouterLink
                v-for="roadmap in profile.roadmaps"
                :key="roadmap.id"
                :to="`/roadmaps/${roadmap.id}`"
                ><BasiqCard class="roadmap-card"
                  ><template #header
                    ><span class="pill">{{ roadmap.progressPercent }}%</span></template
                  >
                  <h2>{{ roadmap.title }}</h2>
                  <div class="progress">
                    <span :style="{ width: `${roadmap.progressPercent}%` }"></span>
                  </div>
                  <p>
                    {{ roadmap.completedItemCount }}/{{ roadmap.totalItemCount }}完了
                  </p></BasiqCard
                ></RouterLink
              >
            </div>
            <div v-else class="empty-state">参加中のロードマップはありません。</div>
          </section>
        </template>
      </BasiqTabs>
    </template>
  </div>
</template>

<style scoped>
/* stylelint-disable no-descending-specificity */
.profile-page {
  width: min(1040px, 100%);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 26px;
}

.avatar {
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  flex: none;
  border-radius: 50%;
  color: var(--basiq-color-content-on-accent);
  background: var(--basiq-color-accent-default);
  font-size: 25px;
  font-weight: 700;
}

.profile-header h1 {
  font-size: 28px;
}

.profile-header > div:last-child > p:last-child {
  color: var(--basiq-color-content-subtle);
}

.profile-tabs [role="tabpanel"] {
  padding-top: 22px;
}

.tab-panel {
  min-height: 420px;
}

.badge-grid,
.roadmap-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.badge-grid > a,
.roadmap-grid > a {
  text-decoration: none;
}

.badge-card,
.roadmap-card,
.list-card {
  height: 100%;
  border: 1px solid var(--basiq-color-border-separator);
}

.badge-card {
  display: grid;
  gap: 14px;
}

.badge-card h2,
.roadmap-card h2 {
  font-size: 16px;
}

.badge-card p,
.roadmap-card p {
  color: var(--basiq-color-content-subtle);
  font-size: 11px;
}

.roadmap-card {
  display: grid;
  gap: 12px;
}

.progress {
  height: 6px;
  overflow: hidden;
  border-radius: 99px;
  background: var(--basiq-color-surface-muted);
}

.progress span {
  height: 100%;
  display: block;
  border-radius: inherit;
  background: var(--basiq-color-accent-default);
}

.record-list {
  display: grid;
}

.record-list > a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 2px;
  border-bottom: 1px solid var(--basiq-color-border-separator);
  text-decoration: none;
}

.record-list > a:last-child {
  border-bottom: 0;
}

.record-list span {
  display: grid;
}

.record-list small {
  color: var(--basiq-color-content-subtle);
}

.record-list b {
  color: var(--basiq-color-content-accent);
  font-size: 12px;
}

.empty-copy {
  color: var(--basiq-color-content-subtle);
}

@media (width <= 760px) {
  .profile-header {
    gap: 13px;
  }

  .avatar {
    width: 52px;
    height: 52px;
  }

  .profile-header h1 {
    font-size: 22px;
  }

  .badge-grid,
  .roadmap-grid {
    grid-template-columns: 1fr;
  }

  .record-list > a {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
