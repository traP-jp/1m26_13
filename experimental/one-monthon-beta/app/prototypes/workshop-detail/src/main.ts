import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-800.css';
import '@fontsource/m-plus-1p/400.css';
import '@fontsource/m-plus-1p/500.css';
import '@fontsource/m-plus-1p/700.css';
import '@fontsource/m-plus-1p/800.css';
import 'basiq-ui/styles.css';
import './style.css';

import {
  BasiqButton,
  BasiqCard,
  BasiqSwitch,
  BasiqTabs,
  BasiqThemeProvider,
} from 'basiq-ui';
import {
  computed,
  createApp,
  defineComponent,
  ref,
  watch,
  type PropType,
} from 'vue/dist/vue.esm-bundler.js';
import AppIcon from '../../../ui/components/AppIcon';

type Occurrence = {
  kind: '通常開催' | '再放送';
  title: string;
  description: string;
  date: string;
  location: string;
  material: string;
};

type WorkshopRound = {
  number: number;
  label: string;
  state: string;
};

type WorkshopScenario = {
  id: string;
  title: string;
  summary: string;
  team: string;
  year: string;
  format: string;
  focusRound: number;
  rounds: WorkshopRound[];
  roundOccurrences: Record<number, Occurrence[]>;
  audience: string;
  prerequisites: string;
  before: string;
  after: string;
};

const scenarios: Record<string, WorkshopScenario> = {
  single: {
    id: 'single',
    title: 'はじめてのGit',
    summary: 'Gitの基本操作を、手元で試しながら身につける1回完結の講習会です。',
    team: 'SysAd班',
    year: '2026年度',
    format: '1回完結',
    focusRound: 1,
    rounds: [{ number: 1, label: '本編', state: '公開済み' }],
    roundOccurrences: {
      1: [
        {
          kind: '通常開催',
          title: 'はじめてのGit',
          description:
            'リポジトリの作成からcommit、branch、mergeまでを実際に操作します。講習会後に一人で履歴を確認できる状態を目指します。',
          date: '2026年4月18日（土）13:00–15:00',
          location: '部室・オンライン',
          material: 'はじめてのGit 受講資料',
        },
      ],
    },
    audience: 'Gitを初めて使う人、操作を基礎から復習したい人',
    prerequisites: 'PCへGitをインストール済みであること',
    before: '開発環境セットアップ会',
    after: 'Webアプリ開発入門',
  },
  series: {
    id: 'series',
    title: 'プログラミング基礎講習会',
    summary: '読み書きから関数・配列までを3回に分け、順番に手を動かして学びます。',
    team: 'アルゴリズム班',
    year: '2026年度',
    format: '全3回',
    focusRound: 2,
    rounds: [
      { number: 1, label: '変数と条件分岐', state: '完了' },
      { number: 2, label: '関数と配列', state: '閲覧中' },
      { number: 3, label: '小さなプログラム', state: '次に学ぶ' },
    ],
    roundOccurrences: {
      1: [
        {
          kind: '通常開催',
          title: '第1回 変数と条件分岐',
          description: '変数に値を入れる基本と、条件によって処理を分ける考え方を演習します。',
          date: '2026年4月12日（日）13:00–15:00',
          location: '部室',
          material: '第1回 変数と条件分岐',
        },
      ],
      2: [
        {
          kind: '通常開催',
          title: '第2回 関数と配列',
          description:
            '関数に処理をまとめる考え方と、複数の値を配列で扱う方法を演習します。第1回の内容から自然につながる構成です。',
          date: '2026年4月19日（日）13:00–15:00',
          location: '部室',
          material: '第2回 関数と配列',
        },
      ],
      3: [
        {
          kind: '通常開催',
          title: '第3回 小さなプログラム',
          description: 'これまでに学んだ要素を組み合わせ、入力から結果を返す小さなプログラムを完成させます。',
          date: '2026年4月26日（日）13:00–15:00',
          location: '部室',
          material: '第3回 小さなプログラム',
        },
      ],
    },
    audience: 'プログラミング未経験者',
    prerequisites: '第1回「変数と条件分岐」を受講済み、または同程度の知識',
    before: 'PC基礎講習会',
    after: '競技プログラミング入門',
  },
  rebroadcast: {
    id: 'rebroadcast',
    title: 'プログラミング基礎講習会',
    summary: '欠席した回も追いつけるように、通常開催と再放送を同じ回としてまとめています。',
    team: 'アルゴリズム班',
    year: '2026年度',
    format: '全3回・再放送あり',
    focusRound: 2,
    rounds: [
      { number: 1, label: '変数と条件分岐', state: '完了' },
      { number: 2, label: '関数と配列', state: '通常＋再放送' },
      { number: 3, label: '小さなプログラム', state: '次に学ぶ' },
    ],
    roundOccurrences: {
      1: [
        {
          kind: '通常開催',
          title: '第1回 変数と条件分岐',
          description: '変数に値を入れる基本と、条件によって処理を分ける考え方を演習します。',
          date: '2026年4月12日（日）13:00–15:00',
          location: '部室',
          material: '第1回 変数と条件分岐',
        },
      ],
      2: [
        {
          kind: '通常開催',
          title: '第2回 関数と配列',
          description:
            '関数と配列を使い、重複する処理や複数のデータを読みやすく整理します。',
          date: '2026年4月19日（日）13:00–15:00',
          location: '部室',
          material: '第2回 通常開催の教材',
        },
        {
          kind: '再放送',
          title: '第2回 関数と配列',
          description:
            '通常開催と同じ到達点を、質問時間を多めに取った進行で学び直せます。',
          date: '2026年4月23日（木）18:00–20:00',
          location: 'オンライン',
          material: '第2回 再放送の教材',
        },
      ],
      3: [
        {
          kind: '通常開催',
          title: '第3回 小さなプログラム',
          description: 'これまでに学んだ要素を組み合わせ、入力から結果を返す小さなプログラムを完成させます。',
          date: '2026年4月26日（日）13:00–15:00',
          location: '部室',
          material: '第3回 小さなプログラム',
        },
      ],
    },
    audience: 'プログラミング未経験者、第2回を欠席した人',
    prerequisites: '第1回「変数と条件分岐」を受講済み、または同程度の知識',
    before: 'PC基礎講習会',
    after: '競技プログラミング入門',
  },
};

