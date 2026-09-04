import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/m-plus-1p/400.css';
import '@fontsource/m-plus-1p/500.css';
import '@fontsource/m-plus-1p/700.css';
import 'basiq-ui/styles.css';
import './styles.css';

import {
  BasiqButton,
  BasiqCard,
  BasiqCheckbox,
  BasiqFormField,
  BasiqInput,
  BasiqRadioGroup,
  BasiqSwitch,
  BasiqTabs,
  BasiqTextarea,
  BasiqThemeProvider,
} from 'basiq-ui';
import { computed, createApp, defineComponent, ref, watch } from 'vue/dist/vue.esm-bundler.js';

const AppIcon = defineComponent({
  name: 'AppIcon',
  props: { name: { type: String, required: true }, size: { type: Number, default: 20 } },
  template: `
    <svg class="app-icon" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <template v-if="name === 'home'"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></template>
      <template v-else-if="name === 'map'"><path d="m3 6 5-2 8 3 5-2v13l-5 2-8-3-5 2Z"/><path d="M8 4v13M16 7v13"/></template>
      <template v-else-if="name === 'user'"><circle cx="12" cy="8" r="3"/><path d="M5 21c.7-4 3-6 7-6s6.3 2 7 6"/></template>
      <template v-else-if="name === 'edit'"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></template>
      <template v-else-if="name === 'copy'"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></template>
      <template v-else-if="name === 'trash'"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></template>
      <template v-else-if="name === 'calendar'"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></template>
      <template v-else-if="name === 'book'"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22Z"/></template>
      <template v-else><path d="M12 3v18M3 12h18"/></template>
    </svg>`,
});

const editorTabs = [
  { label: '編集', value: 'edit' },
  { label: '新規登録', value: 'new' },
];

const flowSteps = [
  { number: 1, label: '基本情報' },
  { number: 2, label: '開催' },
  { number: 3, label: '公開・教材' },
  { number: 4, label: 'つながり' },
  { number: 5, label: '確認' },
];

const occurrenceTypes = [
  { label: '通常開催', value: 'standard', description: '新しい回として開催' },
  { label: '再放送', value: 'rebroadcast', description: '同じ回をもう一度開催' },
  { label: '総集編', value: 'digest', description: '複数回をまとめて開催' },
];

