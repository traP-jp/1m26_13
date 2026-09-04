import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-800.css';
import '@fontsource/m-plus-1p/400.css';
import '@fontsource/m-plus-1p/500.css';
import '@fontsource/m-plus-1p/700.css';
import '@fontsource/m-plus-1p/800.css';
import 'basiq-ui/styles.css';
import './profile.css';

import { BasiqButton, BasiqCard, BasiqThemeProvider } from 'basiq-ui';
import { computed, createApp, defineComponent, ref } from 'vue/dist/vue.esm-bundler.js';
import { buildBadgeSvg } from './badge-generator';

type IconName = 'award' | 'book' | 'check' | 'chevron' | 'edit' | 'home' | 'map' | 'user';

const Icon = defineComponent({
  name: 'PrototypeIcon',
  props: {
    name: { type: String as () => IconName, required: true },
    size: { type: Number, default: 21 },
  },
  template: `
    <svg class="icon" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <template v-if="name === 'home'"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></template>
      <template v-else-if="name === 'map'"><path d="m3 6 5-2 8 2 5-2v14l-5 2-8-2-5 2z"/><path d="M8 4v14M16 6v14"/></template>
      <template v-else-if="name === 'user'"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></template>
      <template v-else-if="name === 'edit'"><path d="M4 20h4l11-11-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></template>
      <template v-else-if="name === 'award'"><circle cx="12" cy="9" r="6"/><path d="m8.5 14-1 7 4.5-2 4.5 2-1-7"/><path d="m9.5 9 1.5 1.5L14.5 7"/></template>
      <template v-else-if="name === 'book'"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z"/></template>
      <template v-else-if="name === 'check'"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></template>
      <path v-else d="m9 5 7 7-7 7"/>
    </svg>`,
});

const SeedBadge = defineComponent({
  name: 'SeedBadge',
  props: {
    seed: { type: String, required: true },
    label: { type: String, required: true },
  },
  setup(props) {
    const svgMarkup = computed(() => buildBadgeSvg(props.seed));
    return { svgMarkup };
  },
  template: `<span class="seed-badge" role="img" :aria-label="label" v-html="svgMarkup"></span>`,
});

const badges = [
  { id: 1, title: 'はじめてのGit', team: 'SysAd班', year: 2026, date: '2026年8月28日' },
  { id: 2, title: 'Webエンジニアになろう', team: 'Webエンジニア班', year: 2026, date: '2026年8月24日' },
  { id: 3, title: 'プログラミング基礎講習会', team: 'アルゴリズム班', year: 2026, date: '2026年7月19日' },
  { id: 4, title: 'CTF入門', team: 'SysAd班', year: 2026, date: '2026年6月30日' },
];