const RoundDetails = defineComponent({
  name: 'RoundDetails',
  components: { AppIcon, BasiqButton, BasiqCard },
  emits: ['toggle-completed'],
  props: {
    scenario: {
      type: Object as PropType<WorkshopScenario>,
      required: true,
    },
    round: {
      type: Object as PropType<WorkshopRound>,
      required: true,
    },
    occurrences: {
      type: Array as PropType<Occurrence[]>,
      required: true,
    },
    completed: {
      type: Boolean,
      required: true,
    },
  },
  setup(props) {
    const primary = computed(() => props.occurrences[0]);
    return { primary };
  },
  template: `
    <div class="detail-grid">
      <main class="detail-main">
        <section class="content-section outcome-section">
          <div class="section-heading">
            <div>
              <span class="eyebrow">第{{ round.number }}回</span>
              <h2>この回で学べること</h2>
            </div>
            <span v-if="occurrences.length > 1">{{ occurrences.length }}つの開催</span>
          </div>

          <div class="occurrence-stack">
            <BasiqCard v-for="occurrence in occurrences" :key="occurrence.kind + occurrence.date" class="occurrence-card">
              <template #header>
                <div class="occurrence-heading">
                  <div>
                    <span v-if="occurrence.kind === '再放送'" class="kind-label">再放送</span>
                    <h3>{{ occurrence.title }}</h3>
                  </div>
                  <BasiqButton tone="neutral" variant="outline"><AppIcon name="book" :size="17" />教材</BasiqButton>
                </div>
              </template>
              <p class="occurrence-description">{{ occurrence.description }}</p>
              <dl class="occurrence-facts">
                <div><dt><AppIcon name="calendar" :size="16" />日時</dt><dd>{{ occurrence.date }}</dd></div>
                <div><dt><AppIcon name="pin" :size="16" />場所</dt><dd>{{ occurrence.location }}</dd></div>
                <div><dt><AppIcon name="book" :size="16" />教材</dt><dd>{{ occurrence.material }}</dd></div>
              </dl>
            </BasiqCard>
          </div>
        </section>

        <section class="content-section audience-grid" aria-label="対象者と前提知識">
          <div><span class="eyebrow">FOR</span><h2>対象者</h2><p>{{ scenario.audience }}</p></div>
          <div><span class="eyebrow">BEFORE</span><h2>前提知識</h2><p>{{ scenario.prerequisites }}</p></div>
        </section>

        <section class="content-section connections-section">
          <div class="section-heading"><div><span class="eyebrow">LEARNING PATH</span><h2>前後の講習会</h2></div></div>
          <div class="connection-grid">
            <div><span>先に学ぶ</span><strong>{{ scenario.before }}</strong><AppIcon name="chevron" :size="17" /></div>
            <div><span>次に学ぶ</span><strong>{{ scenario.after }}</strong><AppIcon name="chevron" :size="17" /></div>
          </div>
        </section>
      </main>

      <aside class="detail-rail">
        <BasiqCard class="learning-card">
          <template #header><h2>学習状況</h2></template>
          <div class="status-block" :class="{ completed }">
            <span class="status-mark"><AppIcon :name="completed ? 'check' : 'record'" :size="21" /></span>
            <span><strong>{{ completed ? '完了済み' : '未完了' }}</strong><small>{{ completed ? 'プロフィールに記録済みです' : '受講後に完了を記録できます' }}</small></span>
          </div>
          <BasiqButton class="completion-button" :tone="completed ? 'neutral' : 'accent'" :variant="completed ? 'outline' : 'solid'" @click="$emit('toggle-completed')">
            {{ completed ? '完了を取り消す' : '受講し終わった' }}
          </BasiqButton>
        </BasiqCard>

        <BasiqCard>
          <template #header><h2>今回の開催</h2></template>
          <dl class="rail-facts">
            <div><dt><AppIcon name="calendar" :size="16" />日時</dt><dd>{{ primary.date }}</dd></div>
            <div><dt><AppIcon name="pin" :size="16" />場所</dt><dd>{{ primary.location }}</dd></div>
            <div><dt><AppIcon name="user" :size="16" />講師・運営</dt><dd>{{ scenario.team }} 講習会担当</dd></div>
          </dl>
        </BasiqCard>

        <BasiqCard>
          <template #header><h2>含まれるロードマップ</h2></template>
          <div class="roadmap-link"><span><strong>新入生向け 基礎ロードマップ</strong><small>2 / 6 完了</small></span><AppIcon name="chevron" :size="17" /></div>
        </BasiqCard>
      </aside>
    </div>
  `,
});

