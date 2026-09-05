<script setup lang="ts">
import { BasiqButton, BasiqCard, BasiqFormField, BasiqTextarea } from "basiq-ui";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getRoadmap, listAllLectures, type Lecture, type Roadmap } from "@/api/resources";
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
      listAllLectures(),
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
          <p>{{ roadmap.description }}</p>
          <div class="roadmap-tags">
            <span>一本道</span><span>学習項目 {{ roadmap.totalItemCount }}件</span>
          </div>
        </div>
        <BasiqButton tone="neutral" variant="outline" @click="scrollToShare"
          >共有文を見る</BasiqButton
        >
      </header>

      <section class="status-overview" aria-label="学習状況">
        <BasiqCard class="progress-card">
          <template #header><h2>学習の進捗</h2></template>
          <div class="progress-body">
            <div class="progress-number">
              <strong>{{ roadmap.progressPercent }}<small>%</small></strong
              ><span>{{ roadmap.totalItemCount }}件中{{ roadmap.completedItemCount }}件完了</span>
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
            <div class="progress-foot">あと{{ remaining }}件</div>
          </div>
        </BasiqCard>

        <BasiqCard class="current-card">
          <div class="current-content">
            <div>
              <span class="current-label">{{ nextItem ? "現在地" : "完了" }}</span>
              <h2>
                {{ nextItem ? resolveItem(nextItem).title : "このロードマップを完了しました" }}
              </h2>
              <p>
                {{
                  nextItem
                    ? resolveItem(nextItem).description
                    : "学習記録がすべて反映されています。"
                }}
              </p>
              <div v-if="nextItem" class="current-meta">
                <span>{{ nextItem.targetType === "lecture" ? "講習会" : "開催" }}</span
                ><span>{{ resolveItem(nextItem).meta }}</span>
              </div>
            </div>
            <BasiqButton v-if="nextItem" @click="router.push(resolveItem(nextItem).link)"
              >学習項目を見る</BasiqButton
            >
          </div>
        </BasiqCard>
      </section>

      <div class="roadmap-content-grid">
        <section class="learning-path" aria-labelledby="learning-title">
          <div class="learning-heading">
            <h2 id="learning-title">学習順</h2>
            <div class="legend">
              <span class="done">完了</span><span class="now">現在地</span><span>未着手</span>
            </div>
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
                ><span v-else>{{ String(index + 1).padStart(2, "0") }}</span>
              </div>
              <RouterLink :to="resolveItem(item).link" class="path-link">
                <BasiqCard class="path-card">
                  <div class="path-card-content">
                    <div>
                      <span class="path-status">{{
                        roadmap.completedItemIds.includes(item.id)
                          ? "完了"
                          : roadmap.nextItemId === item.id
                            ? "現在地"
                            : "未着手"
                      }}</span>
                      <h3>{{ resolveItem(item).title }}</h3>
                      <div class="path-meta">
                        <span>{{ item.targetType === "lecture" ? "講習会" : "開催" }}</span
                        ><span>{{ resolveItem(item).meta }}</span>
                      </div>
                    </div>
                    <AppIcon name="arrow" />
                  </div>
                </BasiqCard>
              </RouterLink>
            </li>
          </ol>
        </section>

        <aside class="side-rail" aria-label="共有">
          <BasiqCard id="share-panel" class="share-card">
            <template #header><h2>共有用Markdown</h2></template>
            <BasiqFormField label="共有内容"
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
  width: min(1160px, 100%);
  padding: 34px 42px 72px;
}

.roadmap-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 32px;
  margin-bottom: 24px;
}

.roadmap-hero h1 {
  font-size: clamp(1.8rem, 3vw, 2.35rem);
  line-height: 1.2;
  letter-spacing: -0.035em;
}

.roadmap-hero p {
  max-width: 700px;
  margin-top: 10px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.94rem;
}

.roadmap-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 15px;
}

.roadmap-tags span {
  padding: 3px 9px;
  border-radius: 999px;
  color: var(--basiq-color-content-subtle);
  background: var(--basiq-color-surface-container);
  font-size: 0.7rem;
  font-weight: 700;
}

.status-overview {
  display: grid;
  grid-template-columns: minmax(260px, 0.7fr) minmax(420px, 1.3fr);
  gap: 18px;
  margin-bottom: 30px;
  align-items: stretch;
}

.progress-card,
.current-card,
.share-card {
  --basiq-color-card-background: var(--basiq-color-surface-container);
}

.progress-card h2,
.current-card h2 {
  font-size: 1.1rem;
}

.progress-body {
  display: grid;
  gap: 12px;
}

.progress-number {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
}

.progress-number strong {
  color: var(--basiq-color-content-accent);
  font-size: 2.15rem;
  line-height: 1;
  letter-spacing: -0.05em;
}

.progress-number small {
  margin-left: 2px;
  font-size: 0.92rem;
}

.progress-number span {
  color: var(--basiq-color-content-subtle);
  font-size: 0.74rem;
  font-weight: 700;
}

.progress-foot {
  color: var(--basiq-color-content-subtle);
  font-size: 0.68rem;
  font-weight: 700;
  text-align: right;
}

