<script setup lang="ts">
withDefaults(
  defineProps<{
    name:
      | "archive"
      | "arrow"
      | "award"
      | "book"
      | "calendar"
      | "check"
      | "chevron"
      | "copy"
      | "edit"
      | "grip"
      | "home"
      | "map"
      | "pin"
      | "plus"
      | "record"
      | "search"
      | "user";
    size?: number;
  }>(),
  { size: 20 },
);
</script>

<template>
  <svg
    class="app-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'home'">
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </template>
    <template v-else-if="name === 'map'">
      <path d="m3 6 5-2 8 2 5-2v14l-5 2-8-2-5 2z" />
      <path d="M8 4v14M16 6v14" />
    </template>
    <template v-else-if="name === 'user'">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6" />
    </template>
    <template v-else-if="name === 'edit'">
      <path d="M4 20h4l11-11-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </template>
    <template v-else-if="name === 'archive'">
      <path d="M4 7.2h16v12H4v-12Zm-1-3h18v3H3v-3Zm6 7h6" />
    </template>
    <template v-else-if="name === 'award'">
      <circle cx="12" cy="9" r="6" />
      <path d="m8.5 14-1 7 4.5-2 4.5 2-1-7" />
      <path d="m9.5 9 1.5 1.5L14.5 7" />
    </template>
    <template v-else-if="name === 'book'">
      <path
        d="M4.2 4.7h5.2c1.4 0 2.6 1.2 2.6 2.6v12c0-1.4-1.2-2.6-2.6-2.6H4.2v-12Zm15.6 0h-5.2c-1.4 0-2.6 1.2-2.6 2.6v12c0-1.4-1.2-2.6-2.6-2.6h5.2v-12Z"
      />
    </template>
    <template v-else-if="name === 'calendar'">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </template>
    <template v-else-if="name === 'pin'">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </template>
    <template v-else-if="name === 'plus'"><path d="M12 5v14M5 12h14" /></template>
    <template v-else-if="name === 'grip'">
      <circle cx="9" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="17" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="17" r="1" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'copy'">
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </template>
    <template v-else-if="name === 'check'"><path d="M6 12.5 10 16l8-9" /></template>
    <template v-else-if="name === 'record'"><circle cx="12" cy="12" r="8" /></template>
    <template v-else-if="name === 'arrow'"><path d="M5 12h14M14 7l5 5-5 5" /></template>
    <template v-else><path d="m9 5 7 7-7 7" /></template>
  </svg>
</template>

<style scoped>
.app-icon {
  display: block;
  flex: 0 0 auto;
}
</style>
