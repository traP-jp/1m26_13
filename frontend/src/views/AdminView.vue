<script setup lang="ts">
import { BasiqButton, BasiqFormField, BasiqInput, BasiqTabs } from "basiq-ui";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { listLectures, listRoadmaps, type Lecture, type Roadmap } from "@/api/resources";
import AppIcon from "@/components/AppIcon.vue";

const router = useRouter();
const lectures = ref<Lecture[]>([]);
const roadmaps = ref<Roadmap[]>([]);
const loading = ref(true);
const error = ref("");
const query = ref("");
const activeStatus = ref("all");

const tabs = computed(() => [
  { value: "all", label: `すべて ${roadmaps.value.length}` },
  { value: "published", label: `公開中 ${roadmaps.value.filter((item) => item.published).length}` },
  { value: "draft", label: `下書き ${roadmaps.value.filter((item) => !item.published).length}` },
]);
const filteredRoadmaps = computed(() => {
  const normalized = query.value.trim().toLocaleLowerCase("ja");
  return roadmaps.value.filter((roadmap) => {
    const matchesStatus =
      activeStatus.value === "all" ||
      (activeStatus.value === "published" ? roadmap.published : !roadmap.published);
    return (
      matchesStatus &&
      (!normalized ||
        `${roadmap.title} ${roadmap.description} ${roadmap.audience}`
          .toLocaleLowerCase("ja")
          .includes(normalized))
    );
  });
});
const recentLectures = computed(() =>
  [...lectures.value].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4),
);

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
function academicYear(lecture: Lecture) {
  return lecture.academicYearStart === lecture.academicYearEnd
    ? `${lecture.academicYearStart}年度`
    : `${lecture.academicYearStart}–${lecture.academicYearEnd}年度`;
}
async function load() {
  loading.value = true;
  error.value = "";
  try {
    [lectures.value, roadmaps.value] = await Promise.all([
      listLectures({ includeDraft: true }),
      listRoadmaps(true),
    ]);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "読み込めませんでした";
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>

<template>
  <div class="page admin-page">
    <header class="admin-heading">
      <h1>運営向けページ</h1>
      <BasiqButton @click="router.push('/admin/lectures/new')"
        ><AppIcon name="plus" :size="18" />講習会を作成</BasiqButton
      >
    </header>

    <div v-if="loading" class="loading-state">運営データを読み込んでいます</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <template v-else>
      <section class="recent-section" aria-labelledby="recent-heading">
        <div class="management-heading compact-heading">
          <h2 id="recent-heading">最近編集した講習会</h2>
        </div>
        <div class="lecture-list" role="list">
          <article
            v-for="lecture in recentLectures"
            :key="lecture.id"
            class="lecture-row"
            role="listitem"
          >
            <div class="lecture-main">
              <span :class="['status-badge', lecture.isPublished ? 'published' : 'draft']">{{
                lecture.isPublished ? "公開中" : "下書き"
              }}</span>
              <h3>{{ lecture.name }}</h3>
            </div>
            <p>{{ academicYear(lecture) }} · {{ lecture.sessions.length }}開催</p>
            <time :datetime="lecture.updatedAt">{{ formatDate(lecture.updatedAt) }}</time>
            <BasiqButton
              tone="neutral"
              variant="outline"
              @click="router.push(`/admin/lectures/${lecture.id}`)"
              >編集</BasiqButton
            >
          </article>
          <div v-if="!recentLectures.length" class="empty-state">講習会はまだありません。</div>
        </div>
      </section>

      <section class="roadmap-management" aria-labelledby="roadmap-heading">
        <div class="management-heading compact-heading">
          <div><h2 id="roadmap-heading">ロードマップ管理</h2></div>
          <BasiqButton tone="neutral" variant="outline" @click="router.push('/admin/roadmaps/new')"
            ><AppIcon name="plus" :size="18" />新規作成</BasiqButton
          >
        </div>
        <div class="management-toolbar">
          <BasiqFormField class="search-field" control-id="roadmap-search">
            <BasiqInput
              v-model="query"
              type="search"
              placeholder="タイトル・概要・対象から検索"
              aria-label="ロードマップを検索"
              clearable
              clear-label="検索条件をクリア"
            >
              <template #leading><AppIcon name="search" :size="18" /></template>
            </BasiqInput>
          </BasiqFormField>
        </div>
        <BasiqTabs
          v-model="activeStatus"
          class="status-tabs"
          :items="tabs"
          aria-label="公開状態で絞り込む"
          :unmount-on-hide="true"
        >
          <template #content>
            <div v-if="filteredRoadmaps.length" class="roadmap-list" role="list">
              <article
                v-for="roadmap in filteredRoadmaps"
                :key="roadmap.id"
                class="roadmap-row"
                role="listitem"
              >
                <div class="roadmap-main">
                  <span :class="['status-badge', roadmap.published ? 'published' : 'draft']">{{
                    roadmap.published ? "公開中" : "下書き"
                  }}</span>
                  <div>
                    <h3>{{ roadmap.title }}</h3>
                    <p>{{ roadmap.description }}</p>
                  </div>
                </div>
                <dl class="roadmap-facts">
                  <div>
                    <dt>学習項目</dt>
                    <dd>{{ roadmap.totalItemCount }}件</dd>
                  </div>
                  <div>
                    <dt>対象</dt>
                    <dd>{{ roadmap.audience || "未設定" }}</dd>
                  </div>
                  <div>
                    <dt>更新</dt>
                    <dd>
                      <time>{{ formatDate(roadmap.updatedAt) }}</time>
                    </dd>
                  </div>
                </dl>
                <div class="row-actions">
                  <BasiqButton
                    v-if="roadmap.published"
                    tone="neutral"
                    variant="outline"
                    @click="router.push(`/roadmaps/${roadmap.id}`)"
                    >閲覧</BasiqButton
                  ><BasiqButton
                    tone="neutral"
                    variant="outline"
                    @click="router.push(`/admin/roadmaps/${roadmap.id}`)"
                    >編集</BasiqButton
                  >
                </div>
              </article>
            </div>
            <div v-else class="empty-state">該当するロードマップはありません。</div>
          </template>
        </BasiqTabs>
      </section>
    </template>
  </div>
</template>

<style scoped>
/* stylelint-disable no-descending-specificity */
.admin-page {
  width: min(1080px, 100%);
}

.admin-heading,
.management-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}

.admin-heading {
  margin-bottom: 24px;
}

.admin-heading h1 {
  font-size: 1.5rem;
  line-height: 1.5;
  letter-spacing: normal;
}

.admin-heading button,
.management-heading button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.management-heading {
  align-items: flex-end;
  margin-bottom: 12px;
}

.management-heading h2 {
  font-size: 1.125rem;
  line-height: 1.35;
}

.management-heading p {
  margin-top: 4px;
  color: var(--basiq-color-content-subtle);
}

.recent-section {
  margin-bottom: 24px;
}

.lecture-list,
.roadmap-list {
  border-top: 1px solid var(--basiq-color-border-separator);
}

.lecture-row {
  min-height: 60px;
  display: grid;
  grid-template-columns: minmax(320px, 1fr) minmax(250px, 0.75fr) 126px auto;
  align-items: center;
  gap: 16px;
  padding: 12px 8px;
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.lecture-row:hover,
.roadmap-row:hover {
  background: var(--basiq-color-surface-container);
}

.lecture-main {
  min-width: 0;
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.lecture-main h3 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
}

.lecture-row > p,
.lecture-row time {
  color: var(--basiq-color-content-subtle);
  font-size: 0.875rem;
}

.management-toolbar {
  max-width: 520px;
  margin-bottom: 12px;
}

.status-tabs {
  margin-inline: 0;
}

.status-tabs :deep([role="tabpanel"]) {
  padding: 0;
  background: var(--basiq-color-surface-base);
}

.roadmap-row {
  min-height: 96px;
  display: grid;
  grid-template-columns: minmax(320px, 1.25fr) minmax(340px, 0.9fr) auto;
  align-items: center;
  gap: 24px;
  padding: 12px 8px;
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.roadmap-main {
  min-width: 0;
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.roadmap-main h3 {
  font-size: 0.875rem;
  line-height: 1.45;
}

.roadmap-main p {
  display: -webkit-box;
  margin-top: 4px;
  overflow: hidden;
  color: var(--basiq-color-content-subtle);
  font-size: 0.875rem;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.roadmap-facts {
  display: grid;
  gap: 4px;
}

.roadmap-facts div {
  min-width: 0;
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 8px;
}

.roadmap-facts dt {
  color: var(--basiq-color-content-subtle);
  font-size: 0.75rem;
}

.roadmap-facts dd {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
}

.row-actions {
  display: flex;
  gap: 8px;
}

.empty-state p {
  margin-top: 4px;
}

@media (width <= 1100px) {
  .lecture-row {
    grid-template-columns: minmax(0, 1fr) auto auto;
  }

  .lecture-row time {
    display: none;
  }

  .roadmap-row {
    grid-template-columns: minmax(0, 1fr) minmax(180px, 0.8fr);
  }

  .row-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}

@media (width <= 760px) {
  .admin-page {
    padding: 16px 16px 40px;
  }

  .admin-heading {
    gap: 12px;
  }

  .admin-heading h1 {
    font-size: 1.5rem;
  }

  .management-heading {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
  }

  .recent-section {
    margin-bottom: 24px;
  }

  .lecture-row {
    min-height: 0;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px 12px;
    padding: 12px 0;
  }

  .lecture-main {
    grid-column: 1 / -1;
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 8px;
  }

  .lecture-row > p {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lecture-row button {
    grid-column: 2;
    grid-row: 2;
  }

  .status-tabs {
    margin-inline: 0;
  }

  .roadmap-row {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 16px 12px;
  }

  .roadmap-main {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .status-badge {
    width: fit-content;
  }

  .roadmap-facts {
    padding-top: 12px;
    border-top: 1px solid var(--basiq-color-border-separator);
  }

  .row-actions {
    grid-column: auto;
  }

  .row-actions button {
    flex: 1;
  }
}
</style>
