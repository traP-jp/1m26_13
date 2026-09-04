<script setup lang="ts">
import { BasiqButton, BasiqCard, BasiqTabs } from "basiq-ui";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getLecture, setCompletion, type Lecture, type Session } from "@/api/resources";
import AppIcon from "@/components/AppIcon.vue";

const route = useRoute();
const router = useRouter();
const lecture = ref<Lecture>();
type RoundGroup = {
  round: number;
  order: number;
  sessions: Session[];
  normal?: Session;
};

const selectedRound = ref("1");
const loading = ref(true);
const updating = ref(false);
const error = ref("");
const rounds = computed<RoundGroup[]>(() => {
  const byOrder = new Map<number, Session[]>();
  for (const session of lecture.value?.sessions ?? []) {
    const sessions = byOrder.get(session.order) ?? [];
    sessions.push(session);
    byOrder.set(session.order, sessions);
  }
  return [...byOrder.entries()]
    .sort(([left], [right]) => left - right)
    .map(([order, sessions], index) => {
      const sorted = [...sessions].sort(
        (left, right) => Number(left.isReplay) - Number(right.isReplay),
      );
      return {
        round: index + 1,
        order,
        sessions: sorted,
        normal: sorted.find((session) => !session.isReplay),
      };
    });
});
const roundTabs = computed(() =>
  rounds.value.map((round) => ({ value: String(round.round), label: `第${round.round}回` })),
);
const activeRound = computed(() =>
  rounds.value.find((round) => String(round.round) === selectedRound.value),
);
const activeNormalSession = computed(() => activeRound.value?.normal);
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
    await nextTick();
    syncRoundFromHash();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "読み込めませんでした";
  } finally {
    loading.value = false;
  }
}
async function toggleCompletion() {
  const session = activeNormalSession.value;
  if (!session) return;
  const sessionId = session.id;
  const wasCompleted = session.isCompleted;
  const scrollPosition = { left: window.scrollX, top: window.scrollY };
  updating.value = true;
  error.value = "";
  try {
    await setCompletion(sessionId, !wasCompleted);
    if (!lecture.value) return;
    const completedSessionCount = Math.max(
      0,
      Math.min(
        lecture.value.requiredSessionCount,
        lecture.value.completedSessionCount + (wasCompleted ? -1 : 1),
      ),
    );
    lecture.value = {
      ...lecture.value,
      sessions: lecture.value.sessions.map((session) =>
        session.id === sessionId ? { ...session, isCompleted: !wasCompleted } : session,
      ),
      completedSessionCount,
      isCompleted:
        lecture.value.requiredSessionCount > 0 &&
        completedSessionCount === lecture.value.requiredSessionCount,
    };
    await nextTick();
    window.scrollTo(scrollPosition);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "完了記録を更新できませんでした";
  } finally {
    updating.value = false;
  }
}
function formatDate(date?: string, time?: string) {
  return `${date || "日時未定"}${time ? ` ${time}` : ""}`;
}

function syncRoundFromHash() {
  if (rounds.value.length <= 1) {
    selectedRound.value = "1";
    if (route.hash) void router.replace({ hash: "" });
    return;
  }
  const match = /^#([1-9][0-9]*)$/.exec(route.hash);
  const requested = match ? Number(match[1]) : 1;
  const round = rounds.value.some((entry) => entry.round === requested) ? requested : 1;
  selectedRound.value = String(round);
  if (route.hash !== `#${round}`) void router.replace({ hash: `#${round}` });
}

function selectRound(value: string) {
  selectedRound.value = value;
  if (route.hash !== `#${value}`) void router.push({ hash: `#${value}` });
}

