<script setup lang="ts">
import { BasiqButton, BasiqCard, BasiqTabs } from "basiq-ui";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getLecture, setCompletion, type Lecture } from "@/api/resources";
import AppIcon from "@/components/AppIcon.vue";

const route = useRoute();
const router = useRouter();
const lecture = ref<Lecture>();
const selectedSessionId = ref("");
const loading = ref(true);
const updating = ref(false);
const error = ref("");
const sessionTabs = computed(() =>
  (lecture.value?.sessions ?? []).map((session, index) => ({
    value: session.id,
    label: `第${index + 1}回 ${session.name}`,
  })),
);
const activeSession = computed(
  () =>
    lecture.value?.sessions.find((session) => session.id === selectedSessionId.value) ??
    lecture.value?.sessions[0],
);
const yearLabel = computed(() => {
  if (!lecture.value) return "";
  return lecture.value.academicYearStart === lecture.value.academicYearEnd
    ? `${lecture.value.academicYearStart}年度`
    : `${lecture.value.academicYearStart}–${lecture.value.academicYearEnd}年度`;
});

async function load() {
  loading.value = true;
  error.value = "";
  try {
    lecture.value = await getLecture(String(route.params.id));
    if (!lecture.value.sessions.some((session) => session.id === selectedSessionId.value))
      selectedSessionId.value = lecture.value.sessions[0]?.id ?? "";
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "読み込めませんでした";
  } finally {
    loading.value = false;
  }
}
async function toggleCompletion() {
  if (!activeSession.value || activeSession.value.isReplay) return;
  updating.value = true;
  try {
    await setCompletion(activeSession.value.id, !activeSession.value.isCompleted);
    await load();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "完了記録を更新できませんでした";
  } finally {
    updating.value = false;
  }
}
function formatDate(date?: string, time?: string) {
  return `${date || "日時未定"}${time ? ` ${time}` : ""}`;
}
onMounted(load);
</script>

