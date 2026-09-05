<script setup lang="ts">
import { BasiqButton, BasiqCard } from "basiq-ui";

import type { Lecture, Session } from "@/api/resources";
import AppIcon from "@/components/AppIcon.vue";

type RoundGroup = {
  round: number;
  order: number;
  sessions: Session[];
  normal?: Session;
};

defineProps<{ lecture: Lecture; round: RoundGroup; updating: boolean }>();
defineEmits<{ toggleCompletion: [] }>();

function formatDate(date?: string, time?: string) {
  return `${date || "日時未定"}${time ? ` ${time}` : ""}`;
}

function openResource(url: string) {
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened) opened.opener = null;
}
</script>

<template>
  <div class="detail-grid" :data-round="round.round">
    <div class="detail-main">
      <section class="content-section">
        <div class="content-heading">
          <h2>この回で学べること</h2>
        </div>
        <div class="round-session-list">
          <BasiqCard v-for="session in round.sessions" :key="session.id" class="session-card">
            <template #header>
              <div class="session-heading">
                <h3>{{ session.name }}</h3>
                <div v-if="session.resources.length" class="resource-actions">
                  <BasiqButton
                    v-for="resource in session.resources"
                    :key="resource.url"
                    type="button"
                    tone="neutral"
                    variant="outline"
                    @click="openResource(resource.url)"
                    ><AppIcon name="book" :size="16" />{{
                      resource.title?.trim() || "教材を開く"
                    }}</BasiqButton
                  >
                </div>
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
                  {{ session.instructorId ? "1人" : "未設定" }}
                </dd>
              </div>
            </dl>
            <p v-if="!session.resources.length" class="empty-copy">この回の教材は準備中です。</p>
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
        <div class="resource-actions resource-actions-section">
          <BasiqButton
            v-for="resource in lecture.resources"
            :key="resource.url"
            type="button"
            tone="neutral"
            variant="outline"
            @click="openResource(resource.url)"
            ><AppIcon name="book" :size="16" />{{
              resource.title?.trim() || "教材を開く"
            }}</BasiqButton
          >
        </div>
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
      <BasiqCard v-if="round.normal" class="learning-card">
        <template #header><h2>学習状況</h2></template>
        <div :class="['status-block', { completed: round.normal.isCompleted }]">
          <span class="status-mark"
            ><AppIcon :name="round.normal.isCompleted ? 'check' : 'record'" :size="21"
          /></span>
          <span
            ><strong>{{ round.normal.isCompleted ? "完了済み" : "未完了" }}</strong
            ><small>{{
              round.normal.isCompleted ? "プロフィールに記録済みです" : "受講後に完了を記録できます"
            }}</small></span
          >
        </div>
        <BasiqButton
          class="completion-button"
          :tone="round.normal.isCompleted ? 'neutral' : 'accent'"
          :variant="round.normal.isCompleted ? 'outline' : 'solid'"
          :disabled="updating"
          @click="$emit('toggleCompletion')"
          >{{ round.normal.isCompleted ? "完了を取り消す" : "受講し終わった" }}</BasiqButton
        >
      </BasiqCard>
      <BasiqCard>
        <template #header><h2>今回の開催</h2></template>
        <dl class="round-facts">
          <div>
            <dt><AppIcon name="calendar" :size="16" />日時</dt>
            <dd>{{ formatDate(round.normal?.date, round.normal?.startTime) }}</dd>
          </div>
          <div>
            <dt><AppIcon name="pin" :size="16" />場所</dt>
            <dd>{{ round.normal?.location || "未定" }}</dd>
          </div>
          <div>
            <dt><AppIcon name="user" :size="16" />講師・運営</dt>
            <dd>
              {{ round.normal?.instructorId ? "1人" : "未設定" }}
            </dd>
          </div>
        </dl>
      </BasiqCard>
    </aside>
  </div>
</template>

<style scoped>
/* stylelint-disable no-descending-specificity */
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

.empty-copy {
  color: var(--basiq-color-content-subtle);
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

.resource-actions {
  max-width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.resource-actions :deep(button) {
  max-width: 100%;
  overflow-wrap: anywhere;
}

.resource-actions-section {
  justify-content: flex-start;
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

.round-facts {
  display: grid;
  gap: 14px;
}

.round-facts dt {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.72rem;
}

.round-facts dd {
  margin: 3px 0 0 24px;
  font-size: 0.82rem;
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
  .detail-grid {
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 24px;
  }
}

@media (width <= 760px) {
  .detail-grid {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .detail-main,
  .detail-rail {
    width: 100%;
  }

  .audience-grid,
  .connection-grid,
  .session-facts {
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

  .session-facts div:last-child {
    grid-column: auto;
  }
}

@media (width <= 430px) {
  .session-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .resource-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .resource-actions :deep(button) {
    width: 100%;
  }
}
</style>
