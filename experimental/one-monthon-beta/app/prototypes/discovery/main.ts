import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import '@fontsource/m-plus-1p/400.css';
import '@fontsource/m-plus-1p/500.css';
import '@fontsource/m-plus-1p/700.css';
import 'basiq-ui/styles.css';
import './style.css';

import {
  BasiqButton,
  BasiqCard,
  BasiqFormField,
  BasiqInput,
  BasiqThemeProvider,
} from 'basiq-ui';
import { createApp, defineComponent, ref } from 'vue/dist/vue.esm-bundler.js';

type IconName = 'archive' | 'book' | 'chevron' | 'home' | 'map' | 'search' | 'user';

const Icon = defineComponent({
  name: 'PrototypeIcon',
  props: {
    name: { type: String as () => IconName, required: true },
    size: { type: Number, default: 20 },
  },
  template: `
    <svg class="icon" :width="size" :height="size" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path v-if="name === 'home'" d="M3.8 10.7 12 3.8l8.2 6.9v8.1a1.4 1.4 0 0 1-1.4 1.4H5.2a1.4 1.4 0 0 1-1.4-1.4v-8.1Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
      <path v-else-if="name === 'search'" d="m20.2 20.2-4.5-4.5m1.8-5.2a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      <path v-else-if="name === 'map'" d="m3.5 5.8 5-2.3 7 2.3 5-2.3v14.7l-5 2.3-7-2.3-5 2.3V5.8Zm5-2.3v14.7m7-12.4v14.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
      <path v-else-if="name === 'user'" d="M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Zm-7.7 8.4c.6-4 3.2-6 7.7-6s7.1 2 7.7 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      <path v-else-if="name === 'book'" d="M4.2 4.7h5.2c1.4 0 2.6 1.2 2.6 2.6v12c0-1.4-1.2-2.6-2.6-2.6H4.2v-12Zm15.6 0h-5.2c-1.4 0-2.6 1.2-2.6 2.6v12c0-1.4 1.2-2.6 2.6-2.6h5.2v-12Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
      <path v-else-if="name === 'archive'" d="M4 7.2h16v12H4v-12Zm-1-3h18v3H3v-3Zm6 7h6" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
      <path v-else d="m9 5 7 7-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </svg>`,
});

const workshops = [
  {
    title: 'Webエンジニアになろう',
    summary: 'Web開発の入口からUI実装までを、手を動かしながら順に学びます。',
    team: 'Webエンジニア班',
    year: '2026年度',
    count: '全3回',
  },
  {
    title: 'はじめてのGit',
    summary: 'Gitの基本操作を試しながら、チーム開発の最初の一歩を身につけます。',
    team: 'SysAd班',
    year: '2026年度',
    count: '1回完結',
  },
  {
    title: 'プログラミング基礎講習会',
    summary: '変数、条件分岐、繰り返しから、簡単な問題演習まで進みます。',
    team: 'アルゴリズム班',
    year: '2026年度',
    count: '全4回',
  },
  {
    title: 'グラフィックス入門',
    summary: '画像表現の基礎とシェーダーの考え方を、小さな作例から学びます。',
    team: 'グラフィックス班',
    year: '2025年度',
    count: '全3回',
  },
  {
    title: 'ゲーム制作スタートアップ',
    summary: '企画からプロトタイプ制作まで、ゲームづくりの流れを体験します。',
    team: 'ゲーム班',
    year: '2025年度',
    count: '全5回',
  },
  {
    title: 'サウンド制作の基本',
    summary: 'DAWの基本操作と、音を組み立てるための考え方を学びます。',
    team: 'サウンド班',
    year: '2024年度',
    count: '全2回',
  },
] as const;

