<script setup lang="ts">
import { BasiqButton } from "basiq-ui";
import { computed } from "vue";

import type { Lecture, Session } from "@/api/resources";
import AppIcon from "@/components/AppIcon.vue";

type RoundGroup = {
  round: number;
  order: number;
  sessions: Session[];
  normal?: Session;
};

const props = withDefaults(
  defineProps<{
    lecture: Lecture;
    round: RoundGroup;
    updating: boolean;
    lectureNames?: Record<string, string>;
    instructorNames?: Record<string, string>;
  }>(),
  { lectureNames: () => ({}), instructorNames: () => ({}) },
);
defineEmits<{ toggleCompletion: [] }>();

type Resource = Lecture["resources"][number];

function relatedResources(source: { material?: Resource | null; resources: Resource[] }) {
  const seen = new Set<string>();
  const values = source.material ? [source.material, ...source.resources] : source.resources;
  return values.filter((resource) => {
    const url = resource.url.trim();
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

const sessionRows = computed(() =>
  props.round.sessions.map((session) => ({ session, resources: relatedResources(session) })),
);
const lectureResources = computed(() => relatedResources(props.lecture));

function formatDate(date?: string, time?: string) {
  return `${date || "未設定"}${time ? ` ${time}` : ""}`;
}
</script>

<template>
  <div class="detail-grid" :data-round="round.round">
    <div class="detail-main">
      <section class="content-section">
        <div class="content-heading">
          <h2>開催情報</h2>
        </div>
        <div class="round-session-list">
          <section
            v-for="{ session, resources } in sessionRows"
            :key="session.id"
            class="session-block"
          >
            <div class="session-heading">
              <h3>{{ session.name }}</h3>
              <span v-if="session.isReplay">別日程</span>
            </div>
            <p v-if="session.description" class="session-description">
              {{ session.description }}
            </p>
            <dl class="session-facts">
              <div>
                <dt><AppIcon name="calendar" :size="16" />日時</dt>
                <dd>{{ formatDate(session.date, session.startTime) }}</dd>
              </div>
              <div>
                <dt><AppIcon name="pin" :size="16" />場所</dt>
                <dd>{{ session.location || "未設定" }}</dd>
              </div>
              <div>
                <dt><AppIcon name="user" :size="16" />講師</dt>
                <dd>
                  {{
                    session.instructorId
                      ? instructorNames[session.instructorId] || "講師情報を取得できません"
                      : "未設定"
                  }}
                </dd>
              </div>
            </dl>
            <div v-if="resources.length" class="resource-list">
              <a
                v-for="resource in resources.slice(0, 3)"
                :key="resource.url"
                :href="resource.url"
                target="_blank"
                rel="noopener noreferrer"
                ><AppIcon name="book" :size="16" />{{ resource.title?.trim() || "教材を開く" }}</a
              >
              <details v-if="resources.length > 3" class="more-resources">
                <summary>ほか{{ resources.length - 3 }}件の教材</summary>
                <a
                  v-for="resource in resources.slice(3)"
                  :key="resource.url"
                  :href="resource.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  ><AppIcon name="book" :size="16" />{{ resource.title?.trim() || "教材を開く" }}</a
                >
              </details>
            </div>
            <p v-else class="empty-copy">教材は未登録です。</p>
          </section>
        </div>
      </section>

      <section class="content-section audience-grid">
        <div>
          <h2>対象者</h2>
          <p>{{ lecture.targetAudience || "未登録" }}</p>
        </div>
        <div>
          <h2>前提知識</h2>
          <p>
            {{
              lecture.relations.some((relation) => relation.type === "prerequisite")
                ? "下記の「先に学ぶ」講習会を参照"
                : "未登録"
            }}
          </p>
        </div>
      </section>

      <section v-if="lectureResources.length" class="content-section">
        <div class="content-heading"><h2>講習会全体の教材</h2></div>
        <div class="resource-list">
          <a
            v-for="resource in lectureResources.slice(0, 3)"
            :key="resource.url"
            :href="resource.url"
            target="_blank"
            rel="noopener noreferrer"
            ><AppIcon name="book" :size="16" />{{ resource.title?.trim() || "教材を開く" }}</a
          >
          <details v-if="lectureResources.length > 3" class="more-resources">
            <summary>ほか{{ lectureResources.length - 3 }}件の教材</summary>
            <a
              v-for="resource in lectureResources.slice(3)"
              :key="resource.url"
              :href="resource.url"
              target="_blank"
              rel="noopener noreferrer"
              ><AppIcon name="book" :size="16" />{{ resource.title?.trim() || "教材を開く" }}</a
            >
          </details>
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
            ><strong>{{ lectureNames[relation.toLectureId] || "講習会を開く" }}</strong
            ><AppIcon name="chevron" :size="17"
          /></RouterLink>
        </div>
      </section>
    </div>

    <aside class="detail-rail">
      <section v-if="round.normal" class="learning-status" aria-label="受講状況">
        <h2>受講状況</h2>
        <div :class="['status-block', { completed: round.normal.isCompleted }]">
          <span class="status-mark"
            ><AppIcon :name="round.normal.isCompleted ? 'check' : 'record'" :size="18"
          /></span>
          <strong>{{ round.normal.isCompleted ? "完了済み" : "未完了" }}</strong>
        </div>
        <BasiqButton
          class="completion-button"
          :tone="round.normal.isCompleted ? 'neutral' : 'accent'"
          :variant="round.normal.isCompleted ? 'outline' : 'solid'"
          :disabled="updating"
          @click="$emit('toggleCompletion')"
          >{{ round.normal.isCompleted ? "完了を取り消す" : "完了として記録" }}</BasiqButton
        >
      </section>
    </aside>
  </div>
</template>

<style scoped>
/* stylelint-disable no-descending-specificity */
.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 24px;
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
  font-size: 1.125rem;
}

.content-heading {
  margin-bottom: 12px;
}

.round-session-list {
  display: grid;
  gap: 16px;
}

.session-block {
  min-width: 0;
}

.session-block + .session-block {
  padding-top: 16px;
  border-top: 1px solid var(--basiq-color-border-separator);
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

.session-heading > span {
  margin-right: auto;
  color: var(--basiq-color-content-subtle);
  font-size: 0.75rem;
}

.session-description {
  margin-top: 8px;
  color: var(--basiq-color-content-subtle);
  line-height: 1.7;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.session-facts {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.session-facts div {
  min-width: 0;
}

.session-facts dt {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.75rem;
}

.session-facts dd {
  margin: 4px 0 0 24px;
  font-size: 0.875rem;
  overflow-wrap: anywhere;
}

.empty-copy {
  color: var(--basiq-color-content-subtle);
  margin-top: 16px;
  font-size: 0.875rem;
}

.audience-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.audience-grid > div + div {
  min-width: 0;
}

.audience-grid p {
  margin-top: 8px;
  color: var(--basiq-color-content-subtle);
}

.resource-list {
  display: grid;
  margin-top: 12px;
}

.resource-list a {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding-block: 8px;
  color: var(--basiq-color-content-accent);
  text-decoration: none;
  overflow-wrap: anywhere;
}

.resource-list a:hover {
  text-decoration: underline;
}

.resource-list :deep(.app-icon) {
  flex: 0 0 auto;
  align-self: center;
}

.more-resources summary {
  width: fit-content;
  padding-block: 8px;
  color: var(--basiq-color-content-subtle);
  cursor: pointer;
}

.connection-grid {
  display: grid;
}

.connection-grid a {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 4px 12px;
  padding: 12px 0;
  text-decoration: none;
}

.connection-grid a + a {
  border-top: 1px solid var(--basiq-color-border-separator);
}

.connection-grid span {
  grid-column: 1 / -1;
  color: var(--basiq-color-content-subtle);
  font-size: 0.75rem;
}

.connection-grid strong {
  color: var(--basiq-color-content-accent);
  font-size: 0.875rem;
}

.detail-rail {
  display: grid;
  gap: 16px;
}

.detail-rail h2 {
  font-size: 1rem;
}

.learning-status {
  padding-left: 24px;
  border-left: 1px solid var(--basiq-color-border-separator);
}

.status-block {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.status-mark {
  color: var(--basiq-color-content-accent);
}

.status-block.completed {
  color: var(--app-success);
}

.completion-button {
  width: 100%;
  margin-top: 12px;
}

@media (width <= 980px) {
  .detail-grid {
    grid-template-columns: minmax(0, 1fr) 250px;
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

  .learning-status {
    padding: 16px 0 0;
    border-top: 1px solid var(--basiq-color-border-separator);
    border-left: 0;
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
    padding: 0;
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
}
</style>
