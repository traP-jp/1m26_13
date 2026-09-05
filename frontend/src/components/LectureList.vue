<script setup lang="ts">
import type { Directory, Lecture } from "@/api/resources";
import AppIcon from "@/components/AppIcon.vue";
import {
  academicYear,
  organizerLabel,
  sessionDateLabel,
  upcomingSession,
} from "@/lib/lectureDiscovery";

defineProps<{ lectures: Lecture[]; directory: Directory; now: number; showSchedule?: boolean }>();
</script>

<template>
  <ul class="lecture-list">
    <li v-for="lecture in lectures" :key="lecture.id">
      <RouterLink :to="`/lectures/${lecture.id}`" class="lecture-link">
        <div class="lecture-copy">
          <h3>{{ lecture.name }}</h3>
          <p v-if="lecture.description">{{ lecture.description }}</p>
          <span class="lecture-meta"
            >{{ organizerLabel(lecture, directory) }} · {{ academicYear(lecture) }}</span
          >
        </div>
        <div class="lecture-aside">
          <template v-if="showSchedule && upcomingSession(lecture, now)">
            <span class="next-date"
              ><AppIcon name="calendar" :size="16" />{{
                sessionDateLabel(upcomingSession(lecture, now)!)
              }}</span
            >
            <span class="lecture-meta">{{ upcomingSession(lecture, now)?.name }}</span>
          </template>
          <span v-else class="lecture-meta"
            >{{
              lecture.sessions.filter(
                (session) => !session.isReplay && session.status === "published",
              ).length || "開催準備中"
            }}{{
              lecture.sessions.some(
                (session) => !session.isReplay && session.status === "published",
              )
                ? "回"
                : ""
            }}</span
          >
        </div>
        <AppIcon name="chevron" :size="18" />
      </RouterLink>
    </li>
  </ul>
</template>

<style scoped>
.lecture-list {
  list-style: none;
  border-top: 1px solid var(--basiq-color-border-separator);
}

.lecture-list li {
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.lecture-link {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 18px;
  align-items: center;
  gap: 16px;
  padding: 12px 8px;
  text-decoration: none;
}

.lecture-link:hover {
  background: var(--basiq-color-surface-container);
}

.lecture-link:focus-visible {
  outline: 2px solid var(--basiq-color-accent-default);
  outline-offset: -2px;
}

.lecture-copy {
  min-width: 0;
}

.lecture-copy h3 {
  font-size: 0.9375rem;
  line-height: 1.5;
}

.lecture-copy p {
  overflow: hidden;
  color: var(--basiq-color-content-subtle);
  font-size: 0.875rem;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.lecture-meta {
  color: var(--basiq-color-content-subtle);
  font-size: 0.8125rem;
}

.lecture-aside {
  max-width: 224px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  text-align: right;
}

.next-date {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  font-weight: 700;
}

@media (width <= 640px) {
  .lecture-link {
    grid-template-columns: minmax(0, 1fr) 18px;
    gap: 8px;
    padding-inline: 4px;
  }

  .lecture-aside {
    grid-column: 1;
    max-width: none;
    align-items: flex-start;
    text-align: left;
  }

  .lecture-link > :deep(.app-icon) {
    grid-column: 2;
    grid-row: 1 / 3;
  }
}
</style>