.progress-track {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--basiq-color-accent-default) 15%, white);
}

.progress-track span {
  height: 100%;
  display: block;
  border-radius: inherit;
  background: var(--basiq-color-accent-default);
}

.current-content {
  min-height: 115px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}

.current-content > div {
  min-width: 0;
}

.current-label {
  color: var(--basiq-color-content-accent);
  font-size: 0.67rem;
  font-weight: 800;
}

.current-content p {
  margin-top: 2px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.76rem;
}

.current-meta {
  display: flex;
  gap: 14px;
  margin-top: 9px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.68rem;
}

.roadmap-content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 318px;
  gap: 34px;
  align-items: start;
}

.learning-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  margin-bottom: 15px;
}

.learning-heading h2,
.share-card h2 {
  font-size: 1.2rem;
}

.legend {
  display: flex;
  gap: 12px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.7rem;
}

.legend span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.legend span::before {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--basiq-color-border-control);
  content: "";
}

.legend .done::before {
  background: var(--app-success);
}

.legend .now::before {
  background: var(--basiq-color-accent-default);
}

.path-list {
  list-style: none;
}

.path-row {
  position: relative;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 12px;
  padding-bottom: 13px;
}

.path-row:not(:last-child)::after {
  position: absolute;
  z-index: 0;
  top: 40px;
  bottom: -4px;
  left: 22px;
  width: 2px;
  background: var(--basiq-color-border-separator);
  content: "";
}

.path-row.is-completed::after {
  background: color-mix(in srgb, var(--app-success) 38%, var(--basiq-color-border-separator));
}

.path-marker {
  z-index: 1;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  justify-self: center;
  margin-top: 14px;
  border: 2px solid var(--basiq-color-border-control);
  border-radius: 50%;
  color: var(--basiq-color-content-subtle);
  background: var(--basiq-color-surface-base);
  font-size: 0.66rem;
  font-weight: 800;
}

.is-completed .path-marker {
  border-color: var(--app-success);
  color: white;
  background: var(--app-success);
  font-size: 0.92rem;
}

.is-current .path-marker {
  border: 4px solid white;
  color: white;
  background: var(--basiq-color-accent-default);
  box-shadow: 0 0 0 2px var(--basiq-color-accent-default);
}

.path-link {
  text-decoration: none;
}

.path-card {
  --basiq-color-card-background: var(--basiq-color-surface-base);
}

.is-completed .path-card {
  --basiq-color-card-background: var(--app-success-soft);
}

.is-current .path-card {
  --basiq-color-card-background: var(--app-accent-soft);
}

.path-card-content {
  min-height: 94px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
}

.path-card-content > div {
  min-width: 0;
}

.path-card-content > :deep(.app-icon) {
  color: var(--basiq-color-content-subtle);
}

.path-status {
  color: var(--basiq-color-content-subtle);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.is-completed .path-status {
  color: var(--app-success);
}

.is-current .path-status {
  color: var(--basiq-color-content-accent);
}

.path-card h3 {
  margin-top: 3px;
  font-size: 0.98rem;
}

.path-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 8px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.68rem;
}

.path-meta span::before {
  margin-right: 5px;
  color: var(--basiq-color-border-control);
  content: "•";
}

.current-meta span + span::before {
  margin-right: 8px;
  content: "•";
}

.side-rail {
  display: grid;
  gap: 18px;
}

.full-button {
  width: 100%;
}

.share-card textarea {
  min-height: 212px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.68rem;
  line-height: 1.55;
}

@media (width <= 1020px) {
  .roadmap-detail-page {
    padding-inline: 28px;
  }

  .roadmap-content-grid {
    grid-template-columns: minmax(0, 1fr) 284px;
    gap: 24px;
  }

  .status-overview {
    grid-template-columns: minmax(230px, 0.75fr) minmax(360px, 1.25fr);
  }
}

@media (width <= 760px) {
  .roadmap-detail-page {
    padding: 20px 16px 46px;
  }

  .roadmap-hero {
    display: block;
    margin-bottom: 18px;
  }

  .roadmap-hero h1 {
    font-size: 1.72rem;
  }

  .roadmap-hero > button {
    width: 100%;
    margin-top: 16px;
  }

  .status-overview {
    grid-template-columns: 1fr;
    gap: 14px;
    margin-bottom: 26px;
  }

  .current-content {
    min-height: 132px;
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }

  .current-content > button {
    width: 100%;
  }

  .roadmap-content-grid {
    display: flex;
    flex-direction: column;
    gap: 26px;
  }

  .learning-path,
  .side-rail {
    width: 100%;
  }

  .learning-heading {
    display: block;
  }

  .legend {
    margin-top: 10px;
  }

  .path-row {
    grid-template-columns: 38px minmax(0, 1fr);
    gap: 8px;
    padding-bottom: 10px;
  }

  .path-row:not(:last-child)::after {
    top: 37px;
    bottom: -1px;
    left: 18px;
  }

  .path-marker {
    width: 30px;
    height: 30px;
    margin-top: 13px;
  }

  .path-card-content {
    min-height: 102px;
    gap: 8px;
  }

  .path-card h3 {
    font-size: 0.9rem;
  }
}
</style>