<template>
  <div class="page lecture-detail-page">
    <div v-if="loading" class="loading-state">講習会を読み込んでいます</div>
    <div v-else-if="error && !lecture" class="error-state" role="alert">
      <p>{{ error }}</p>
      <BasiqButton tone="neutral" variant="outline" @click="load">再試行</BasiqButton>
    </div>
    <template v-else-if="lecture">
      <nav class="breadcrumb" aria-label="パンくずリスト">
        <RouterLink to="/">ホーム</RouterLink><AppIcon name="chevron" :size="14" /><span
          >講習会</span
        ><AppIcon name="chevron" :size="14" /><strong>詳細</strong>
      </nav>
      <header class="lecture-heading">
        <div>
          <div class="meta-tags">
            <span>{{ yearLabel }}</span
            ><span v-if="lecture.isIntroductory">初心者向け</span
            ><span>{{ lecture.sessions.length }}開催</span>
          </div>
          <h1>{{ lecture.name }}</h1>
          <p>{{ lecture.description || "この講習会の説明はまだありません。" }}</p>
        </div>
        <BasiqButton
          tone="neutral"
          variant="outline"
          @click="router.push(`/admin/lectures/${lecture.id}`)"
          ><AppIcon name="edit" :size="17" />編集</BasiqButton
        >
      </header>
      <p v-if="error" class="notice error" role="alert">{{ error }}</p>

      <BasiqTabs
        v-if="sessionTabs.length > 1"
        v-model="selectedSessionId"
        :items="sessionTabs"
        aria-label="講習会の開催"
        class="session-tabs"
        ><template #content><span /></template
      ></BasiqTabs>

      <div v-if="activeSession" class="detail-grid">
        <div class="detail-main">
          <section class="content-section">
            <div class="content-heading"><h2>この回で学べること</h2></div>
            <BasiqCard class="session-card">
              <template #header>
                <div class="session-heading">
                  <h3>{{ activeSession.name }}</h3>
                  <BasiqButton
                    v-if="activeSession.resources.length"
                    tone="neutral"
                    variant="outline"
                    @click="router.push(`/sessions/${activeSession.id}`)"
                    ><AppIcon name="book" :size="17" />教材</BasiqButton
                  >
                </div>
              </template>
              <p class="session-description">
                {{ activeSession.description || "この回の説明はまだありません。" }}
              </p>
              <dl class="session-facts">
                <div>
                  <dt><AppIcon name="calendar" :size="16" />日時</dt>
                  <dd>{{ formatDate(activeSession.date, activeSession.startTime) }}</dd>
                </div>
                <div>
                  <dt><AppIcon name="pin" :size="16" />場所</dt>
                  <dd>{{ activeSession.location || "未定" }}</dd>
                </div>
                <div>
                  <dt><AppIcon name="book" :size="16" />教材</dt>
                  <dd>
                    {{
                      activeSession.resources.length
                        ? `${activeSession.resources.length}件`
                        : "準備中"
                    }}
                  </dd>
                </div>
              </dl>
            </BasiqCard>
          </section>

          <section class="content-section audience-grid">
            <div>
              <h2>対象者</h2>
              <p>{{ lecture.targetAudience || "指定なし" }}</p>
            </div>
            <div>
              <h2>前提知識</h2>
              <p>
                {{
                  lecture.relations.some((relation) => relation.type === "prerequisite")
                    ? "関連する前提講習会があります。"
                    : "特別な前提はありません。"
                }}
              </p>
            </div>
          </section>

          <section v-if="lecture.resources.length" class="content-section">
            <div class="content-heading"><h2>講習会全体の教材</h2></div>
            <ul class="resource-links">
              <li v-for="resource in lecture.resources" :key="resource.url">
                <a :href="resource.url" target="_blank" rel="noopener noreferrer"
                  ><span>{{ resource.title || resource.url }}</span
                  ><span aria-hidden="true">↗</span></a
                >
              </li>
            </ul>
          </section>

          <section v-if="lecture.relations.length" class="content-section">
            <div class="content-heading"><h2>前後の講習会</h2></div>
            <div class="connection-grid">
              <RouterLink
                v-for="relation in lecture.relations"
                :key="`${relation.type}-${relation.toLectureId}`"
                :to="`/lectures/${relation.toLectureId}`"
                ><span>{{
                  relation.type === "prerequisite"
                    ? "先に学ぶ"
                    : relation.type === "recommended_next"
                      ? "次に学ぶ"
                      : "前年度"
                }}</span
                ><strong>関連する講習会</strong><AppIcon name="chevron" :size="17"
              /></RouterLink>
            </div>
          </section>
        </div>

        <aside class="detail-rail">
          <BasiqCard class="learning-card">
            <template #header><h2>学習状況</h2></template>
            <div :class="['status-block', { completed: activeSession.isCompleted }]">
              <span class="status-mark"
                ><AppIcon :name="activeSession.isCompleted ? 'check' : 'record'" :size="21"
              /></span>
              <span
                ><strong>{{ activeSession.isCompleted ? "完了済み" : "未完了" }}</strong
                ><small>{{
                  activeSession.isCompleted
                    ? "プロフィールに記録済みです"
                    : "受講後に完了を記録できます"
                }}</small></span
              >
            </div>
            <BasiqButton
              class="completion-button"
              :tone="activeSession.isCompleted ? 'neutral' : 'accent'"
              :variant="activeSession.isCompleted ? 'outline' : 'solid'"
              :disabled="updating"
              @click="toggleCompletion"
              >{{ activeSession.isCompleted ? "完了を取り消す" : "受講し終わった" }}</BasiqButton
            >
          </BasiqCard>
          <BasiqCard>
            <template #header><h2>今回の開催</h2></template>
            <dl class="rail-facts">
              <div>
                <dt><AppIcon name="calendar" :size="16" />日時</dt>
                <dd>{{ formatDate(activeSession.date, activeSession.startTime) }}</dd>
              </div>
              <div>
                <dt><AppIcon name="pin" :size="16" />場所</dt>
                <dd>{{ activeSession.location || "未定" }}</dd>
              </div>
              <div>
                <dt><AppIcon name="user" :size="16" />講師</dt>
                <dd>
                  {{
                    activeSession.instructorIds.length
                      ? `${activeSession.instructorIds.length}人`
                      : "未設定"
                  }}
                </dd>
              </div>
            </dl>
          </BasiqCard>
          <BasiqButton
            tone="neutral"
            variant="outline"
            @click="router.push(`/sessions/${activeSession.id}`)"
            >開催詳細を開く<AppIcon name="arrow" :size="17"
          /></BasiqButton>
        </aside>
      </div>
      <div v-else class="empty-state">公開中の通常開催はありません。</div>
    </template>
  </div>
</template>

<style scoped>
/* stylelint-disable no-descending-specificity */
.lecture-detail-page {
  width: min(1160px, calc(100% - 80px));
  padding: 32px 0 72px;
}

.breadcrumb strong {
  color: var(--basiq-color-content-default);
}

.lecture-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.lecture-heading > div {
  min-width: 0;
}

