<script setup lang="ts">
import { BasiqCard } from "basiq-ui";
import { computed, nextTick, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import { getProfile, type Profile } from "@/api/resources";
import AppIcon from "@/components/AppIcon.vue";
import BadgeAlpha from "@/components/BadgeAlpha.vue";

const route = useRoute();
const profile = ref<Profile>();
type ProfileTab = "badges" | "completions" | "roadmaps";
const tabOrder: ProfileTab[] = ["badges", "completions", "roadmaps"];
const activeTab = ref<ProfileTab>("badges");
const selectedBadgeId = ref("");
const loading = ref(true);
const error = ref("");
const selectedBadge = computed(() =>
  profile.value?.badges.find((badge) => badge.lectureId === selectedBadgeId.value),
);
const roadmapCompletedCount = computed(() =>
  (profile.value?.roadmaps ?? []).reduce((total, roadmap) => total + roadmap.completedItemCount, 0),
);
async function load() {
  loading.value = true;
  error.value = "";
  try {
    profile.value = await getProfile(String(route.params.traqId));
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

function handleTabKey(event: KeyboardEvent) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const currentIndex = tabOrder.indexOf(activeTab.value);
  const nextIndex =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabOrder.length - 1
        : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabOrder.length) %
          tabOrder.length;
  activeTab.value = tabOrder[nextIndex]!;
  void nextTick(() =>
    document.querySelector<HTMLElement>(`#profile-tab-${activeTab.value}`)?.focus(),
  );
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
          <span class="profile-avatar" aria-hidden="true">{{
            profile.user.displayName.slice(0, 1).toLocaleUpperCase("ja-JP") || "1"
          }}</span>
          <h1>{{ profile.user.displayName }}</h1>
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

      <nav class="profile-tabs" aria-label="プロフィール" role="tablist">
        <button
          id="profile-tab-badges"
          type="button"
          role="tab"
          :tabindex="activeTab === 'badges' ? 0 : -1"
          :aria-selected="activeTab === 'badges'"
          aria-controls="profile-badges"
          @click="activeTab = 'badges'"
          @keydown="handleTabKey"
        >
          バッジ <span>{{ profile.badges.length }}</span>
        </button>
        <button
          id="profile-tab-completions"
          type="button"
          role="tab"
          :tabindex="activeTab === 'completions' ? 0 : -1"
          :aria-selected="activeTab === 'completions'"
          aria-controls="profile-completions"
          @click="activeTab = 'completions'"
          @keydown="handleTabKey"
        >
          完了した開催 <span>{{ profile.completions.length }}</span>
        </button>
        <button
          id="profile-tab-roadmaps"
          type="button"
          role="tab"
          :tabindex="activeTab === 'roadmaps' ? 0 : -1"
          :aria-selected="activeTab === 'roadmaps'"
          aria-controls="profile-roadmaps"
          @click="activeTab = 'roadmaps'"
          @keydown="handleTabKey"
        >
          ロードマップ <span>{{ profile.roadmaps.length }}</span>
        </button>
      </nav>

      <section
        v-if="activeTab === 'badges'"
        id="profile-badges"
        class="profile-tab-panel badge-panel"
        role="tabpanel"
        aria-labelledby="profile-tab-badges"
      >
        <div class="badge-collection">
          <div class="section-heading">
            <div>
              <h2>講習会バッジ</h2>
              <p>講習会全体を完了した記録です。</p>
            </div>
            <span>{{ profile.badges.length }}件</span>
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
                  ><BadgeAlpha :lecture-id="badge.lectureId" :lecture-name="badge.lectureName"
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
            <template #header
              ><div class="badge-detail-heading">
                <AppIcon name="award" :size="18" />
                <h2>バッジ詳細</h2>
              </div></template
            >
            <div class="badge-detail-mark">
              <BadgeAlpha
                :lecture-id="selectedBadge.lectureId"
                :lecture-name="selectedBadge.lectureName"
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
                >講習会の詳細を見る</RouterLink
              >
            </template>
          </BasiqCard>
        </aside>
      </section>

      <section
        v-else-if="activeTab === 'completions'"
        id="profile-completions"
        class="profile-tab-panel"
        role="tabpanel"
        aria-labelledby="profile-tab-completions"
      >
        <div class="section-heading">
          <div>
            <h2>完了した開催</h2>
            <p>完了として記録した開催を、新しい順に確認できます。</p>
          </div>
          <span>{{ profile.completions.length }}件</span>
        </div>
        <div v-if="!profile.completions.length" class="empty-state">完了した開催はありません。</div>
        <ul v-else class="completion-record-list">
          <li v-for="completion in profile.completions" :key="completion.sessionId">
            <RouterLink :to="`/sessions/${completion.sessionId}`">
              <span class="completion-record-copy"
                ><strong>開催の完了記録</strong
                ><span>{{ formatDate(completion.completedAt) }}</span></span
              >
              <time :datetime="completion.completedAt">開催を見る →</time>
            </RouterLink>
          </li>
        </ul>
      </section>

      <section
        v-else
        id="profile-roadmaps"
        class="profile-tab-panel"
        role="tabpanel"
        aria-labelledby="profile-tab-roadmaps"
      >
        <div class="section-heading">
          <div>
            <h2>ロードマップの進み具合</h2>
            <p>完了記録をもとに、各ロードマップでの現在地を表示します。</p>
          </div>
          <span>{{ profile.roadmaps.length }}件</span>
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
                  roadmap.nextLectureId
                    ? "次の講習会あり"
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
  </div>
</template>

<style scoped>
/* stylelint-disable no-descending-specificity */
.profile-page {
  width: min(1120px, 100%);
  padding: 48px 40px 72px;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 32px;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.profile-identity {
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-avatar {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: var(--basiq-radius-full);
  color: var(--basiq-color-content-on-accent);
  background: var(--basiq-color-accent-default);
  font-size: 1.5rem;
  font-weight: 800;
}

.profile-header h1 {
  font-size: 1.75rem;
}

.profile-stats {
  display: flex;
}

.profile-stats div {
  min-width: 116px;
  padding-inline: 16px;
  border-left: 1px solid var(--basiq-color-border-separator);
  text-align: center;
}

.profile-stats dt {
  color: var(--basiq-color-content-subtle);
  font-size: 0.72rem;
}

.profile-stats dd {
  margin: 2px 0 0;
  font-size: 1.4rem;
  font-weight: 800;
}

.profile-tabs {
  display: flex;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.profile-tabs button {
  min-height: 44px;
  flex: 0 0 auto;
  padding: 8px 16px;
  border: 0;
  border-bottom: 3px solid transparent;
  color: var(--basiq-color-content-subtle);
  background: transparent;
  font: inherit;
  cursor: pointer;
}

.profile-tabs button[aria-selected="true"] {
  border-bottom-color: var(--basiq-color-accent-default);
  color: var(--basiq-color-content-accent);
  font-weight: 700;
}

.profile-tabs button span {
  opacity: 0.72;
}

.profile-tab-panel {
  min-width: 0;
  min-height: 420px;
}

.badge-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 288px;
  gap: 16px;
  align-items: start;
}

.section-heading {
  margin-top: 0;
}

.section-heading > span {
  color: var(--basiq-color-content-subtle);
  font-size: 0.8rem;
}

.badge-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  list-style: none;
}

.badge-tile {
  width: 100%;
  min-height: 106px;
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
  color: inherit;
  background: var(--basiq-color-surface-base);
  text-align: left;
  cursor: pointer;
}

.badge-tile:hover {
  background: var(--basiq-color-surface-container);
}

.badge-tile.is-selected {
  border-color: var(--basiq-color-accent-default);
  background: var(--app-accent-soft);
}

.badge-mark {
  width: 58px;
  height: 58px;
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
  margin-top: 3px;
  color: var(--basiq-color-content-subtle);
}

.badge-detail-rail {
  position: sticky;
  top: 32px;
}

.badge-detail-card h2 {
  font-size: 1.05rem;
}

.badge-detail-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--basiq-color-content-accent);
}

.badge-detail-mark {
  width: 112px;
  height: 112px;
  margin: 12px auto;
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
  min-height: 68px;
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
.completion-record-list time {
  color: var(--basiq-color-content-subtle);
  font-size: 0.8rem;
}

.profile-roadmap-list a {
  min-height: 86px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  align-items: center;
  gap: 32px;
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
  font-size: 0.8rem;
}

.profile-roadmap-progress {
  gap: 3px;
}

.progress {
  width: 100%;
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
    padding: 24px 16px 48px;
  }

  .profile-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 24px;
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

  .profile-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .profile-tabs button {
    min-width: 0;
    width: 100%;
    padding-inline: 6px;
    font-size: 0.76rem;
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