watch(() => route.hash, syncRoundFromHash);
watch(() => route.params.id, load);
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
            ><span v-if="lecture.isIntroductory">初心者向け</span><span>{{ rounds.length }}回</span>
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
        v-if="roundTabs.length > 1"
        :model-value="selectedRound"
        :items="roundTabs"
        aria-label="講習会の回"
        class="session-tabs"
        @update:model-value="selectRound"
        ><template #content><span /></template
      ></BasiqTabs>

      <div v-if="activeRound" class="detail-grid" :data-round="activeRound.round">
        <div class="detail-main">
          <section class="content-section">
            <div class="content-heading">
              <p class="section-kicker">ROUND {{ activeRound.round }}</p>
              <h2>第{{ activeRound.round }}回の開催</h2>
            </div>
            <div class="round-session-list">
              <BasiqCard
                v-for="session in activeRound.sessions"
                :key="session.id"
                class="session-card"
              >
                <template #header>
                  <div class="session-heading">
                    <h3>{{ session.name }}</h3>
                    <span v-if="session.isReplay" class="replay-label">再放送</span>
                  </div>
                </template>
                <p class="session-description">
                  {{ session.description || "この開催の説明はまだありません。" }}
                </p>
                <dl class="session-facts">
                  <div>
                    <dt><AppIcon name="calendar" :size="16" />日時</dt>
                    <dd>{{ formatDate(session.date, session.startTime) }}</dd>
                  </div>
                  <div>
                    <dt><AppIcon name="pin" :size="16" />場所</dt>
                    <dd>{{ session.location || "未定" }}</dd>
                  </div>
                  <div>
                    <dt><AppIcon name="user" :size="16" />講師</dt>
                    <dd>
                      {{
                        session.instructorIds.length
                          ? `${session.instructorIds.length}人`
                          : "未設定"
                      }}
                    </dd>
                  </div>
                </dl>
                <ul v-if="session.resources.length" class="resource-links session-resources">
                  <li v-for="resource in session.resources" :key="resource.url">
                    <a :href="resource.url" target="_blank" rel="noopener noreferrer"
                      ><span>{{ resource.title || resource.url }}</span
                      ><span aria-hidden="true">↗</span></a
                    >
                  </li>
                </ul>
                <p v-else class="empty-copy">この開催の教材は準備中です。</p>
              </BasiqCard>
            </div>
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
          <BasiqCard v-if="activeNormalSession" class="learning-card">
            <template #header><h2>学習状況</h2></template>
            <div :class="['status-block', { completed: activeNormalSession.isCompleted }]">
              <span class="status-mark"
                ><AppIcon :name="activeNormalSession.isCompleted ? 'check' : 'record'" :size="21"
              /></span>
              <span
                ><strong>{{ activeNormalSession.isCompleted ? "完了済み" : "未完了" }}</strong
                ><small>{{
                  activeNormalSession.isCompleted
                    ? "プロフィールに記録済みです"
                    : "受講後に完了を記録できます"
                }}</small></span
              >
            </div>
            <BasiqButton
              class="completion-button"
              :tone="activeNormalSession.isCompleted ? 'neutral' : 'accent'"
              :variant="activeNormalSession.isCompleted ? 'outline' : 'solid'"
              :disabled="updating"
              @click="toggleCompletion"
              >{{
                activeNormalSession.isCompleted ? "完了を取り消す" : "受講し終わった"
              }}</BasiqButton
            >
          </BasiqCard>
          <BasiqCard v-else>
            <template #header><h2>学習状況</h2></template>
            <p class="empty-copy">この回には完了を記録できる通常開催がありません。</p>
          </BasiqCard>
          <BasiqCard>
            <template #header
              ><h2>第{{ activeRound.round }}回</h2></template
            >
            <p class="round-summary">
              通常開催 {{ activeRound.normal ? 1 : 0 }}件 · 再放送
              {{ activeRound.sessions.filter((session) => session.isReplay).length }}件
            </p>
          </BasiqCard>
        </aside>
      </div>
      <div v-else class="empty-state">公開中の開催はありません。</div>
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

.meta-tags span,
.replay-label {
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

.section-kicker {
  margin-bottom: 4px;
  color: var(--basiq-color-content-accent);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.1em;
}

.round-session-list {
  display: grid;
  gap: 16px;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid var(--basiq-color-border-separator);
}

.session-facts div {
  padding-top: 12px;
}

.session-facts dt {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.72rem;
}

.session-facts dd {
  margin: 2px 0 0 24px;
  font-size: 0.82rem;
}

.session-resources {
  margin-top: 16px;
}

.empty-copy,
.round-summary {
  color: var(--basiq-color-content-subtle);
}

.empty-copy {
  margin-top: 14px;
  font-size: 0.84rem;
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
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--basiq-color-border-separator);
  border-radius: var(--basiq-radius-sm);
  color: var(--basiq-color-content-accent);
  text-decoration: none;
  overflow-wrap: anywhere;
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

  .detail-main {
    width: 100%;
  }

  .detail-rail {
    width: 100%;
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
