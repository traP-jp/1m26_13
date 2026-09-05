<script setup lang="ts">
import { BasiqAvatar, BasiqCard, BasiqTabs } from "basiq-ui";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import { getProfile, listLectures, type Profile } from "@/api/resources";
import AppIcon from "@/components/AppIcon.vue";
import BadgeAlpha from "@/components/BadgeAlpha.vue";
import { inferBadgeFamilies, normalizeBadgeName } from "@/components/badgeNameAffinity";

const route = useRoute();
const profile = ref<Profile>();
const badgeFamilies = ref(new Map<string, string>());
const activeTab = ref("badges");
const selectedBadgeId = ref("");
const loading = ref(true);
const error = ref("");
const selectedBadge = computed(() =>
  profile.value?.badges.find((badge) => badge.lectureId === selectedBadgeId.value),
);
const avatarUrl = computed(() =>
  profile.value
    ? `https://q.trap.jp/api/v3/public/icon/${encodeURIComponent(profile.value.user.traqId)}`
    : "",
);
const roadmapCompletedCount = computed(() =>
  (profile.value?.roadmaps ?? []).reduce((total, roadmap) => total + roadmap.completedItemCount, 0),
);
const tabs = computed(() => [
  { value: "badges", label: `バッジ ${profile.value?.badges.length ?? 0}` },
  { value: "completions", label: `完了した開催 ${profile.value?.completions.length ?? 0}` },
  { value: "roadmaps", label: `ロードマップ ${profile.value?.roadmaps.length ?? 0}` },
]);
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [loadedProfile, lectures] = await Promise.all([
      getProfile(String(route.params.traqId)),
      listLectures(),
    ]);
    // Use the published catalog so the same badge does not change with a user's completion set.
    badgeFamilies.value = inferBadgeFamilies(lectures.map((lecture) => lecture.name));
    profile.value = loadedProfile;
    if (!profile.value.badges.some((badge) => badge.lectureId === selectedBadgeId.value))
      selectedBadgeId.value = profile.value.badges[0]?.lectureId ?? "";
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "読み込めませんでした";
  } finally {
    loading.value = false;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(new Date(value));
}

function hostGroupNames(badge: Profile["badges"][number]): string[] {
  return badge.organizer?.kind === "group" && badge.organizer.groupName
    ? [badge.organizer.groupName]
    : [];
}

onMounted(load);
</script>

