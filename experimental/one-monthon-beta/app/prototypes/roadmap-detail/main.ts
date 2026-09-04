import {
  BasiqButton,
  BasiqCard,
  BasiqFormField,
  BasiqTextarea,
  BasiqThemeProvider,
} from 'basiq-ui';
import { createApp, defineComponent, ref } from 'vue/dist/vue.esm-bundler.js';
import 'basiq-ui/styles.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-800.css';
import '@fontsource/m-plus-1p/400.css';
import '@fontsource/m-plus-1p/500.css';
import '@fontsource/m-plus-1p/700.css';
import '@fontsource/m-plus-1p/800.css';
import './style.css';

type LearningState = 'completed' | 'current' | 'todo';

type LearningItem = {
  id: number;
  title: string;
  team: string;
  duration: string;
  state: LearningState;
};

const learningItems: LearningItem[] = [
  {
    id: 1,
    title: 'はじめてのGit',
    team: 'SysAd班',
    duration: '1回完結',
    state: 'completed',
  },
  {
    id: 2,
    title: 'HTML・CSS入門',
    team: 'Webエンジニア班',
    duration: '全2回',
    state: 'completed',
  },
  {
    id: 3,
    title: 'JavaScript基礎講習会',
    team: 'Webエンジニア班',
    duration: '全3回',
    state: 'current',
  },
  {
    id: 4,
    title: 'TypeScriptで安全に書く',
    team: 'Webエンジニア班',
    duration: '1回完結',
    state: 'todo',
  },
  {
    id: 5,
    title: 'Vueでアプリを作ろう',
    team: 'Webエンジニア班',
    duration: '全3回',
    state: 'todo',
  },
];

const shareMarkdown = `## Webエンジニアへの道

1. [はじめてのGit](https://example.com/workshops/1)
2. [HTML・CSS入門](https://example.com/workshops/2)
3. [JavaScript基礎講習会](https://example.com/workshops/3)
4. [TypeScriptで安全に書く](https://example.com/workshops/4)
5. [Vueでアプリを作ろう](https://example.com/workshops/5)`;

const AppIcon = defineComponent({
  name: 'AppIcon',
  props: { name: { type: String, required: true } },
  template: `
    <svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <template v-if="name === 'home'"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></template>
      <template v-else-if="name === 'map'"><path d="m3 6 5-2 8 2 5-2v14l-5 2-8-2-5 2z"/><path d="M8 4v14M16 6v14"/></template>
      <template v-else-if="name === 'user'"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6"/></template>
      <template v-else-if="name === 'edit'"><path d="M4 20h4l11-11-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></template>
      <template v-else-if="name === 'arrow'"><path d="M5 12h14M14 7l5 5-5 5"/></template>
      <template v-else><path d="M6 12.5 10 16l8-9"/></template>
    </svg>`,
});