const roadmaps = [
  {
    title: 'Web制作をはじめる',
    summary: '初めてWebページを作る人が、公開までの基礎を一巡するための順番です。',
    audience: 'Web開発が初めての人',
    estimate: '5講習会',
    steps: ['はじめてのGit', 'Webエンジニアになろう', 'Webアプリを公開しよう'],
    mark: 'Web',
  },
  {
    title: '競技プログラミング入門',
    summary: 'プログラミングの基本から、コンテストの典型問題へ進みます。',
    audience: 'アルゴリズムを学びたい人',
    estimate: '4講習会',
    steps: ['プログラミング基礎', '計算量を知る', '典型アルゴリズム'],
    mark: 'Algo',
  },
  {
    title: 'SysAdの基礎を身につける',
    summary: '開発環境、Linux、ネットワークを段階的に学ぶロードマップです。',
    audience: 'インフラに興味がある人',
    estimate: '5講習会',
    steps: ['はじめてのGit', 'Linux入門', 'ネットワーク基礎'],
    mark: 'Sys',
  },
  {
    title: 'ゲーム制作のはじめ方',
    summary: 'プログラムと素材制作を組み合わせ、小さなゲームの完成を目指します。',
    audience: '作品を作ってみたい人',
    estimate: '4講習会',
    steps: ['ゲーム制作スタートアップ', 'グラフィックス入門', 'サウンド制作の基本'],
    mark: 'Game',
  },
] as const;