const App = defineComponent({
  name: 'ProfilePrototype',
  components: { BasiqButton, BasiqCard, BasiqThemeProvider, Icon, SeedBadge },
  setup() {
    const selectedBadgeId = ref(1);
    return { badges, selectedBadgeId };
  },
  template: `
    <BasiqThemeProvider mode="light" class="prototype-theme">
      <div class="app-shell">
        <aside class="sidebar">
          <div class="brand"><span class="brand-mark">1M</span><span><strong>1-Monthon</strong><small>講習会アーカイブ</small></span></div>
          <nav class="main-nav" aria-label="メインナビゲーション">
            <p>学ぶ</p>
            <button type="button"><Icon name="home" />ホーム</button>
            <button type="button"><Icon name="map" />ロードマップ</button>
            <button type="button" class="is-current" aria-current="page"><Icon name="user" />プロフィール</button>
          </nav>
          <div class="sidebar-operation">
            <p>運営</p>
            <BasiqButton tone="neutral" variant="outline"><Icon name="edit" :size="18" />運営向けページ</BasiqButton>
          </div>
        </aside>

        <div class="workspace">
          <header class="mobile-header"><span class="brand-mark">1M</span><strong>1-Monthon</strong><small>プロフィール</small></header>
          <main>
            <header class="profile-hero">
              <div class="identity">
                <span class="avatar">
                  <span class="avatar-fallback" aria-hidden="true">q</span>
                  <img src="https://q.trap.jp/api/v3/public/icon/quarantineeeeeeeeee" alt="" referrerpolicy="no-referrer" />
                </span>
                <h1>quarantineeeeeeeeee</h1>
              </div>
            </header>

            <section class="overview" aria-label="集計">
              <div class="summary-grid">
                <BasiqCard class="summary-card">
                  <div class="summary-card-title">バッジ</div>
                  <div class="summary-card-value"><div class="summary-icon"><Icon name="award" /></div><strong>4</strong></div>
                </BasiqCard>
                <BasiqCard class="summary-card">
                  <div class="summary-card-title">完了した講習会</div>
                  <div class="summary-card-value"><div class="summary-icon"><Icon name="check" /></div><strong>4</strong></div>
                </BasiqCard>
                <BasiqCard class="summary-card summary-card-wide">
                  <div class="summary-card-title">ロードマップ内の講習会</div>
                  <div class="summary-card-value"><div class="summary-icon"><Icon name="map" /></div><strong>6 / 15</strong></div>
                </BasiqCard>
              </div>
            </section>

            <section class="learning-record" aria-labelledby="badges-title">
              <div class="section-title"><h2 id="badges-title">バッジ</h2></div>
              <div class="badge-layout">
                <ul class="badge-grid">
                  <li v-for="badge in badges" :key="badge.id">
                    <button type="button" class="badge-choice" :class="{ 'is-selected': badge.id === selectedBadgeId }" :aria-pressed="badge.id === selectedBadgeId" @click="selectedBadgeId = badge.id">
                      <SeedBadge class="badge-emblem" :seed="badge.title" :label="badge.title + 'のバッジ'" />
                      <span class="badge-copy"><strong>{{ badge.title }}</strong><small>{{ badge.team }} · {{ badge.date }}</small></span>
                      <Icon name="chevron" :size="18" />
                    </button>
                  </li>
                </ul>
                <BasiqCard class="badge-focus-card">
                  <template #header><div class="card-kicker"><Icon name="award" :size="18" /><strong>バッジ詳細</strong></div></template>
                  <div class="badge-focus-body">
                    <SeedBadge class="badge-emblem badge-emblem-large" :seed="badges.find((badge) => badge.id === selectedBadgeId)?.title ?? ''" :label="(badges.find((badge) => badge.id === selectedBadgeId)?.title ?? '') + 'のバッジ'" />
                    <div><h3>{{ badges.find((badge) => badge.id === selectedBadgeId)?.title }}</h3><p>{{ badges.find((badge) => badge.id === selectedBadgeId)?.team }}</p></div>
                    <dl><div><dt>年度</dt><dd>{{ badges.find((badge) => badge.id === selectedBadgeId)?.year }}年度</dd></div><div><dt>受講完了日</dt><dd>{{ badges.find((badge) => badge.id === selectedBadgeId)?.date }}</dd></div></dl>
                  </div>
                  <template #footer><BasiqButton tone="accent" variant="outline">講習会の詳細を見る</BasiqButton></template>
                </BasiqCard>
              </div>
            </section>
          </main>
        </div>

        <nav class="bottom-nav" aria-label="モバイルナビゲーション">
          <button type="button"><Icon name="home" /><span>ホーム</span></button>
          <button type="button"><Icon name="map" /><span>ロードマップ</span></button>
          <button type="button" class="is-current" aria-current="page"><Icon name="user" /><span>プロフィール</span></button>
          <button type="button"><Icon name="edit" /><span>運営</span></button>
        </nav>
      </div>
    </BasiqThemeProvider>`,
});

createApp(App).mount('#app');
