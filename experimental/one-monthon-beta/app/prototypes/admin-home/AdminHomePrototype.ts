import {
  BasiqButton,
  BasiqFormField,
  BasiqInput,
  BasiqTabs,
  BasiqThemeProvider,
} from 'basiq-ui';
import { computed, defineComponent, h, ref, type PropType } from 'vue/dist/vue.esm-bundler.js';

type IconName = 'home' | 'map' | 'profile' | 'edit' | 'plus' | 'search' | 'chevron';
type RoadmapStatus = 'published' | 'draft';

type Workshop = {
  id: number;
  title: string;
  team: string;
  year: number;
  occurrenceLabel: string;
  status: RoadmapStatus;
  updatedAt: string;
};

type Roadmap = {
  id: number;
  title: string;
  summary: string;
  audience: string;
  workshopCount: number;
  status: RoadmapStatus;
  updatedAt: string;
};

const Icon = defineComponent({
  name: 'PrototypeIcon',
  props: {
    name: { type: String as PropType<IconName>, required: true },
    size: { type: Number, default: 20 },
  },
  setup(props) {
    const paths: Record<IconName, ReturnType<typeof h>[]> = {
      home: [h('path', { d: 'M3 10.5 12 3l9 7.5' }), h('path', { d: 'M5.5 9.5V21h13V9.5' }), h('path', { d: 'M9.5 21v-6h5v6' })],
      map: [h('path', { d: 'm3 6 5-2 8 2 5-2v14l-5 2-8-2-5 2z' }), h('path', { d: 'M8 4v14M16 6v14' })],
      profile: [h('circle', { cx: 12, cy: 8, r: 4 }), h('path', { d: 'M4.5 21a7.5 7.5 0 0 1 15 0' })],
      edit: [h('path', { d: 'M4 20h4l11-11-4-4L4 16z' }), h('path', { d: 'm13.5 6.5 4 4' })],
      plus: [h('path', { d: 'M12 5v14M5 12h14' })],
      search: [h('circle', { cx: 10.5, cy: 10.5, r: 6.5 }), h('path', { d: 'm15.5 15.5 5 5' })],
      chevron: [h('path', { d: 'm9 5 7 7-7 7' })],
    };
    return () => h('svg', {
      class: 'prototype-icon',
      width: props.size,
      height: props.size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.8,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
    }, paths[props.name]);
  },
});

const ROADMAPS: readonly Roadmap[] = [
  {
    id: 1,
    title: 'Web開発の入口',
    summary: 'Gitからフロントエンド、APIまでを順番に学ぶロードマップです。',
    audience: 'Web開発を始めたい人',
    workshopCount: 6,
    status: 'published',
    updatedAt: '2026年9月3日',
  },
  {
    id: 2,
    title: 'グラフィックス入門',
    summary: '画像処理と3DCGの基礎を、実習中心の講習会で身につけます。',
    audience: 'グラフィックス班に興味がある人',
    workshopCount: 5,
    status: 'published',
    updatedAt: '2026年9月2日',
  },
  {
    id: 3,
    title: 'SysAd基礎ロードマップ',
    summary: 'Linux、ネットワーク、コンテナ運用の基本を段階的に学びます。',
    audience: 'サーバー運用を学びたい人',
    workshopCount: 7,
    status: 'draft',
    updatedAt: '2026年9月2日',
  },
  {
    id: 4,
    title: 'ゲーム制作はじめの一歩',
    summary: 'Unityの基本操作から、小さなゲームを完成させるまでを扱います。',
    audience: 'ゲーム制作が初めての人',
    workshopCount: 4,
    status: 'published',
    updatedAt: '2026年8月31日',
  },
  {
    id: 5,
    title: 'データ分析の基礎',
    summary: 'Pythonと機械学習の講習会をつなぐ学習順を整理中です。',
    audience: 'データ分析に興味がある人',
    workshopCount: 3,
    status: 'draft',
    updatedAt: '2026年8月29日',
  },
];

