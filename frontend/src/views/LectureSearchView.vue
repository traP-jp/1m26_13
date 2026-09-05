<script setup lang="ts">
import { parseDate, type CalendarDate } from "@internationalized/date";
import {
  BasiqButton,
  BasiqCheckbox,
  BasiqDatePicker,
  BasiqFormField,
  BasiqInput,
  BasiqSelect,
} from "basiq-ui";
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import AppIcon from "@/components/AppIcon.vue";
import LectureList from "@/components/LectureList.vue";
import {
  createSearchFilters,
  currentAcademicYear,
  defaultFilters,
  normalize,
  selectLectures,
  teams,
  type LectureFilters,
} from "@/lib/lectureDiscovery";
import { useLectureDiscovery } from "@/lib/useLectureDiscovery";

const route = useRoute();
const router = useRouter();
const { lectures, directory, fields, loading, error, metadataError, now, load } =
  useLectureDiscovery();
const defaultYear = computed(() => String(currentAcademicYear(now.value)));
const defaults = computed(() => ({ ...defaultFilters, year: defaultYear.value }));
const filters = reactive<LectureFilters>({ ...createSearchFilters() });
const queryValue = (key: string) => (typeof route.query[key] === "string" ? route.query[key] : "");
function calendarDate(value: string): CalendarDate | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  try {
    return parseDate(value);
  } catch {
    return undefined;
  }
}
const applied = computed<LectureFilters>(() => ({
  ...defaults.value,
  q: queryValue("q"),
  group: queryValue("group"),
  field: queryValue("field"),
  year:
    queryValue("year") === "all"
      ? ""
      : /^(?:20[0-9]{2}|21[0-9]{2}|2200)$/.test(queryValue("year"))
        ? queryValue("year")
        : defaults.value.year,
  instructor: queryValue("instructor"),
  dateFrom: calendarDate(queryValue("dateFrom"))?.toString() ?? "",
  dateTo: calendarDate(queryValue("dateTo"))?.toString() ?? "",
  location: queryValue("location"),
  completion:
    queryValue("completion") === "completed"
      ? "completed"
      : queryValue("completion") === "incomplete"
        ? "incomplete"
        : "",
  upcoming: queryValue("upcoming") === "1",
  material: queryValue("material") === "1",
  introductory: queryValue("introductory") === "1",
  sort: ["newest", "upcoming", "name", "random"].includes(queryValue("sort"))
    ? queryValue("sort")
    : "newest",
  seed:
    queryValue("seed") && Number.isFinite(Number(queryValue("seed")))
      ? Number(queryValue("seed")) >>> 0
      : 1,
}));
const advancedOpen = ref(false);
watch(
  applied,
  (value) => {
    Object.assign(filters, value);
    if (value.dateFrom || value.dateTo || value.location || value.completion)
      advancedOpen.value = true;
  },
  { immediate: true },
);
const results = computed(() =>
  selectLectures(lectures.value, applied.value, directory.value, now.value),
);
const dateFrom = computed({
  get: () => calendarDate(filters.dateFrom) ?? null,
  set: (value: CalendarDate | null) => {
    filters.dateFrom = value?.toString() ?? "";
  },
});
const dateTo = computed({
  get: () => calendarDate(filters.dateTo) ?? null,
  set: (value: CalendarDate | null) => {
    filters.dateTo = value?.toString() ?? "";
  },
});
const yearItems = computed(() => {
  const years = new Set([Number(defaults.value.year)]);
  if (filters.year) years.add(Number(filters.year));
  for (const lecture of lectures.value) {
    for (
      let year = Math.max(2000, lecture.academicYearStart);
      year <= Math.min(2200, lecture.academicYearEnd);
      year++
    )
      years.add(year);
  }
  return [
    { value: "all", label: "全年度" },
    ...[...years]
      .sort((a, b) => b - a)
      .map((year) => ({
        value: String(year),
        label: `${year}年度${String(year) === defaults.value.year ? "（今年度）" : ""}`,
      })),
  ];
});
const completionItems = [
  { value: "all", label: "すべて" },
  { value: "incomplete", label: "未完了" },
  { value: "completed", label: "完了済み" },
];
const otherGroups = computed(() => {
  const groups = new Map(directory.value.groups.map((group) => [group.id, group]));
  for (const lecture of lectures.value) {
    const organizer = lecture.organizer;
    if (organizer?.kind === "group" && !groups.has(organizer.id))
      groups.set(organizer.id, { id: organizer.id, name: organizer.groupName ?? "運営グループ" });
  }
  return [...groups.values()]
    .filter(
      (group) =>
        group.id === applied.value.group ||
        !teams.some((team) => team.aliases.includes(normalize(group.name))),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));
});
const groupItems = computed(() => [
  { value: "all", label: "すべて" },
  ...teams.map((team) => ({ value: team.id, label: team.name })),
  ...otherGroups.value.map((group) => ({ value: group.id, label: group.name })),
]);
const fieldItems = computed(() => [
  { value: "all", label: "すべて" },
  ...fields.value.map((field) => ({ value: field.id, label: field.name })),
]);
const sortItems = [
  { value: "newest", label: "新しい年度順" },
  { value: "upcoming", label: "開催が近い順" },
  { value: "name", label: "名前順" },
  { value: "random", label: "ランダム" },
];
function changeSort(value: string | null) {
  navigateFilters({ ...applied.value, sort: value ?? "newest" });
}
const hasFilters = computed(() =>
  Object.entries(applied.value).some(
    ([key, value]) => value !== defaults.value[key as keyof LectureFilters],
  ),
);

