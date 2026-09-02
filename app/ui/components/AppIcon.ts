import { defineComponent, type PropType } from 'vue/dist/vue.esm-bundler.js';

export type AppIconName = 'home' | 'search' | 'map' | 'wand' | 'record' | 'book' | 'calendar' | 'clock' | 'pin' | 'user' | 'check' | 'chevron' | 'edit';

export default defineComponent({
  name: 'AppIcon',
  props: {
    name: { type: String as PropType<AppIconName>, required: true },
    size: { type: Number, default: 22 },
  },
  template: `
    <svg class="app-icon" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <template v-if="name === 'home'"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></template>
      <template v-else-if="name === 'search'"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></template>
      <template v-else-if="name === 'map'"><path d="m3 6 5-2 8 2 5-2v14l-5 2-8-2-5 2z"/><path d="M8 4v14M16 6v14"/></template>
      <template v-else-if="name === 'wand'"><path d="m4 20 10.5-10.5"/><path d="m12.5 7.5 4 4"/><path d="M18 3v3M16.5 4.5h3M6 5v2M5 6h2M18 16v3M16.5 17.5h3"/></template>
      <template v-else-if="name === 'record'"><path d="M4 20h3V11H4zM10.5 20h3V5h-3zM17 20h3V8h-3z"/></template>
      <template v-else-if="name === 'book'"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z"/></template>
      <template v-else-if="name === 'calendar'"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></template>
      <template v-else-if="name === 'clock'"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></template>
      <template v-else-if="name === 'pin'"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></template>
      <template v-else-if="name === 'user'"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></template>
      <template v-else-if="name === 'check'"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></template>
      <template v-else-if="name === 'edit'"><path d="M4 20h4l11-11-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></template>
      <path v-else d="m9 5 7 7-7 7"/>
    </svg>`,
});