const Prototype = defineComponent({
  name: 'RoadmapDetailPrototype',
  components: {
    AppIcon,
    BasiqButton,
    BasiqCard,
    BasiqFormField,
    BasiqTextarea,
    BasiqThemeProvider,
  },
  setup() {
    const copied = ref(false);
    const scrollToShare = () => document.querySelector('#share-panel')?.scrollIntoView({ behavior: 'smooth' });
    return { copied, learningItems, shareMarkdown, scrollToShare };
  },
  template: `
    <BasiqThemeProvider mode="light" class="theme-root">
      <div class="app-shell">
        <aside class="sidebar" aria-label="サイトナビゲーション">
          <a class="brand" href="#overview" aria-label="1-Monthon ホーム">
            <span class="brand-mark">1M</span>
            <strong>1-Monthon</strong>
          </a>

          <nav class="main-nav" aria-label="メインナビゲーション">
            <a href="#overview"><AppIcon name="home" /><span>ホーム</span></a>
            <a class="is-current" href="#learning-path" aria-current="page"><AppIcon name="map" /><span>ロードマップ</span></a>
            <a href="#progress"><AppIcon name="user" /><span>プロフィール</span></a>
          </nav>

          <div class="sidebar-footer">
            <BasiqButton class="admin-button" tone="neutral" variant="outline"><AppIcon name="edit" />運営向けページ</BasiqButton>
          </div>
        </aside>

        <section class="workspace">
          <header class="mobile-header">
            <a class="mobile-brand" href="#overview"><span class="brand-mark">1M</span><strong>1-Monthon</strong></a>
            <span>ロードマップ</span>
          </header>

          <main id="overview" class="page">
            <nav class="breadcrumb" aria-label="パンくずリスト">
              <a href="#learning-path">ロードマップ</a><span aria-hidden="true">/</span><span>Webエンジニアへの道</span>
            </nav>

            <header class="hero">
              <div class="hero-copy">
                <h1>Webエンジニアへの道</h1>
                <p>Web開発の基礎からアプリ制作まで、5つの講習会を順に学びます。</p>
                <div class="tags" aria-label="ロードマップ情報">
                  <span>初心者向け</span><span>講習会 5件</span><span>目安 2か月</span>
                </div>
              </div>
              <BasiqButton class="share-jump" tone="neutral" variant="outline" @click="scrollToShare">共有文を見る</BasiqButton>
            </header>

            <section id="progress" class="status-overview" aria-label="学習状況">
              <BasiqCard class="progress-card">
                <template #header><h2>学習の進捗</h2></template>
                <div class="progress-card-body">
                  <div class="progress-number"><strong>40<small>%</small></strong><span>5件中2件完了</span></div>
                  <div class="progress-track" role="progressbar" aria-label="ロードマップの進捗" aria-valuemin="0" aria-valuemax="100" aria-valuenow="40"><span></span></div>
                  <div class="progress-foot"><span>あと3件</span></div>
                </div>
              </BasiqCard>

              <BasiqCard class="current-card">
                <div class="current-content">
                  <div class="current-copy">
                    <span class="current-label">現在地</span>
                    <h2>JavaScript基礎講習会</h2>
                    <p>第2回：DOM操作とイベント</p>
                    <div class="current-meta"><span>Webエンジニア班</span><span>全3回</span></div>
                  </div>
                  <BasiqButton tone="accent" variant="solid">講習会を見る</BasiqButton>
                </div>
              </BasiqCard>
            </section>

            <div class="content-grid">
              <section id="learning-path" class="learning-path" aria-labelledby="learning-title">
                <div class="section-heading">
                  <h2 id="learning-title">学習順</h2>
                  <div class="legend" aria-label="状態の凡例"><span class="done">完了</span><span class="now">現在地</span><span>未着手</span></div>
                </div>

                <ol class="path-list">
                  <li v-for="item in learningItems" :key="item.id" class="path-row" :class="'is-' + item.state">
                    <div class="path-marker" aria-hidden="true"><span v-if="item.state === 'completed'">✓</span><span v-else>{{ String(item.id).padStart(2, '0') }}</span></div>
                    <BasiqCard class="path-card">
                      <div class="path-card-content">
                        <div class="path-main-copy">
                          <div class="path-status-row">
                            <span class="path-status">{{ item.state === 'completed' ? '完了' : item.state === 'current' ? '現在地' : '未着手' }}</span>
                          </div>
                          <h3>{{ item.title }}</h3>
                          <div class="path-meta"><span>{{ item.team }}</span><span>{{ item.duration }}</span></div>
                        </div>
                        <AppIcon name="arrow" />
                      </div>
                    </BasiqCard>
                  </li>
                </ol>
              </section>

              <aside class="side-rail" aria-label="共有">
                <BasiqCard id="share-panel" class="share-card">
                  <template #header><h2>共有用Markdown</h2></template>
                  <BasiqFormField label="共有内容">
                    <BasiqTextarea :model-value="shareMarkdown" readonly :rows="10" resize="none" />
                  </BasiqFormField>
                  <template #footer><BasiqButton class="full-button" :tone="copied ? 'neutral' : 'accent'" :variant="copied ? 'outline' : 'solid'" aria-live="polite" @click="copied = true">{{ copied ? 'コピーしました' : 'コピー' }}</BasiqButton></template>
                </BasiqCard>
              </aside>
            </div>
          </main>
        </section>

        <nav class="mobile-nav" aria-label="モバイルナビゲーション">
          <a href="#overview"><AppIcon name="home" /><span>ホーム</span></a>
          <a class="is-current" href="#learning-path" aria-current="page"><AppIcon name="map" /><span>ロードマップ</span></a>
          <a href="#progress"><AppIcon name="user" /><span>プロフィール</span></a>
          <a href="#share-panel"><AppIcon name="edit" /><span>運営</span></a>
        </nav>
      </div>
    </BasiqThemeProvider>`,
});

createApp(Prototype).mount('#app');