const DiscoveryPrototype = defineComponent({
  name: 'DiscoveryPrototype',
  components: {
    BasiqButton,
    BasiqCard,
    BasiqFormField,
    BasiqInput,
    BasiqThemeProvider,
    Icon,
  },
  setup() {
    const keyword = ref('');
    const team = ref('');
    const year = ref('');
    return { keyword, roadmaps, team, workshops, year };
  },
  template: `
    <BasiqThemeProvider mode="light" class="prototype-theme">
      <div class="shell">
        <aside class="sidebar">
          <a class="brand" href="#" aria-label="1-Monthon ホーム">
            <span class="brand-mark">1M</span>
            <span class="brand-copy"><strong>1-Monthon</strong><small>講習会アーカイブ</small></span>
          </a>

          <nav class="main-nav" aria-label="メインナビゲーション">
            <p>学ぶ</p>
            <a href="#"><Icon name="home" /><span>ホーム</span></a>
            <a href="#" class="active" aria-current="page"><Icon name="search" /><span>見つける</span></a>
            <a href="#"><Icon name="user" /><span>プロフィール</span></a>
          </nav>

          <div class="sidebar-note">
            <Icon name="archive" :size="18" />
            <p><strong>過去の教材も、次の学びへ。</strong><span>講習会と学ぶ順番をまとめて探せます。</span></p>
          </div>
          <small class="version">β · UI prototype</small>
        </aside>

        <div class="workspace">
          <header class="mobile-header">
            <a class="mobile-brand" href="#"><span class="brand-mark">1M</span><strong>1-Monthon</strong></a>
            <span>講習会アーカイブ</span>
          </header>

          <main class="page">
            <h1 class="visually-hidden">講習会とロードマップを探す</h1>
            <section class="view-panel" aria-labelledby="workshop-results-heading">
                  <BasiqCard class="filter-card">
                    <template #header>
                      <div class="filter-header">
                        <div><span class="filter-icon"><Icon name="search" :size="20" /></span><div><strong>講習会を絞り込む</strong><small>キーワード・班・年度を組み合わせられます</small></div></div>
                        <button class="clear-button" type="button">条件をクリア</button>
                      </div>
                    </template>
                    <form class="filter-grid" @submit.prevent>
                      <BasiqFormField label="キーワード" class="keyword-field">
                        <BasiqInput v-model="keyword" type="search" placeholder="例：Web、Git、ゲーム制作" />
                      </BasiqFormField>
                      <BasiqFormField label="班">
                        <template #default="{ id, describedBy }">
                          <select :id="id" v-model="team" :aria-describedby="describedBy">
                            <option value="">すべての班</option>
                            <option>Webエンジニア班</option><option>SysAd班</option><option>アルゴリズム班</option><option>ゲーム班</option>
                          </select>
                        </template>
                      </BasiqFormField>
                      <BasiqFormField label="年度">
                        <template #default="{ id, describedBy }">
                          <select :id="id" v-model="year" :aria-describedby="describedBy">
                            <option value="">すべての年度</option>
                            <option>2026年度</option><option>2025年度</option><option>2024年度</option>
                          </select>
                        </template>
                      </BasiqFormField>
                      <BasiqButton type="submit" class="search-button"><Icon name="search" :size="18" />この条件で検索</BasiqButton>
                    </form>
                  </BasiqCard>

                  <div class="results-heading" id="workshop-results-heading">
                    <div><h2>講習会</h2><span>見つかった教材を新しい順に表示</span></div>
                    <strong>6件</strong>
                  </div>

                  <ul class="workshop-grid">
                    <li v-for="workshop in workshops" :key="workshop.title">
                      <a href="#" class="card-link">
                        <BasiqCard class="workshop-card">
                          <article class="workshop-card-content">
                            <h3>{{ workshop.title }}</h3>
                            <div class="workshop-card-description">
                              <p>{{ workshop.summary }}</p>
                              <Icon name="chevron" :size="19" />
                            </div>
                            <p class="workshop-card-meta">{{ workshop.count }} · {{ workshop.team }} · {{ workshop.year }}</p>
                          </article>
                        </BasiqCard>
                      </a>
                    </li>
                  </ul>
            </section>

            <section class="view-panel roadmap-section" aria-labelledby="roadmap-results-heading">
                  <div class="roadmap-intro">
                    <div class="roadmap-intro-copy"><span class="filter-icon"><Icon name="map" :size="20" /></span><div><h2>目的から、学ぶ順番を選ぶ</h2><p>複数の講習会をつないだロードマップです。今の興味に近いものから始められます。</p></div></div>
                    <BasiqFormField label="ロードマップを検索" class="roadmap-search">
                      <BasiqInput type="search" placeholder="例：Web、インフラ" />
                    </BasiqFormField>
                  </div>

                  <div class="results-heading" id="roadmap-results-heading">
                    <div><p class="eyebrow">Roadmaps</p><h2>公開ロードマップ</h2><span>おすすめの学習順を一覧で表示</span></div>
                    <strong>4件</strong>
                  </div>

                  <ul class="roadmap-grid">
                    <li v-for="roadmap in roadmaps" :key="roadmap.title">
                      <a href="#" class="card-link">
                        <BasiqCard class="roadmap-card">
                          <template #header>
                            <div class="roadmap-card-heading">
                              <span class="roadmap-mark">{{ roadmap.mark }}</span>
                              <div><strong>{{ roadmap.title }}</strong><small>対象：{{ roadmap.audience }}</small></div>
                              <Icon name="chevron" :size="18" />
                            </div>
                          </template>
                          <p class="card-summary">{{ roadmap.summary }}</p>
                          <ol class="step-preview">
                            <li v-for="(step, index) in roadmap.steps" :key="step"><span>{{ index + 1 }}</span><strong>{{ step }}</strong></li>
                          </ol>
                          <template #footer>
                            <div class="card-meta"><span>学ぶ順番を見る</span><strong>{{ roadmap.estimate }}</strong></div>
                          </template>
                        </BasiqCard>
                      </a>
                    </li>
                  </ul>
            </section>
          </main>

          <nav class="mobile-nav" aria-label="モバイルナビゲーション">
            <a href="#"><Icon name="home" :size="19" /><span>ホーム</span></a>
            <a href="#" class="active" aria-current="page"><Icon name="search" :size="19" /><span>見つける</span></a>
            <a href="#"><Icon name="map" :size="19" /><span>ロードマップ</span></a>
            <a href="#"><Icon name="user" :size="19" /><span>プロフィール</span></a>
          </nav>
        </div>
      </div>
    </BasiqThemeProvider>`,
});

createApp(DiscoveryPrototype).mount('#app');