const RECENT_WORKSHOPS: readonly Workshop[] = [
  {
    id: 1,
    title: 'CTF入門講習会',
    team: 'CTF班',
    year: 2026,
    occurrenceLabel: '全4回',
    status: 'draft',
    updatedAt: '9月4日 14:32',
  },
  {
    id: 2,
    title: 'Webエンジニアになろう講習会',
    team: 'Webエンジニア班',
    year: 2026,
    occurrenceLabel: '全6回',
    status: 'published',
    updatedAt: '9月4日 10:08',
  },
  {
    id: 3,
    title: 'サウンド制作入門',
    team: 'サウンド班',
    year: 2026,
    occurrenceLabel: '全3回',
    status: 'published',
    updatedAt: '9月3日 21:15',
  },
  {
    id: 4,
    title: 'Unity基礎講習会',
    team: 'ゲーム班',
    year: 2026,
    occurrenceLabel: '全3回',
    status: 'draft',
    updatedAt: '9月3日 18:40',
  },
];

export default defineComponent({
  name: 'AdminHomePrototype',
  components: {
    BasiqButton,
    BasiqFormField,
    BasiqInput,
    BasiqTabs,
    BasiqThemeProvider,
    Icon,
  },
  setup() {
    const query = ref('');
    const activeStatus = ref('all');
    const tabs = [
      { value: 'all', label: `すべて ${ROADMAPS.length}` },
      { value: 'published', label: `公開中 ${ROADMAPS.filter((roadmap) => roadmap.status === 'published').length}` },
      { value: 'draft', label: `下書き ${ROADMAPS.filter((roadmap) => roadmap.status === 'draft').length}` },
    ] as const;

    const roadmaps = computed(() => {
      const normalized = query.value.trim().toLocaleLowerCase('ja');
      return ROADMAPS.filter((roadmap) => {
        const matchesStatus = activeStatus.value === 'all' || roadmap.status === activeStatus.value;
        const matchesQuery = !normalized || `${roadmap.title} ${roadmap.summary} ${roadmap.audience}`.toLocaleLowerCase('ja').includes(normalized);
        return matchesStatus && matchesQuery;
      });
    });

    return { activeStatus, query, recentWorkshops: RECENT_WORKSHOPS, roadmaps, tabs };
  },
  template: `
    <BasiqThemeProvider mode="light" class="prototype-theme">
      <a class="skip-link" href="#main-content">本文へ移動</a>
      <div class="app-shell">
        <aside class="sidebar">
          <div class="brand">
            <span class="brand-mark">1M</span>
            <span class="brand-copy"><strong>1-Monthon</strong><small>講習会アーカイブ</small></span>
          </div>

          <nav class="desktop-nav" aria-label="メインナビゲーション">
            <p>学ぶ</p>
            <button type="button"><Icon name="home" /><span>ホーム</span></button>
            <button type="button"><Icon name="map" /><span>ロードマップ</span></button>
            <button type="button"><Icon name="profile" /><span>プロフィール</span></button>
          </nav>

          <div class="sidebar-admin">
            <p>運営</p>
            <button class="is-current" type="button" aria-current="page"><Icon name="edit" /><span>運営向けページ</span></button>
          </div>
          <small class="version">UI prototype · 固定データ</small>
        </aside>

        <section class="workspace">
          <header class="mobile-header">
            <span class="brand-mark">1M</span>
            <strong>1-Monthon</strong>
            <span>運営</span>
          </header>

          <main id="main-content" class="admin-page">
            <header class="page-heading">
              <h1>運営向けページ</h1>
              <BasiqButton type="button"><Icon name="plus" :size="18" />講習会を作成</BasiqButton>
            </header>

            <section class="recent-section" aria-labelledby="recent-heading">
              <div class="section-heading compact-heading">
                <div>
                  <h2 id="recent-heading">最近編集した講習会</h2>
                  <p>更新が新しい順に表示しています。</p>
                </div>
                <BasiqButton type="button" tone="neutral" variant="outline">すべて見る</BasiqButton>
              </div>

              <div class="workshop-list" role="list">
                <article v-for="workshop in recentWorkshops" :key="workshop.id" class="workshop-row" role="listitem">
                  <div class="workshop-main">
                    <span class="status-badge" :class="workshop.status">
                      <span aria-hidden="true"></span>{{ workshop.status === 'published' ? '公開中' : '下書き' }}
                    </span>
                    <h3>{{ workshop.title }}</h3>
                  </div>
                  <p class="workshop-meta">{{ workshop.team }} · {{ workshop.year }}年度 · {{ workshop.occurrenceLabel }}</p>
                  <time>{{ workshop.updatedAt }}</time>
                  <BasiqButton type="button" tone="neutral" variant="outline">編集</BasiqButton>
                </article>
              </div>
            </section>

            <section class="roadmap-section" aria-labelledby="roadmap-heading">
              <div class="section-heading compact-heading">
                <div><h2 id="roadmap-heading">ロードマップ管理</h2></div>
                <BasiqButton type="button" tone="neutral" variant="outline"><Icon name="plus" :size="18" />新規作成</BasiqButton>
              </div>

              <div class="management-toolbar">
                <BasiqFormField class="search-field" control-id="roadmap-search">
                  <template #default="field">
                    <div class="search-control">
                      <Icon name="search" :size="18" />
                      <BasiqInput
                        v-model="query"
                        :id="field.id"
                        type="search"
                        placeholder="タイトル・概要・対象から検索"
                        aria-label="ロードマップを検索"
                        :aria-describedby="field.describedBy"
                      />
                    </div>
                  </template>
                </BasiqFormField>
              </div>

              <BasiqTabs
                v-model="activeStatus"
                class="status-tabs"
                :items="tabs"
                aria-label="公開状態で絞り込む"
                :unmount-on-hide="true"
              >
                <template #content>
                  <div v-if="roadmaps.length" class="roadmap-list" role="list">
                    <article v-for="roadmap in roadmaps" :key="roadmap.id" class="roadmap-row" role="listitem">
                      <div class="roadmap-main">
                        <span class="status-badge" :class="roadmap.status">
                          <span aria-hidden="true"></span>{{ roadmap.status === 'published' ? '公開中' : '下書き' }}
                        </span>
                        <div class="roadmap-copy">
                          <h3>{{ roadmap.title }}</h3>
                          <p>{{ roadmap.summary }}</p>
                        </div>
                      </div>
                      <dl class="roadmap-facts">
                        <div><dt>講習会</dt><dd>{{ roadmap.workshopCount }}件</dd></div>
                        <div><dt>対象</dt><dd>{{ roadmap.audience }}</dd></div>
                        <div><dt>更新</dt><dd><time>{{ roadmap.updatedAt }}</time></dd></div>
                      </dl>
                      <div class="row-actions">
                        <BasiqButton v-if="roadmap.status === 'published'" type="button" tone="neutral" variant="outline">閲覧</BasiqButton>
                        <BasiqButton type="button">編集</BasiqButton>
                      </div>
                    </article>
                  </div>
                  <div v-else class="empty-state">
                    <strong>該当するロードマップはありません</strong>
                    <p>検索語を変えるか、別の公開状態を選んでください。</p>
                  </div>
                </template>
              </BasiqTabs>
            </section>
          </main>

          <nav class="mobile-nav" aria-label="モバイルナビゲーション">
            <button type="button"><Icon name="home" /><span>ホーム</span></button>
            <button type="button"><Icon name="map" /><span>ロードマップ</span></button>
            <button type="button"><Icon name="profile" /><span>プロフィール</span></button>
            <button class="is-current" type="button" aria-current="page"><Icon name="edit" /><span>運営</span></button>
          </nav>
        </section>
      </div>
    </BasiqThemeProvider>
  `,
});
