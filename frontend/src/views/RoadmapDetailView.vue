<script setup lang="ts">
import { BasiqButton, BasiqCard, BasiqFormField, BasiqTextarea } from "basiq-ui";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getRoadmap, listLectures, type Lecture, type Roadmap } from "@/api/resources";
import AppIcon from "@/components/AppIcon.vue";

const route = useRoute();
const router = useRouter();
const roadmap = ref<Roadmap>();
const lectures = ref<Record<string, Lecture>>({});
const loading = ref(true);
const error = ref("");
const copied = ref(false);

const items = computed(() => roadmap.value?.items ?? []);
function resolveItem(item: Roadmap["items"][number]) {
  if (item.targetType === "lecture") {
    const lecture = lectures.value[item.targetId];
    return {
      title: lecture?.name ?? "講習会",
      description: lecture?.description ?? "",
      meta: `${lecture?.academicYearStart ?? ""}年度`,
      link: `/lectures/${item.targetId}`,
    };
  }
  const lecture = Object.values(lectures.value).find((entry) =>
    entry.sessions.some((session) => session.id === item.targetId),
  );
  const session = lecture?.sessions.find((entry) => entry.id === item.targetId);
  return {
    title: `${lecture?.name ?? "講習会"} 第${(session?.order ?? 0) + 1}回`,
    description: session?.description ?? lecture?.description ?? "",
    meta: session?.date ?? "日付未設定",
    link: `/lectures/${lecture?.id ?? ""}#第${(session?.order ?? 0) + 1}回`,
  };
}
const shareMarkdown = computed(() => {
  if (!roadmap.value) return "";
  const lines = items.value.map((item, index) => {
    const target = resolveItem(item);
    return `${index + 1}. [${target.title}](${window.location.origin}${target.link})`;
  });
  return `## ${roadmap.value.title}\n\n${lines.join("\n")}`;
});
const remaining = computed(() =>
  Math.max(0, (roadmap.value?.totalItemCount ?? 0) - (roadmap.value?.completedItemCount ?? 0)),
);
const nextItem = computed(() =>
  roadmap.value?.nextItemId
    ? items.value.find((item) => item.id === roadmap.value?.nextItemId)
    : undefined,
);

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [value, lectureList] = await Promise.all([
      getRoadmap(String(route.params.id)),
      listLectures(),
    ]);
    roadmap.value = value;
    lectures.value = Object.fromEntries(lectureList.map((lecture) => [lecture.id, lecture]));
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "読み込めませんでした";
  } finally {
    loading.value = false;
  }
}

async function copyShare() {
  await navigator.clipboard.writeText(shareMarkdown.value);
  copied.value = true;
}

function scrollToShare() {
  document.querySelector("#share-panel")?.scrollIntoView({ behavior: "smooth" });
}

onMounted(load);
</script>

<template>
  <div class="page roadmap-detail-page">
    <div v-if="loading" class="loading-state">ロードマップを読み込んでいます</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <template v-else-if="roadmap">
      <nav class="breadcrumb" aria-label="パンくずリスト">
        <RouterLink to="/roadmaps">ロードマップ</RouterLink><span aria-hidden="true">/</span
        ><span>{{ roadmap.title }}</span>
      </nav>

      <header class="roadmap-hero">
        <div>
          <h1>{{ roadmap.title }}</h1>
          <p v-if="roadmap.description">{{ roadmap.description }}</p>
          <p class="roadmap-meta">学習項目 {{ roadmap.totalItemCount }}件</p>
        </div>
        <BasiqButton tone="neutral" variant="outline" @click="scrollToShare"
          >共有文を見る</BasiqButton
        >
      </header>

      <section class="status-overview" aria-label="学習状況">
        <div class="progress-summary">
          <div class="progress-label">
            <h2>進捗</h2>
            <span>{{ roadmap.completedItemCount }}/{{ roadmap.totalItemCount }}件</span>
          </div>
          <div
            class="progress-track"
            role="progressbar"
            aria-label="ロードマップの進捗"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="roadmap.progressPercent"
          >
            <span :style="{ width: `${roadmap.progressPercent}%` }"></span>
          </div>
          <strong>{{ roadmap.progressPercent }}%</strong>
        </div>
        <div class="current-content">
          <template v-if="roadmap.totalItemCount === 0">
            <div class="current-copy">
              <span class="current-label">現在地</span>
              <h2>学習項目が未登録です</h2>
            </div>
          </template>
          <template v-else-if="nextItem">
            <div class="current-copy">
              <span class="current-label">次の学習項目</span>
              <h2>{{ resolveItem(nextItem).title }}</h2>
              <p>{{ remaining }}件残っています · {{ resolveItem(nextItem).meta }}</p>
            </div>
            <BasiqButton @click="router.push(resolveItem(nextItem).link)"
              >学習項目を見る</BasiqButton
            >
          </template>
          <template v-else>
            <div class="current-copy">
              <span class="current-label">完了</span>
              <h2>すべて完了しました</h2>
            </div>
          </template>
        </div>
      </section>

      <div class="roadmap-content-grid">
        <section class="learning-path" aria-labelledby="learning-title">
          <div class="learning-heading">
            <h2 id="learning-title">学習順</h2>
          </div>
          <ol class="path-list">
            <li
              v-for="(item, index) in items"
              :key="item.id"
              class="path-row"
              :class="{
                'is-completed': roadmap.completedItemIds.includes(item.id),
                'is-current': roadmap.nextItemId === item.id,
              }"
            >
              <div class="path-marker" aria-hidden="true">
                <span v-if="roadmap.completedItemIds.includes(item.id)">✓</span
                ><span v-else>{{ index + 1 }}</span>
              </div>
              <RouterLink :to="resolveItem(item).link" class="path-link">
                <div class="path-card-content">
                  <div class="path-copy">
                    <h3>{{ resolveItem(item).title }}</h3>
                    <div class="path-meta">
                      <span>{{ item.targetType === "lecture" ? "講習会" : "開催" }}</span
                      ><span>{{ resolveItem(item).meta }}</span>
                    </div>
                  </div>
                  <AppIcon name="arrow" />
                </div>
              </RouterLink>
            </li>
          </ol>
        </section>

        <aside class="side-rail" aria-label="共有">
          <BasiqCard id="share-panel" class="share-card">
            <template #header><h2>共有</h2></template>
            <BasiqFormField label="Markdown"
              ><BasiqTextarea :model-value="shareMarkdown" readonly :rows="10" resize="none"
            /></BasiqFormField>
            <template #footer
              ><BasiqButton
                class="full-button"
                :tone="copied ? 'neutral' : 'accent'"
                :variant="copied ? 'outline' : 'solid'"
                aria-live="polite"
                @click="copyShare"
                >{{ copied ? "コピーしました" : "コピー" }}</BasiqButton
              ></template
            >
          </BasiqCard>
          <BasiqButton
            tone="neutral"
            variant="outline"
            @click="router.push(`/admin/roadmaps/${roadmap.id}`)"
            ><AppIcon name="edit" :size="17" />編集</BasiqButton
          >
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.roadmap-detail-page {
  width: min(1080px, 100%);
}

