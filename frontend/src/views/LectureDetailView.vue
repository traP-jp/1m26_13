<script setup lang="ts">
import { BasiqButton, BasiqTabs } from "basiq-ui";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  getDirectory,
  getLecture,
  listLectures,
  setCompletion,
  type Lecture,
  type Session,
} from "@/api/resources";
import AppIcon from "@/components/AppIcon.vue";
import LectureRoundDetail from "@/components/LectureRoundDetail.vue";

const route = useRoute();
const router = useRouter();
const lecture = ref<Lecture>();
const lectureNames = ref<Record<string, string>>({});
const instructorNames = ref<Record<string, string>>({});
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
  const sessions = [...(lecture.value?.sessions ?? [])].sort(
    (left, right) => left.order - right.order,
  );
  const normalSessions = sessions.filter((session) => !session.isReplay);
  const groupedReplayIds = new Set<string>();
  const groups: RoundGroup[] = normalSessions.map((session, index) => {
    const replays = sessions.filter(
      (candidate) =>
        candidate.isReplay &&
        candidate.replayOfSessionIds.includes(session.id) &&
        !groupedReplayIds.has(candidate.id),
    );
    replays.forEach((replay) => groupedReplayIds.add(replay.id));
    return {
      round: index + 1,
      order: session.order,
      sessions: [session, ...replays],
      normal: session,
    };
  });
  for (const replay of sessions.filter(
    (session) => session.isReplay && !groupedReplayIds.has(session.id),
  )) {
    groups.push({ round: groups.length + 1, order: replay.order, sessions: [replay] });
  }
  return groups;
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
    const [value, allLectures, directory] = await Promise.all([
      getLecture(String(route.params.id)),
      listLectures().catch(() => []),
      getDirectory().catch(() => ({ users: [], groups: [] })),
    ]);
    lecture.value = value;
    lectureNames.value = Object.fromEntries(allLectures.map((item) => [item.id, item.name]));
    instructorNames.value = Object.fromEntries(
      directory.users.map((user) => [user.id, `${user.displayName} (@${user.traqId})`]),
    );
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

function roundHash(round: string | number) {
  return `#第${round}回`;
}

function decodeHash(hash: string) {
  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
}

function roundFromHash(hash: string) {
  const decoded = decodeHash(hash);
  const current = /^#第([1-9][0-9]*)回$/.exec(decoded);
  const legacy = /^#([1-9][0-9]*)$/.exec(decoded);
  return Number(current?.[1] ?? legacy?.[1] ?? 1);
}

function syncRoundFromHash() {
  if (rounds.value.length <= 1) {
    selectedRound.value = "1";
    if (route.hash) void router.replace({ hash: "" });
    return;
  }
  const requested = roundFromHash(route.hash);
  const round = rounds.value.some((entry) => entry.round === requested) ? requested : 1;
  selectedRound.value = String(round);
  if (roundFromHash(route.hash) !== round || decodeHash(route.hash) !== roundHash(round)) {
    void router.replace({ hash: roundHash(round) });
  }
}

function selectRound(value: string) {
  selectedRound.value = value;
  if (decodeHash(route.hash) !== roundHash(value)) {
    void router.push({ hash: roundHash(value) });
  }
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
        <RouterLink to="/">ホーム</RouterLink><AppIcon name="chevron" :size="14" /><RouterLink
          to="/lectures"
          >講習会</RouterLink
        ><AppIcon name="chevron" :size="14" /><strong>詳細</strong>
      </nav>
      <header class="lecture-heading">
        <div>
          <div class="meta-tags">
            <span>{{ yearLabel }}</span
            ><span v-if="lecture.isIntroductory">初心者向け</span><span>{{ rounds.length }}回</span>
          </div>
          <h1>{{ lecture.name }}</h1>
          <p v-if="lecture.description">{{ lecture.description }}</p>
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
              :lecture-names="lectureNames"
              :instructor-names="instructorNames"
              :updating="updating"
              @toggle-completion="toggleCompletion"
            />
          </template> </template
      ></BasiqTabs>

      <LectureRoundDetail
        v-else-if="activeRound"
        :lecture="lecture"
        :round="activeRound"
        :lecture-names="lectureNames"
        :instructor-names="instructorNames"
        :updating="updating"
        @toggle-completion="toggleCompletion"
      />
      <div v-else-if="!rounds.length" class="empty-state">公開中の開催はありません。</div>
    </template>
  </div>
</template>

<style scoped>
.lecture-detail-page {
  width: min(1080px, 100%);
}

.breadcrumb strong {
  color: var(--basiq-color-content-default);
}

.lecture-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.lecture-heading > div {
  min-width: 0;
}

.lecture-heading h1 {
  margin-top: 8px;
  font-size: 1.5rem;
  line-height: 1.5;
  letter-spacing: normal;
  overflow-wrap: anywhere;
}

.lecture-heading p {
  max-width: 760px;
  margin-top: 8px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.875rem;
  overflow-wrap: anywhere;
}

.meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-tags span {
  display: inline-flex;
  align-items: center;
  color: var(--basiq-color-content-subtle);
  font-size: 0.75rem;
}

.meta-tags span + span::before {
  margin-right: 8px;
  color: var(--basiq-color-border-control);
  content: "·";
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
    width: 100%;
  }
}

@media (width <= 760px) {
  .lecture-detail-page {
    width: 100%;
    margin-inline: 0;
    padding: 16px 16px 40px;
  }

  .lecture-heading {
    flex-direction: column;
    gap: 16px;
  }

  .lecture-heading h1 {
    font-size: 1.5rem;
  }
}
</style>