.lecture-heading h1 {
  margin-top: 12px;
  font-size: clamp(1.8rem, 3vw, 2.25rem);
  line-height: 1.25;
  letter-spacing: -0.03em;
}

.lecture-heading p {
  max-width: 760px;
  margin-top: 8px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.98rem;
}

.meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-tags span {
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--basiq-radius-sm);
  color: var(--basiq-color-content-subtle);
  background: var(--basiq-color-surface-container);
  font-size: 0.73rem;
  font-weight: 700;
}

.session-tabs {
  margin-top: 24px;

  --basiq-color-tabs-content-background: var(--basiq-color-surface-base);
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 40px;
  align-items: start;
  margin-top: 24px;
}

.content-section {
  padding-block: 24px;
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.content-section:first-child {
  padding-top: 0;
}

.content-section h2 {
  font-size: 1.2rem;
}

.content-heading {
  margin-bottom: 16px;
}

.session-card {
  border: 1px solid var(--basiq-color-border-separator);

  --basiq-color-card-background: var(--basiq-color-surface-base);
}

.session-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.session-heading h3 {
  font-size: 1rem;
}

.session-description {
  color: var(--basiq-color-content-subtle);
  line-height: 1.75;
}

.session-facts {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid var(--basiq-color-border-separator);
}

.session-facts div {
  padding-top: 12px;
}

.session-facts div:last-child {
  grid-column: 1 / -1;
}

.session-facts dt,
.rail-facts dt {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.72rem;
}

.session-facts dd,
.rail-facts dd {
  margin: 2px 0 0 24px;
  font-size: 0.82rem;
}

.audience-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 32px;
}

.audience-grid > div + div {
  padding-left: 32px;
  border-left: 1px solid var(--basiq-color-border-separator);
}

.audience-grid p {
  margin-top: 12px;
  color: var(--basiq-color-content-subtle);
}

.resource-links {
  display: grid;
  gap: 8px;
  list-style: none;
}

.resource-links a {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
  color: var(--basiq-color-content-accent);
  text-decoration: none;
}

.connection-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
}

.connection-grid a {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 2px 12px;
  padding: 12px 16px;
  text-decoration: none;
}

.connection-grid a + a {
  border-left: 1px solid var(--basiq-color-border-separator);
}

.connection-grid span {
  grid-column: 1 / -1;
  color: var(--basiq-color-content-subtle);
  font-size: 0.7rem;
}

.connection-grid strong {
  color: var(--basiq-color-content-accent);
  font-size: 0.85rem;
}

.detail-rail {
  display: grid;
  gap: 16px;
}

.detail-rail h2 {
  font-size: 1.02rem;
}

.learning-card {
  --basiq-color-card-background: var(--app-accent-faint);
}

.status-block {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--basiq-radius-sm);
  background: var(--basiq-color-surface-base);
}

.status-block > span:last-child {
  display: flex;
  flex-direction: column;
}

.status-block small {
  color: var(--basiq-color-content-subtle);
}

.status-mark {
  color: var(--basiq-color-content-accent);
}

.status-block.completed {
  color: var(--app-success);
  background: var(--app-success-soft);
}

.completion-button {
  width: 100%;
  margin-top: 12px;
}

.rail-facts div {
  padding-block: 8px;
  border-top: 1px solid var(--basiq-color-border-separator);
}

@media (width <= 980px) {
  .lecture-detail-page {
    width: calc(100% - 48px);
  }

  .detail-grid {
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 24px;
  }
}

@media (width <= 760px) {
  .lecture-detail-page {
    width: auto;
    margin-inline: 16px;
    padding: 24px 0 32px;
  }

  .lecture-heading {
    flex-direction: column;
    gap: 16px;
  }

  .lecture-heading h1 {
    font-size: 1.72rem;
  }

  .detail-grid {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .detail-rail {
    width: 100%;
    order: 1;
  }

  .detail-main {
    width: 100%;
    order: 2;
  }

  .audience-grid,
  .connection-grid {
    grid-template-columns: 1fr;
  }

  .audience-grid {
    gap: 24px;
  }

  .audience-grid > div + div {
    padding: 24px 0 0;
    border-top: 1px solid var(--basiq-color-border-separator);
    border-left: 0;
  }

  .connection-grid a + a {
    border-top: 1px solid var(--basiq-color-border-separator);
    border-left: 0;
  }

  .session-facts {
    grid-template-columns: 1fr;
  }

  .session-facts div:last-child {
    grid-column: auto;
  }
}

@media (width <= 430px) {
  .session-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .session-heading button {
    width: 100%;
  }
}
</style>