const WorkshopEditorPrototype = defineComponent({
  name: 'WorkshopEditorPrototype',
  components: {
    AppIcon,
    BasiqButton,
    BasiqCard,
    BasiqCheckbox,
    BasiqFormField,
    BasiqInput,
    BasiqRadioGroup,
    BasiqSwitch,
    BasiqTabs,
    BasiqTextarea,
    BasiqThemeProvider,
  },
  setup() {
    const mode = ref('edit');
    const currentStep = ref(1);
    const published = ref(true);
    const kind = ref('standard');
    const prerequisiteGit = ref(true);
    const prerequisiteWeb = ref(false);
    const successorTs = ref(true);
    const successorDeploy = ref(false);
    const step = computed(() => flowSteps[currentStep.value - 1]);
    const progress = computed(() => `${currentStep.value * 20}%`);
    const goToStep = (next: number) => {
      currentStep.value = Math.min(5, Math.max(1, next));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    watch(mode, () => {
      currentStep.value = 1;
      published.value = mode.value === 'edit';
    });
    return {
      mode,
      currentStep,
      step,
      progress,
      published,
      kind,
      prerequisiteGit,
      prerequisiteWeb,
      successorTs,
      successorDeploy,
      editorTabs,
      flowSteps,
      occurrenceTypes,
      goToStep,
    };
  },
  template: `
    <BasiqThemeProvider mode="light" class="theme-root">
      <div class="app-shell">
        <aside class="sidebar">
          <div class="brand"><span class="brand-mark">1M</span><span><strong>1-Monthon</strong><small>講習会アーカイブ</small></span></div>
          <nav aria-label="メインナビゲーション"><p>学ぶ</p><a href="#"><AppIcon name="home" />ホーム</a><a href="#"><AppIcon name="map" />ロードマップ</a><a href="#"><AppIcon name="user" />プロフィール</a></nav>
          <div class="sidebar-admin"><p>運営</p><a class="active" href="#" aria-current="page"><AppIcon name="edit" />運営向けページ</a></div>
        </aside>

        <div class="site-workspace">
          <header class="mobile-header"><div class="mobile-brand"><span class="brand-mark">1M</span><strong>1-Monthon</strong></div><span>講習会管理</span></header>
          <main>
            <div class="breadcrumb"><span>運営向けページ</span><b>/</b><span>{{ mode === 'edit' ? '講習会を編集' : '講習会を登録' }}</span></div>
            <header class="page-header">
              <h1>{{ mode === 'edit' ? '講習会を編集' : '講習会を登録' }}</h1>
              <span class="header-status" :class="{ draft: mode === 'new' }"><span></span>{{ mode === 'edit' ? '公開中' : '未保存' }}</span>
            </header>

            <BasiqTabs v-model="mode" class="mode-tabs" :items="editorTabs" aria-label="編集状態" list-width="100%">
              <template #content="{ item }">
                <div class="flow-shell">
                  <nav class="flow-navigation" aria-label="講習会登録の進捗">
                    <div class="progress-track"><span :style="{ width: progress }"></span></div>
                    <ol>
                      <li v-for="flowStep in flowSteps" :key="flowStep.number" :class="{ active: currentStep === flowStep.number, complete: currentStep > flowStep.number }">
                        <button type="button" :aria-current="currentStep === flowStep.number ? 'step' : undefined" @click="goToStep(flowStep.number)">
                          <span class="step-marker">{{ currentStep > flowStep.number ? '✓' : flowStep.number }}</span><strong>{{ flowStep.label }}</strong>
                        </button>
                      </li>
                    </ol>
                  </nav>

                  <div class="step-context"><span>{{ currentStep }} / 5</span><h2>{{ step.label }}</h2></div>

                  <section v-if="currentStep === 1" class="step-panel">
                    <BasiqCard class="section-card">
                      <template #header><div class="card-heading"><div><span class="step-number">1</span><h2>講習会名と概要</h2></div></div></template>
                      <div class="field-grid">
                        <BasiqFormField class="field-wide" label="講習会名" required description="シリーズの場合は、シリーズ全体の名前を書きます。"><BasiqInput :model-value="item.value === 'edit' ? 'Webフロントエンド入門' : ''" placeholder="例：Webフロントエンド入門" required /></BasiqFormField>
                        <BasiqFormField class="field-wide" label="概要" required description="どんな人に、何を学んでもらう講習会かを短くまとめます。"><BasiqTextarea :model-value="item.value === 'edit' ? 'HTML・CSS・JavaScriptの基本を、手を動かしながら学ぶ全3回の講習会です。' : ''" placeholder="講習会で扱う内容を短くまとめます" :rows="4" required /></BasiqFormField>
                      </div>
                    </BasiqCard>
                  </section>

                  <section v-else-if="currentStep === 2" class="step-panel">
                    <div class="section-toolbar"><BasiqButton type="button"><AppIcon name="plus" :size="18" />開催を追加</BasiqButton></div>
                    <BasiqCard class="occurrence-card">
                      <template #header><div class="occurrence-heading"><div><span class="occurrence-index">第1回</span><div><h3>{{ item.value === 'edit' ? 'Webページの仕組みとHTML' : '開催内容' }}</h3><p>通常開催</p></div></div><div class="card-actions"><BasiqButton v-if="item.value === 'edit'" tone="neutral" variant="outline" type="button"><AppIcon name="copy" :size="17" />複製</BasiqButton><BasiqButton tone="danger" variant="outline" type="button" aria-label="第1回を削除"><AppIcon name="trash" :size="17" /></BasiqButton></div></div></template>
                      <div class="field-grid">
                        <BasiqFormField label="回のタイトル" required><BasiqInput :model-value="item.value === 'edit' ? 'Webページの仕組みとHTML' : ''" placeholder="例：HTMLの基本" required /></BasiqFormField>
                        <BasiqFormField label="回番号"><BasiqInput model-value="1" inputmode="numeric" /></BasiqFormField>
                        <BasiqRadioGroup class="field-wide" v-model="kind" label="開催種別" :items="occurrenceTypes" orientation="horizontal" />
                        <BasiqFormField class="field-wide" label="この回で学べること" required><BasiqTextarea :model-value="item.value === 'edit' ? 'ブラウザがWebページを表示する仕組みと、意味のあるHTMLの書き方を学びます。' : ''" :rows="3" required /></BasiqFormField>
                        <BasiqFormField label="日時"><BasiqInput :model-value="item.value === 'edit' ? '2026-09-18 18:00' : ''" placeholder="未定でも保存できます" /></BasiqFormField>
                        <BasiqFormField label="場所"><BasiqInput :model-value="item.value === 'edit' ? '部室' : ''" /></BasiqFormField>
                        <BasiqFormField label="開催する組織・班" required><BasiqInput :model-value="item.value === 'edit' ? 'Webエンジニア班' : ''" required /></BasiqFormField>
                        <BasiqFormField label="対象者" required><BasiqInput :model-value="item.value === 'edit' ? 'プログラミング初学者' : ''" required /></BasiqFormField>
                      </div>
                    </BasiqCard>
                    <BasiqCard v-if="item.value === 'edit'" class="occurrence-card compact-occurrence"><template #header><div class="occurrence-heading"><div><span class="occurrence-index muted">第2回</span><div><h3>CSSレイアウトの基本</h3><p>通常開催 · 下書き</p></div></div><div class="card-actions"><BasiqButton tone="neutral" variant="outline" type="button"><AppIcon name="copy" :size="17" />複製</BasiqButton><BasiqButton tone="danger" variant="outline" type="button" aria-label="第2回を削除"><AppIcon name="trash" :size="17" /></BasiqButton></div></div></template><div class="summary-row"><span><AppIcon name="calendar" :size="17" />2026年9月25日 18:00</span><span>部室</span><span>教材は未設定</span><BasiqButton tone="neutral" variant="outline" type="button">内容を開く</BasiqButton></div></BasiqCard>
                  </section>

                  <section v-else-if="currentStep === 3" class="step-panel split-panel">
                    <BasiqCard class="section-card publish-card">
                      <template #header><div class="card-heading"><div><span class="step-number">3</span><h2>公開状態</h2></div><span class="completion-chip" :class="{ empty: !published }">{{ published ? '公開' : '下書き' }}</span></div></template>
                      <div class="publish-control"><BasiqSwitch v-model="published">学習者に公開する</BasiqSwitch><p>公開すると、検索・ロードマップ・講習会詳細に表示されます。</p></div>
                    </BasiqCard>
                    <BasiqCard class="section-card materials-card">
                      <template #header><div class="card-heading"><div><span class="material-icon"><AppIcon name="book" :size="20" /></span><h2>第1回の教材</h2></div><span class="completion-chip" :class="{ empty: item.value === 'new' }">{{ item.value === 'edit' ? '設定済み' : '未設定' }}</span></div></template>
                      <div class="field-grid"><BasiqFormField class="field-wide" label="教材URL"><BasiqInput type="url" :model-value="item.value === 'edit' ? 'https://example.com/web-basics/01' : ''" placeholder="https://" /></BasiqFormField><BasiqFormField class="field-wide" label="教材の説明文"><BasiqInput :model-value="item.value === 'edit' ? '第1回 スライドと演習問題' : ''" placeholder="例：スライドと演習問題" /></BasiqFormField></div>
                    </BasiqCard>
                  </section>

                  <section v-else-if="currentStep === 4" class="step-panel">
                    <BasiqCard class="section-card connections-card">
                      <template #header><div class="card-heading"><div><span class="step-number">4</span><h2>関連する講習会</h2></div></div></template>
                      <div class="connection-columns">
                        <section><div class="connection-label"><h3>先に学ぶ</h3><span>1件選択</span></div><label class="choice-row selected"><BasiqCheckbox v-model="prerequisiteGit" /><span><strong>Git入門</strong><small>変更履歴と共同作業の基本</small></span></label><label class="choice-row"><BasiqCheckbox v-model="prerequisiteWeb" /><span><strong>Webシステム入門</strong><small>Webの全体像をつかむ</small></span></label></section>
                        <section><div class="connection-label"><h3>次に学ぶ</h3><span>1件選択</span></div><label class="choice-row selected"><BasiqCheckbox v-model="successorTs" /><span><strong>TypeScript入門</strong><small>型を使ったフロントエンド開発</small></span></label><label class="choice-row"><BasiqCheckbox v-model="successorDeploy" /><span><strong>Webサービス公開入門</strong><small>作ったサービスを公開する</small></span></label></section>
                      </div>
                    </BasiqCard>
                  </section>

                  <section v-else class="step-panel review-panel">
                    <p class="review-intro">入力内容を確認して、{{ item.value === 'edit' ? '変更を保存' : '講習会を作成' }}してください。</p>
                    <div class="review-grid">
                      <BasiqCard><template #header><h3>講習会基本情報</h3></template><dl><div><dt>講習会名</dt><dd>{{ item.value === 'edit' ? 'Webフロントエンド入門' : '未入力' }}</dd></div><div><dt>開催</dt><dd>{{ item.value === 'edit' ? '2回（公開1・下書き1）' : '1回（未入力）' }}</dd></div></dl></BasiqCard>
                      <BasiqCard><template #header><h3>公開と教材</h3></template><dl><div><dt>公開状態</dt><dd>{{ published ? '学習者に公開' : '下書き' }}</dd></div><div><dt>教材</dt><dd>{{ item.value === 'edit' ? '第1回に設定済み' : '未設定' }}</dd></div></dl></BasiqCard>
                      <BasiqCard><template #header><h3>学びのつながり</h3></template><dl><div><dt>先に学ぶ</dt><dd>Git入門</dd></div><div><dt>次に学ぶ</dt><dd>TypeScript入門</dd></div></dl></BasiqCard>
                    </div>
                    <div v-if="item.value === 'edit'" class="danger-zone"><div><strong>講習会を削除</strong><p>開催・完了記録・ロードマップ上の配置も削除されます。</p></div><BasiqButton tone="danger" variant="outline" type="button"><AppIcon name="trash" :size="17" />講習会を削除</BasiqButton></div>
                  </section>

                  <footer class="flow-actions"><div><BasiqButton v-if="currentStep > 1" tone="neutral" variant="outline" type="button" @click="goToStep(currentStep - 1)">戻る</BasiqButton><BasiqButton v-if="currentStep < 5" type="button" @click="goToStep(currentStep + 1)">次へ：{{ flowSteps[currentStep].label }}</BasiqButton><BasiqButton v-else type="button">{{ item.value === 'edit' ? '変更を保存' : '講習会を作成' }}</BasiqButton></div></footer>
                </div>
              </template>
            </BasiqTabs>
          </main>
        </div>

        <nav class="mobile-nav" aria-label="モバイルナビゲーション"><a href="#"><AppIcon name="home" />ホーム</a><a href="#"><AppIcon name="map" />ロードマップ</a><a href="#"><AppIcon name="user" />プロフィール</a><a class="active" href="#" aria-current="page"><AppIcon name="edit" />運営</a></nav>
      </div>
    </BasiqThemeProvider>`,
});

createApp(WorkshopEditorPrototype).mount('#app');