const ScenarioDetail = defineComponent({
  name: 'ScenarioDetail',
  components: { AppIcon, BasiqButton, BasiqTabs, RoundDetails },
  emits: ['toggle-completed'],
  props: {
    scenario: {
      type: Object as PropType<WorkshopScenario>,
      required: true,
    },
    completed: {
      type: Boolean,
      required: true,
    },
  },
  setup(props) {
    const selectedRound = ref(String(props.scenario.focusRound));
    watch(
      () => props.scenario.id,
      () => {
        selectedRound.value = String(props.scenario.focusRound);
      },
    );
    const roundTabs = computed(() =>
      props.scenario.rounds.map((round) => ({
        value: String(round.number),
        label: `第${round.number}回 ${round.label}`,
      })),
    );
    const activeRound = computed(
      () =>
        props.scenario.rounds.find(
          (round) => String(round.number) === selectedRound.value,
        ) ?? props.scenario.rounds[0],
    );
    const activeOccurrences = computed(
      () => props.scenario.roundOccurrences[activeRound.value.number] ?? [],
    );
    return { activeOccurrences, activeRound, roundTabs, selectedRound };
  },
  template: `
    <article class="detail-preview">
      <nav class="breadcrumb" aria-label="パンくず">
        <span>ホーム</span><AppIcon name="chevron" :size="14" />
        <span>講習会</span><AppIcon name="chevron" :size="14" />
        <strong aria-current="page">詳細</strong>
      </nav>

      <header class="workshop-heading">
        <div class="heading-copy">
          <div class="meta-tags">
            <span>{{ scenario.team }}</span>
            <span>{{ scenario.year }}</span>
            <span>{{ scenario.format }}</span>
          </div>
          <h1>{{ scenario.title }}</h1>
          <p>{{ scenario.summary }}</p>
        </div>
        <BasiqButton tone="neutral" variant="outline"><AppIcon name="edit" :size="17" />編集</BasiqButton>
      </header>

      <section v-if="scenario.rounds.length > 1" class="series-tabs-section" aria-labelledby="series-title">
        <div class="series-title-row">
          <div>
            <span class="eyebrow">シリーズ構成</span>
            <h2 id="series-title">全{{ scenario.rounds.length }}回</h2>
          </div>
          <span>第{{ activeRound.number }}回を表示中</span>
        </div>
        <BasiqTabs v-model="selectedRound" :items="roundTabs" aria-label="シリーズの回" class="round-tabs">
          <template #content>
            <RoundDetails
              :scenario="scenario"
              :round="activeRound"
              :occurrences="activeOccurrences"
              :completed="completed"
              @toggle-completed="$emit('toggle-completed')"
            />
          </template>
        </BasiqTabs>
      </section>

      <RoundDetails
        v-else
        :scenario="scenario"
        :round="activeRound"
        :occurrences="activeOccurrences"
        :completed="completed"
        @toggle-completed="$emit('toggle-completed')"
      />
    </article>
  `,
});

