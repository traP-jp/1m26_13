<script setup lang="ts">
import { BasiqButton, BasiqTabs } from "basiq-ui";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getLecture, setCompletion, type Lecture, type Session } from "@/api/resources";
import AppIcon from "@/components/AppIcon.vue";
import LectureRoundDetail from "@/components/LectureRoundDetail.vue";

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
function roundFor(value: string) {
  return rounds.value.find((round) => String(round.round) === value);
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
        ><template #content="{ item }">
          <template v-for="round in [roundFor(item.value)]" :key="round?.round ?? item.value">
            <LectureRoundDetail
              v-if="round"
              :lecture="lecture"
              :round="round"
              :updating="updating"
              @toggle-completion="toggleCompletion"
            />
          </template> </template
      ></BasiqTabs>

      <LectureRoundDetail
        v-else-if="activeRound"
        :lecture="lecture"
        :round="activeRound"
        :updating="updating"
        @toggle-completion="toggleCompletion"
      />
      <div v-else-if="!rounds.length" class="empty-state">公開中の開催はありません。</div>
    </template>
  </div>
</template>

<style scoped>
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
  gap: 0;

  --basiq-color-tabs-content-background: var(--basiq-color-surface-base);
}

.session-tabs :deep([role="tabpanel"]) {
  width: 100%;
  margin-inline: 0;
  padding: 0;
  background: var(--basiq-color-surface-base);
}

@media (width <= 980px) {
  .lecture-detail-page {
    width: calc(100% - 48px);
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
}
</style>