function navigateFilters(value: LectureFilters) {
  void router.push({
    path: "/lectures",
    query: {
      q: value.q.trim() || undefined,
      group: value.group || undefined,
      field: value.field || undefined,
      year: value.year || "all",
      instructor: value.instructor.trim() || undefined,
      dateFrom: value.dateFrom || undefined,
      dateTo: value.dateTo || undefined,
      location: value.location.trim() || undefined,
      completion: value.completion || undefined,
      upcoming: value.upcoming ? "1" : undefined,
      material: value.material ? "1" : undefined,
      introductory: value.introductory ? "1" : undefined,
      sort: value.sort !== "newest" ? value.sort : undefined,
      seed: value.sort === "random" ? String(value.seed) : undefined,
    },
  });
}
function search() {
  navigateFilters(filters);
}
function clearFilters() {
  Object.assign(filters, defaults.value);
  advancedOpen.value = false;
  search();
}
function shuffle() {
  navigateFilters({ ...applied.value, seed: Math.floor(Math.random() * 4294967296) });
}
</script>

<template>
  <div class="page search-page">
    <header class="search-heading">
      <h1>講習会を探す</h1>
      <BasiqButton v-if="hasFilters" tone="neutral" variant="outline" @click="clearFilters"
        >条件をクリア</BasiqButton
      >
    </header>
    <form class="search-form" @submit.prevent="search">
      <div class="keyword-row">
        <BasiqFormField label="キーワード" class="keyword-field">
          <template #default="{ id, describedBy }">
            <BasiqInput
              :id="id"
              v-model="filters.q"
              :aria-describedby="describedBy"
              type="search"
              clearable
              clear-label="検索語を消去"
              placeholder="講習会名・内容・対象者"
            >
              <template #leading><AppIcon name="search" :size="18" /></template>
            </BasiqInput>
          </template>
        </BasiqFormField>
        <BasiqButton type="submit" class="search-submit"
          ><AppIcon name="search" :size="18" />検索</BasiqButton
        >
      </div>
      <div class="primary-filters">
        <BasiqFormField label="班・運営グループ">
          <template #default="{ id, describedBy }">
            <BasiqSelect
              :id="id"
              :model-value="filters.group || 'all'"
              :items="groupItems"
              :aria-describedby="describedBy"
              @update:model-value="filters.group = $event === 'all' ? '' : ($event ?? '')"
            />
          </template>
        </BasiqFormField>
        <BasiqFormField label="分野">
          <template #default="{ id, describedBy }">
            <BasiqSelect
              :id="id"
              :model-value="filters.field || 'all'"
              :items="fieldItems"
              :aria-describedby="describedBy"
              @update:model-value="filters.field = $event === 'all' ? '' : ($event ?? '')"
            />
          </template>
        </BasiqFormField>
        <BasiqFormField label="講師">
          <template #default="{ id, describedBy }">
            <BasiqInput
              :id="id"
              v-model="filters.instructor"
              :aria-describedby="describedBy"
              placeholder="表示名・traQ ID"
            />
          </template>
        </BasiqFormField>
        <BasiqFormField label="年度">
          <template #default="{ id, describedBy }">
            <BasiqSelect
              :id="id"
              :model-value="filters.year || 'all'"
              :items="yearItems"
              :aria-describedby="describedBy"
              @update:model-value="filters.year = $event === 'all' ? '' : ($event ?? defaults.year)"
            />
          </template>
        </BasiqFormField>
      </div>
      <div class="search-options">
        <BasiqCheckbox v-model="filters.upcoming">これから開催</BasiqCheckbox>
        <BasiqCheckbox v-model="filters.material">資料あり</BasiqCheckbox>
        <BasiqCheckbox v-model="filters.introductory">0→1講習会</BasiqCheckbox>
      </div>
      <details
        class="advanced-filters"
        :open="advancedOpen"
        @toggle="advancedOpen = ($event.target as HTMLDetailsElement).open"
      >
        <summary>詳しい条件</summary>
        <div class="advanced-grid">
          <BasiqFormField label="開催日（開始）">
            <template #default="{ id, describedBy }">
              <BasiqDatePicker
                :id="id"
                v-model="dateFrom"
                :max-value="dateTo ?? undefined"
                :aria-describedby="describedBy"
                locale="ja-JP"
                placeholder="指定なし"
              />
            </template>
          </BasiqFormField>
          <BasiqFormField label="開催日（終了）">
            <template #default="{ id, describedBy }">
              <BasiqDatePicker
                :id="id"
                v-model="dateTo"
                :min-value="dateFrom ?? undefined"
                :aria-describedby="describedBy"
                locale="ja-JP"
                placeholder="指定なし"
              />
            </template>
          </BasiqFormField>
          <BasiqFormField label="場所">
            <template #default="{ id, describedBy }">
              <BasiqInput
                :id="id"
                v-model="filters.location"
                :aria-describedby="describedBy"
                placeholder="講義室・Discord など"
              />
            </template>
          </BasiqFormField>
          <BasiqFormField label="受講状況">
            <template #default="{ id, describedBy }">
              <BasiqSelect
                :id="id"
                :model-value="filters.completion || 'all'"
                :items="completionItems"
                :aria-describedby="describedBy"
                @update:model-value="
                  filters.completion =
                    $event === 'completed' || $event === 'incomplete' ? $event : ''
                "
              />
            </template>
          </BasiqFormField>
        </div>
      </details>
    </form>
    <p v-if="metadataError" class="metadata-warning" role="status">
      {{ metadataError
      }}<BasiqButton tone="neutral" variant="outline" @click="load">再試行</BasiqButton>
    </p>
    <div v-if="loading" class="loading-state" aria-live="polite">講習会を読み込んでいます</div>
    <div v-else-if="error" class="error-state" role="alert">
      <p>{{ error }}</p>
      <BasiqButton tone="neutral" variant="outline" @click="load">再試行</BasiqButton>
    </div>
    <template v-else>
      <div class="results-heading">
        <h2 aria-live="polite">
          検索結果 <span>{{ results.length }}件</span>
        </h2>
        <div class="sort-controls">
          <BasiqButton
            v-if="applied.sort === 'random'"
            tone="neutral"
            variant="outline"
            @click="shuffle"
            >入れ替える</BasiqButton
          ><label for="lecture-sort">並び順</label
          ><BasiqSelect
            id="lecture-sort"
            :model-value="filters.sort"
            :items="sortItems"
            size="sm"
            @update:model-value="changeSort"
          />
        </div>
      </div>
      <LectureList
        v-if="results.length"
        :lectures="results"
        :directory="directory"
        :now="now"
        show-schedule
      />
      <div v-else class="empty-state">
        <strong>条件に合う講習会はありません</strong>
        <p>キーワードや条件を変えて検索してください。</p>
        <BasiqButton v-if="hasFilters" tone="neutral" variant="outline" @click="clearFilters"
          >条件をクリア</BasiqButton
        >
      </div>
    </template>
  </div>
