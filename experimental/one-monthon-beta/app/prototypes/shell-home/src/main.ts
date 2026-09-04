import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-800.css';
import '@fontsource/m-plus-1p/400.css';
import '@fontsource/m-plus-1p/500.css';
import '@fontsource/m-plus-1p/700.css';
import '@fontsource/m-plus-1p/800.css';
import 'basiq-ui/styles.css';
import './preview.css';

import {
  BasiqButton,
  BasiqCard,
  BasiqFormField,
  BasiqInput,
  BasiqThemeProvider,
} from 'basiq-ui';
import { createApp, defineComponent, type PropType } from 'vue/dist/vue.esm-bundler.js';

type IconName = 'home' | 'map' | 'user' | 'edit' | 'search' | 'arrow';

const PreviewIcon = defineComponent({
  name: 'PreviewIcon',
  props: {
    name: { type: String as PropType<IconName>, required: true },
    size: { type: Number, default: 22 },
  },
  template: `
    <svg class="preview-icon" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <template v-if="name === 'home'"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></template>
      <template v-else-if="name === 'map'"><path d="m3 6 5-2 8 2 5-2v14l-5 2-8-2-5 2z"/><path d="M8 4v14M16 6v14"/></template>
      <template v-else-if="name === 'user'"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></template>
      <template v-else-if="name === 'edit'"><path d="M4 20h4l11-11-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></template>
      <template v-else-if="name === 'search'"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></template>
      <path v-else d="m9 5 7 7-7 7"/>
    </svg>`,
});

const workshops = [
  {
    title: 'Webエンジニアになろう',
    summary: 'Web開発の入口から実践までを順に学ぶ講習会です。',
    team: 'Webエンジニア班',
    year: '2026年度',
    count: '全3回',
  },
  {
    title: 'プログラミング基礎講習会',
    summary: 'プログラムの読み書きを基礎から練習します。',
    team: 'アルゴリズム班',
    year: '2026年度',
    count: '全4回',
  },
  {
    title: 'はじめてのGit',
    summary: 'Gitの基本操作を手元で試しながら身につけます。',
    team: 'SysAd班',
    year: '2026年度',
    count: '1回完結',
  },
  {
    title: 'Blender入門',
    summary: '基本操作から簡単な3Dモデル制作まで体験します。',
    team: 'グラフィックス班',
    year: '2026年度',
    count: '全3回',
  },
  {
    title: 'Unity講習会',
    summary: '小さなゲームを作りながらUnityの基本を学びます。',
    team: 'ゲーム班',
    year: '2026年度',
    count: '全3回',
  },
  {
    title: 'CTFはじめの一歩',
    summary: 'セキュリティ競技の問題を解く準備を始めます。',
    team: 'CTF班',
    year: '2025年度',
    count: '1回完結',
  },
];

const WorkshopCard = defineComponent({
  name: 'WorkshopCard',
  components: { BasiqCard, PreviewIcon },
  props: {
    workshop: { type: Object as PropType<(typeof workshops)[number]>, required: true },
  },
  template: `
    <article class="workshop-item">
      <BasiqCard class="workshop-card">
        <div class="compact-content">
          <div class="compact-copy">
            <h3>{{ workshop.title }}</h3>
            <p class="card-summary">{{ workshop.summary }}</p>
          </div>
          <span class="compact-arrow" aria-hidden="true"><PreviewIcon name="arrow" :size="20" /></span>
        </div>
        <template #footer>
          <p class="card-footer-meta">{{ workshop.count }} · {{ workshop.team }} · {{ workshop.year }}</p>
        </template>
      </BasiqCard>
    </article>`,
});

const PreviewApp = defineComponent({
  name: 'PreviewApp',
  components: {
    BasiqButton,
    BasiqFormField,
    BasiqInput,
    BasiqThemeProvider,
    PreviewIcon,
    WorkshopCard,
  },
  setup() {
    return { workshops };
  },
  template: `
    <BasiqThemeProvider mode="light" class="preview-theme">
      <div class="app-shell">
        <aside class="desktop-sidebar">
          <div class="brand-block" aria-label="1-Monthon">
            <span class="brand-mark">1M</span>
            <span class="brand-copy"><strong>1-Monthon</strong><small>講習会アーカイブ</small></span>
          </div>

          <nav class="desktop-nav" aria-label="メインナビゲーション">
            <p class="nav-label">学ぶ</p>
            <a class="nav-item is-current" href="#" aria-current="page"><PreviewIcon name="home" /><span>ホーム</span></a>
            <a class="nav-item" href="#"><PreviewIcon name="map" /><span>ロードマップ</span></a>
            <a class="nav-item" href="#"><PreviewIcon name="user" /><span>プロフィール</span></a>
          </nav>

          <div class="desktop-operation">
            <p class="nav-label">運営</p>
            <BasiqButton class="operation-button" type="button" tone="neutral" variant="outline"><PreviewIcon name="edit" :size="18" />運営向けページ</BasiqButton>
          </div>
          <small class="preview-version">UI preview · fixed data</small>
        </aside>

        <section class="workspace">
          <header class="mobile-header">
            <div class="mobile-brand"><span class="brand-mark">1M</span><strong>1-Monthon</strong></div>
            <span>講習会アーカイブ</span>
          </header>

          <main class="home-page">
            <header class="page-heading">
              <h1>ホーム</h1>
            </header>

            <form class="search-panel" role="search" aria-label="講習会を検索" @submit.prevent>
              <BasiqFormField class="search-field" label="講習会を検索">
                <div class="search-control">
                  <PreviewIcon name="search" :size="20" />
                  <BasiqInput type="search" size="lg" placeholder="講習会名・概要から検索" />
                </div>
              </BasiqFormField>
              <BasiqButton class="search-button" type="submit">検索</BasiqButton>
            </form>

            <section class="workshop-section" aria-labelledby="workshop-list-title">
              <div class="section-heading">
                <h2 id="workshop-list-title">講習会</h2>
                <span>{{ workshops.length }}件</span>
              </div>
              <div class="workshop-grid">
                <WorkshopCard v-for="workshop in workshops" :key="workshop.title" :workshop="workshop" />
              </div>
            </section>
          </main>
        </section>

        <nav class="mobile-nav" aria-label="モバイルナビゲーション">
          <a class="mobile-nav-item is-current" href="#" aria-current="page"><PreviewIcon name="home" :size="21" /><span>ホーム</span></a>
          <a class="mobile-nav-item" href="#"><PreviewIcon name="map" :size="21" /><span>ロードマップ</span></a>
          <a class="mobile-nav-item" href="#"><PreviewIcon name="user" :size="21" /><span>プロフィール</span></a>
          <button class="mobile-nav-item" type="button"><PreviewIcon name="edit" :size="21" /><span>運営</span></button>
        </nav>
      </div>
    </BasiqThemeProvider>`,
});

createApp(PreviewApp).mount('#app');
