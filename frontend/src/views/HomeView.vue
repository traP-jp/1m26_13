<script setup lang="ts">
import { BasiqButton } from "basiq-ui";
import { computed, ref } from "vue";

import AppIcon from "@/components/AppIcon.vue";
import LectureList from "@/components/LectureList.vue";
import { defaultFilters, selectLectures, teams } from "@/lib/lectureDiscovery";
import { useLectureDiscovery } from "@/lib/useLectureDiscovery";

const { lectures, directory, loading, error, now, load } = useLectureDiscovery();
const seed = ref(Math.floor(Math.random() * 4294967296));
const upcoming = computed(() =>
  selectLectures(
    lectures.value,
    { ...defaultFilters, upcoming: true, sort: "upcoming" },
    directory.value,
    now.value,
  ).slice(0, 3),
);
const random = computed(() =>
  selectLectures(
    lectures.value,
    { ...defaultFilters, sort: "random", seed: seed.value },
    directory.value,
    now.value,
  ).slice(0, 3),
);
function shuffle() {
  seed.value = Math.floor(Math.random() * 4294967296);
}
</script>

<template>
  <div class="page home-page">
    <header class="home-brand">
      <img src="/brand/leqtures.png" width="64" height="64" alt="" />
      <h1>stoQ</h1>
      <RouterLink to="/lectures" class="browse-link"
        ><AppIcon name="search" :size="18" />講習会を探す</RouterLink
      >
    </header>

    <section aria-labelledby="teams-heading">
      <div class="section-heading"><h2 id="teams-heading">班から探す</h2></div>
      <div class="team-grid">
        <RouterLink
          v-for="team in teams"
          :key="team.id"
          :to="{ path: '/lectures', query: { group: team.id } }"
          class="team-link"
          :style="{ '--team-color': team.color }"
        >
          <img v-if="team.logo" :src="team.logo" width="32" height="32" alt="" />
          <span>{{ team.name }}</span
          ><AppIcon name="chevron" :size="16" />
        </RouterLink>
      </div>
    </section>

    <div v-if="loading" class="loading-state" aria-live="polite">講習会を読み込んでいます</div>
    <div v-else-if="error" class="error-state" role="alert">
      <p>{{ error }}</p>
      <BasiqButton tone="neutral" variant="outline" @click="load">再試行</BasiqButton>
    </div>
    <template v-else>
      <section aria-labelledby="upcoming-heading">
        <div class="section-heading">
          <h2 id="upcoming-heading">これから開かれる講習会</h2>
          <RouterLink :to="{ path: '/lectures', query: { upcoming: '1', sort: 'upcoming' } }"
            >すべて見る<AppIcon name="chevron" :size="16"
          /></RouterLink>
        </div>
        <LectureList
          v-if="upcoming.length"
          :lectures="upcoming"
          :directory="directory"
          :now="now"
          show-schedule
        />
        <p v-else class="section-empty">開催予定の講習会はまだ登録されていません。</p>
      </section>
      <section aria-labelledby="random-heading">
        <div class="section-heading">
          <h2 id="random-heading">講習会をランダムに表示</h2>
          <div class="section-actions">
            <BasiqButton v-if="random.length" tone="neutral" variant="outline" @click="shuffle"
              >入れ替える</BasiqButton
            ><RouterLink
              :to="{
                path: '/lectures',
                query: { sort: 'random', seed: String(seed), year: 'all' },
              }"
              >すべて見る<AppIcon name="chevron" :size="16"
            /></RouterLink>
          </div>
        </div>
        <LectureList v-if="random.length" :lectures="random" :directory="directory" :now="now" />
        <p v-else class="section-empty">公開中の講習会はまだありません。</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.home-page {
  display: grid;
  gap: 24px;
}

.home-brand {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-block: 8px;
}

.home-brand img {
  flex: 0 0 auto;
  object-fit: contain;
}

.home-brand h1 {
  font-size: 2rem;
  font-weight: 700;
}

.browse-link {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  color: var(--basiq-color-content-accent);
  font-size: 0.875rem;
  font-weight: 700;
  text-decoration: none;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 0 0 12px;
}

.section-heading h2 {
  font-size: 1.125rem;
}

.section-heading a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--basiq-color-content-accent);
  font-size: 0.875rem;
  text-decoration: none;
  white-space: nowrap;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.team-link {
  min-height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--team-color) 20%, var(--basiq-color-border-separator));
  border-radius: var(--basiq-radius-sm);
  background: color-mix(in srgb, var(--team-color) 4%, var(--basiq-color-surface-base));
  font-size: 0.875rem;
  font-weight: 700;
  text-decoration: none;
}

.team-link img {
  flex: 0 0 auto;
  object-fit: contain;
}

.team-link > :deep(.app-icon) {
  margin-left: auto;
  color: var(--basiq-color-content-subtle);
}

.team-link:hover {
  background: color-mix(in srgb, var(--team-color) 12%, var(--basiq-color-surface-base));
}

.team-link:focus-visible {
  outline: 2px solid var(--basiq-color-accent-default);
  outline-offset: 3px;
}

.section-empty {
  padding: 16px 0;
  border-block: 1px solid var(--basiq-color-border-separator);
  color: var(--basiq-color-content-subtle);
  font-size: 0.875rem;
}

@media (width <= 1200px) {
  .team-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (width <= 640px) {
  .home-brand {
    flex-wrap: wrap;
    gap: 12px;
    padding: 0;
  }

  .home-brand img {
    width: 48px;
    height: 48px;
  }

  .home-brand h1 {
    font-size: 1.75rem;
  }

  .browse-link {
    margin-left: auto;
  }

  .team-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .team-link {
    gap: 8px;
    padding: 8px;
    font-size: 0.875rem;
  }

  .team-link img {
    width: 32px;
    height: 32px;
  }

  .team-link > :deep(.app-icon) {
    display: none;
  }

  .section-heading {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 8px;
  }

  .section-actions {
    gap: 8px;
  }
}
</style>