.roadmap-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 16px;
}

.roadmap-hero h1 {
  font-size: 1.5rem;
  line-height: 1.5;
  letter-spacing: normal;
  overflow-wrap: anywhere;
}

.roadmap-hero p {
  max-width: 700px;
  margin-top: 8px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.875rem;
}

.roadmap-hero .roadmap-meta {
  margin-top: 4px;
  font-size: 0.75rem;
}

.status-overview {
  display: grid;
  gap: 12px;
  margin-bottom: 24px;
  padding-block: 16px;
  border-block: 1px solid var(--basiq-color-border-separator);
}

.progress-summary {
  display: grid;
  grid-template-columns: auto minmax(140px, 1fr) auto;
  align-items: center;
  gap: 16px;
}

.progress-label {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.progress-summary h2,
.current-content h2 {
  font-size: 1rem;
}

.progress-summary span {
  color: var(--basiq-color-content-subtle);
  font-size: 0.75rem;
}

.progress-track {
  height: 4px;
  overflow: hidden;
  border-radius: 2px;
  background: var(--basiq-color-surface-muted);
}

.progress-track span {
  height: 100%;
  display: block;
  border-radius: inherit;
  background: var(--basiq-color-accent-default);
}

.current-content {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--basiq-color-border-separator);
}

.current-copy {
  min-width: 0;
}

.current-label {
  color: var(--basiq-color-content-accent);
  font-size: 0.75rem;
  font-weight: 700;
}

.current-content p {
  margin-top: 4px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.875rem;
}

.roadmap-content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 284px;
  gap: 24px;
  align-items: start;
}

.learning-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  margin-bottom: 16px;
}

.learning-heading h2,
.share-card h2 {
  font-size: 1.125rem;
}

.path-list {
  list-style: none;
}

.path-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 8px;
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.path-marker {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  justify-self: center;
  margin-top: 12px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.875rem;
  font-weight: 700;
}

.is-completed .path-marker {
  color: var(--app-success);
}

.is-current .path-marker {
  color: var(--basiq-color-content-accent);
}

.path-link {
  text-decoration: none;
}

.path-card-content {
  min-height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;
}

.path-copy {
  min-width: 0;
}

.path-card-content > :deep(.app-icon) {
  color: var(--basiq-color-content-subtle);
}

.path-card-content h3 {
  font-size: 0.875rem;
}

.path-link:hover .path-card-content {
  background: var(--basiq-color-surface-container);
}

.path-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin-top: 4px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.75rem;
}

.path-meta span + span::before {
  margin-right: 8px;
  color: var(--basiq-color-border-control);
  content: "·";
}

.side-rail {
  display: grid;
  gap: 16px;
}

.full-button {
  width: 100%;
}

.share-card :deep(textarea) {
  min-height: 160px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  line-height: 1.55;
}

@media (width <= 1020px) {
  .roadmap-detail-page {
    padding-inline: 24px;
  }

  .roadmap-content-grid {
    grid-template-columns: minmax(0, 1fr) 284px;
    gap: 24px;
  }
}

@media (width <= 760px) {
  .roadmap-detail-page {
    padding: 16px 16px 40px;
  }

  .roadmap-hero {
    display: block;
    margin-bottom: 16px;
  }

  .roadmap-hero h1 {
    font-size: 1.5rem;
  }

  .roadmap-hero > button {
    width: 100%;
    margin-top: 16px;
  }

  .progress-summary {
    grid-template-columns: 1fr auto;
    gap: 8px 12px;
  }

  .progress-summary .progress-track {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .current-content > button {
    flex: 0 0 auto;
  }

  .roadmap-content-grid {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .learning-path,
  .side-rail {
    width: 100%;
  }

  .learning-heading {
    display: block;
  }

  .path-row {
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 8px;
  }

  .path-card-content {
    min-height: 60px;
    gap: 8px;
  }

  .path-card-content h3 {
    font-size: 0.875rem;
  }
}
</style>