</template>

<style scoped>
.search-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
}

.search-heading h1 {
  font-size: 1.5rem;
}

.search-form {
  display: grid;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--basiq-color-border-separator);
}

.keyword-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 12px;
}

.primary-filters,
.advanced-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: start;
  gap: 16px 12px;
}

.keyword-row > *,
.primary-filters > *,
.advanced-grid > * {
  min-width: 0;
}

.search-options {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 24px;
}

.search-submit {
  min-width: 96px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.advanced-filters summary {
  width: fit-content;
  padding-block: 4px;
  color: var(--basiq-color-content-subtle);
  cursor: pointer;
}

.advanced-grid {
  padding-top: 16px;
}

.results-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin: 24px 0 12px;
}

.results-heading h2 {
  font-size: 1.125rem;
}

.results-heading h2 span {
  margin-left: 8px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.875rem;
  font-weight: 400;
}

.sort-controls {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-controls label {
  color: var(--basiq-color-content-subtle);
  font-size: 0.875rem;
  white-space: nowrap;
}

.metadata-warning {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-block: 12px;
  color: var(--basiq-color-content-subtle);
  font-size: 0.875rem;
}

.empty-state p {
  margin: 4px 0 12px;
}

@media (width <= 1100px) {
  .primary-filters,
  .advanced-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 480px) {
  .search-submit {
    min-width: 64px;
  }

  .search-submit :deep(.app-icon) {
    display: none;
  }

  .sort-controls {
    flex-wrap: wrap;
  }
}
</style>