const PrototypeApp = defineComponent({
  name: 'WorkshopDetailPrototype',
  components: {
    AppIcon,
    BasiqButton,
    BasiqCard,
    BasiqSwitch,
    BasiqTabs,
    BasiqThemeProvider,
    ScenarioDetail,
  },
  setup() {
    const selectedScenario = ref('series');
    const completed = ref(false);
    const controlsOpen = ref(false);
    const tabs = [
      { value: 'single', label: '単発' },
      { value: 'series', label: '複数回' },
      { value: 'rebroadcast', label: '再放送あり' },
    ];
    watch(selectedScenario, () => {
      completed.value = false;
    });
    return { completed, controlsOpen, scenarios, selectedScenario, tabs };
  },
  template: `
    <BasiqThemeProvider mode="light" class="prototype-root">
      <div class="app-shell">
        <aside class="site-sidebar">
          <div class="site-brand"><span class="site-mark">1M</span><span><strong>1-Monthon</strong><small>講習会アーカイブ</small></span></div>
          <nav class="site-navigation" aria-label="メインナビゲーション">
            <p>学ぶ</p>
            <div><AppIcon name="home" /><span>ホーム</span></div>
            <div class="current"><AppIcon name="search" /><span>講習会</span></div>
            <div><AppIcon name="map" /><span>ロードマップ</span></div>
            <div><AppIcon name="user" /><span>プロフィール</span></div>
          </nav>
          <div class="sidebar-footer"><span>静的UIプロトタイプ</span><small>データ保存・API接続なし</small></div>
        </aside>

        <div class="workspace">
          <header class="mobile-header"><div><span class="site-mark">1M</span><strong>1-Monthon</strong></div><span>講習会詳細</span></header>
          <ScenarioDetail
            :scenario="scenarios[selectedScenario]"
            :completed="completed"
            @toggle-completed="completed = !completed"
          />
        </div>
      </div>

      <aside class="prototype-controls" aria-label="プロトタイプの表示設定">
        <BasiqCard v-if="controlsOpen" class="prototype-control-card">
          <template #header>
            <div class="prototype-control-heading">
              <span><AppIcon name="wand" :size="18" /><strong>表示見本</strong></span>
              <BasiqButton tone="neutral" variant="outline" @click="controlsOpen = false">折りたたむ</BasiqButton>
            </div>
          </template>
          <p class="prototype-control-note">レビュー用の操作です。本番の詳細画面には含まれません。</p>
          <div class="prototype-control-group">
            <span class="prototype-control-label">講習会の構成</span>
            <BasiqTabs v-model="selectedScenario" :items="tabs" aria-label="講習会の表示バリエーション" class="scenario-tabs">
              <template #content="{ item }"><p class="scenario-note">{{ scenarios[item.value].format }}の情報配置を表示中</p></template>
            </BasiqTabs>
          </div>
          <div class="prototype-control-group completion-control">
            <span class="prototype-control-label">学習状況</span>
            <BasiqSwitch v-model="completed">完了済みの状態で表示</BasiqSwitch>
          </div>
        </BasiqCard>
        <BasiqButton v-else class="prototype-control-trigger" tone="accent" variant="solid" :aria-expanded="false" @click="controlsOpen = true">
          <AppIcon name="wand" :size="18" />表示見本
        </BasiqButton>
      </aside>
    </BasiqThemeProvider>
  `,
});

createApp(PrototypeApp).mount('#app');