<template>
  <div class="page profile-page">
    <div v-if="loading" class="loading-state">プロフィールを読み込んでいます</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <template v-else-if="profile">
      <header class="profile-header">
        <div class="profile-identity">
          <BasiqAvatar
            alt=""
            :name="profile.user.displayName"
            :src="avatarUrl"
            :size="64"
            shape="circle"
            ><template #fallback>{{
              profile.user.displayName.slice(0, 1).toLocaleUpperCase("ja-JP") || "?"
            }}</template></BasiqAvatar
          >
          <div>
            <h1>{{ profile.user.displayName }}</h1>
            <p>@{{ profile.user.traqId }}</p>
          </div>
        </div>
        <dl class="profile-stats" aria-label="学習状況">
          <div>
            <dt>完了した講習会</dt>
            <dd>{{ profile.badges.length }}</dd>
          </div>
          <div>
            <dt>完了した開催</dt>
            <dd>{{ profile.completions.length }}</dd>
          </div>
          <div>
            <dt>ロードマップ内の完了</dt>
            <dd>{{ roadmapCompletedCount }}</dd>
          </div>
        </dl>
      </header>

      <BasiqTabs
        v-model="activeTab"
        class="profile-tabs"
        :items="tabs"
        list-width="100%"
        aria-label="プロフィール"
      >
        <template #content="{ item }">
          <section v-if="item.value === 'badges'" class="profile-tab-panel badge-panel">
            <div class="badge-collection">
              <div class="section-heading">
                <h2>講習会バッジ</h2>
              </div>
              <div v-if="!profile.badges.length" class="empty-state">
                通常開催をすべて完了すると、講習会バッジが表示されます。
              </div>
              <ul v-else class="badge-grid">
                <li v-for="badge in profile.badges" :key="badge.lectureId">
                  <button
                    type="button"
                    class="badge-tile"
                    :class="{ 'is-selected': badge.lectureId === selectedBadgeId }"
                    :aria-pressed="badge.lectureId === selectedBadgeId"
                    @click="selectedBadgeId = badge.lectureId"
                  >
                    <span class="badge-mark"
                      ><BadgeAlpha
                        :lecture-name="badge.lectureName"
                        :host-group-names="hostGroupNames(badge)"
                        :family="badgeFamilies.get(normalizeBadgeName(badge.lectureName))"
                    /></span>
                    <span class="badge-tile-copy">
                      <strong>{{ badge.lectureName }}</strong>
                      <small
                        >{{ badge.academicYearStart }}年度 · {{ formatDate(badge.earnedAt) }}</small
                      >
                    </span>
                    <AppIcon name="chevron" :size="18" />
                  </button>
                </li>
              </ul>
            </div>

            <aside v-if="selectedBadge" class="badge-detail-rail" aria-label="選択したバッジ">
              <BasiqCard class="badge-detail-card">
                <div class="badge-detail-mark">
                  <BadgeAlpha
                    :lecture-name="selectedBadge.lectureName"
                    :host-group-names="hostGroupNames(selectedBadge)"
                    :family="badgeFamilies.get(normalizeBadgeName(selectedBadge.lectureName))"
                  />
                </div>
                <div class="badge-detail-copy">
                  <strong>{{ selectedBadge.lectureName }}</strong>
                  <dl>
                    <div>
                      <dt>年度</dt>
                      <dd>{{ selectedBadge.academicYearStart }}年度</dd>
                    </div>
                    <div>
                      <dt>受講完了日</dt>
                      <dd>{{ formatDate(selectedBadge.earnedAt) }}</dd>
                    </div>
                  </dl>
                </div>
                <template #footer>
                  <RouterLink class="action-link" :to="`/lectures/${selectedBadge.lectureId}`"
                    >講習会を見る</RouterLink
                  >
                </template>
              </BasiqCard>
            </aside>
          </section>

          <section v-else-if="item.value === 'completions'" class="profile-tab-panel">
            <div class="section-heading">
              <h2>完了した開催</h2>
            </div>
            <div v-if="!profile.completions.length" class="empty-state">
              完了した開催はありません。
            </div>
            <ul v-else class="completion-record-list">
              <li v-for="completion in profile.completions" :key="completion.sessionId">
                <RouterLink :to="`/lectures/${completion.lectureId}#第${completion.roundNumber}回`">
                  <span class="completion-record-copy"
                    ><strong>第{{ completion.roundNumber }}回</strong
                    ><span>{{ formatDate(completion.completedAt) }}</span></span
                  >
                  <span class="completion-action">開催を見る</span>
                </RouterLink>
              </li>
            </ul>
          </section>

          <section v-else class="profile-tab-panel">
            <div class="section-heading">
              <h2>ロードマップ</h2>
            </div>
            <div v-if="!profile.roadmaps.length" class="empty-state">
              参加中のロードマップはありません。
            </div>
            <ul v-else class="profile-roadmap-list">
              <li v-for="roadmap in profile.roadmaps" :key="roadmap.id">
                <RouterLink :to="`/roadmaps/${roadmap.id}`">
                  <span class="profile-roadmap-copy"
                    ><strong>{{ roadmap.title }}</strong
                    ><span>{{ roadmap.description }}</span></span
                  >
                  <span class="profile-roadmap-progress">
                    <span>{{ roadmap.completedItemCount }}/{{ roadmap.totalItemCount }} 完了</span>
                    <span class="progress"
                      ><span :style="{ width: `${roadmap.progressPercent}%` }"></span
                    ></span>
                    <small>{{
                      roadmap.nextItemId
                        ? "次の学習項目あり"
                        : roadmap.totalItemCount
                          ? "完了"
                          : "講習会未登録"
                    }}</small>
                  </span>
                </RouterLink>
              </li>
            </ul>
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
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.profile-identity {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-header h1 {
  font-size: 1.5rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.profile-identity p {
  color: var(--basiq-color-content-subtle);
  font-size: 0.875rem;
}

.profile-stats {
  display: flex;
}

.profile-stats div {
  min-width: 108px;
  padding-inline: 16px;
  border-left: 1px solid var(--basiq-color-border-separator);
  text-align: center;
}

.profile-stats dt {
  color: var(--basiq-color-content-subtle);
  font-size: 0.75rem;
}

.profile-stats dd {
  margin: 2px 0 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.profile-tabs {
  width: 100%;

  --basiq-color-tabs-content-background: var(--basiq-color-surface-base);
}

.profile-tabs :deep([role="tabpanel"]) {
  padding: 16px 0 0;
}

.profile-tab-panel {
  min-width: 0;
}

.badge-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 264px;
  gap: 24px;
  align-items: start;
}

.section-heading {
  margin-top: 0;
}

.section-heading > span {
  color: var(--basiq-color-content-subtle);
  font-size: 0.75rem;
}

.badge-grid {
  display: grid;
  gap: 0;
  border-top: 1px solid var(--basiq-color-border-separator);
  list-style: none;
}

.badge-tile {
  width: 100%;
  min-height: 72px;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;
  border: 0;
  border-bottom: 1px solid var(--basiq-color-border-separator);
  color: inherit;
  background: var(--basiq-color-surface-base);
  text-align: left;
  cursor: pointer;
}

.badge-tile:hover {
  background: var(--basiq-color-surface-container);
}

.badge-tile.is-selected {
  background: var(--app-accent-soft);
}

.badge-tile:focus-visible {
  outline: 2px solid var(--basiq-color-accent-default);
  outline-offset: -2px;
}

.badge-mark {
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
}

.badge-mark :deep(svg),
.badge-detail-mark :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.badge-tile-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.badge-tile-copy small {
  margin-top: 4px;
  color: var(--basiq-color-content-subtle);
}

.badge-detail-rail {
  position: sticky;
  top: 24px;
}

.badge-detail-mark {
  width: 96px;
  height: 96px;
  margin: 4px auto 12px;
}

.badge-detail-copy {
  display: grid;
  gap: 12px;
  text-align: center;
}

.badge-detail-copy dl {
  border-top: 1px solid var(--basiq-color-border-separator);
  text-align: left;
}

.badge-detail-copy dl div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-block: 8px;
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.badge-detail-copy dt {
  color: var(--basiq-color-content-subtle);
}

.badge-detail-copy dd {
  margin: 0;
}

.action-link {
  display: block;
  color: var(--basiq-color-content-accent);
  font-weight: 700;
  text-align: center;
  text-decoration: none;
}

.completion-record-list,
.profile-roadmap-list {
  border-top: 1px solid var(--basiq-color-border-separator);
  list-style: none;
}

.completion-record-list li,
.profile-roadmap-list li {
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.completion-record-list a {
  min-height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px;
  text-decoration: none;
}

.completion-record-list a:hover,
.profile-roadmap-list a:hover {
  background: var(--basiq-color-surface-container);
}

.completion-record-copy {
  display: flex;
  flex-direction: column;
}

.completion-record-copy span,
.completion-action {
  color: var(--basiq-color-content-subtle);
  font-size: 0.875rem;
}

.profile-roadmap-list a {
  min-height: 76px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  align-items: center;
  gap: 24px;
  padding: 12px;
  text-decoration: none;
}

.profile-roadmap-copy,
.profile-roadmap-progress {
  display: flex;
  flex-direction: column;
}

.profile-roadmap-copy span,
.profile-roadmap-progress small {
  color: var(--basiq-color-content-subtle);
  font-size: 0.875rem;
}

.profile-roadmap-progress {
  gap: 4px;
}

.progress {
  width: 100%;
  height: 4px;
  overflow: hidden;
  border-radius: 2px;
  background: var(--basiq-color-surface-muted);
}

.progress span {
  height: 100%;
  display: block;
  border-radius: inherit;
  background: var(--basiq-color-accent-default);
}

@media (width <= 980px) and (width >= 761px) {
  .profile-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .profile-stats div:first-child {
    padding-left: 0;
    border-left: 0;
  }

  .badge-panel {
    grid-template-columns: 1fr;
  }

  .badge-detail-rail {
    position: static;
  }
}

@media (width <= 760px) {
  .profile-page {
    padding: 16px 16px 40px;
  }

  .profile-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
  }

  .profile-stats {
    width: 100%;
  }

  .profile-stats div {
    min-width: 0;
    flex: 1;
    padding-inline: 8px;
  }

  .profile-stats div:first-child {
    padding-left: 0;
    border-left: 0;
  }

  .profile-tabs :deep([role="tab"]) {
    min-width: 0;
    flex: 1;
    padding-inline: 6px;
    font-size: 0.75rem;
  }

  .badge-panel {
    grid-template-columns: 1fr;
  }

  .badge-grid {
    grid-template-columns: 1fr;
  }

  .badge-detail-rail {
    position: static;
  }

  .profile-roadmap-list a {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

@media (width <= 480px) {
  .completion-record-list a {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .badge-grid {
    grid-template-columns: 1fr;
  }

  .profile-identity {
    align-items: flex-start;
  }

  .profile-avatar {
    width: 58px;
    height: 58px;
  }

  .profile-stats dt {
    min-height: 32px;
  }
}
</style>
