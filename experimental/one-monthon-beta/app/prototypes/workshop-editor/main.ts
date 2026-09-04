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
import { createApp, defineComponent, reactive, ref, watch } from 'vue/dist/vue.esm-bundler.js';

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
      <template v-else><path d="M12 3v18M3 12h18"/></template>
    </svg>`,
});

type SectionKey = 'general' | 'round1' | 'round2' | 'settings';

const sectionTabs = [
  { label: '全般', value: 'general' },
  { label: '第1回', value: 'round1' },
  { label: '第2回', value: 'round2' },
  { label: '設定', value: 'settings' },
];
const tabItems = [sectionTabs[0], sectionTabs[1], sectionTabs[2], { label: '開催を追加', value: 'add' }, sectionTabs[3]];
const wizardSteps: Record<SectionKey, string[]> = {
  general: ['基本情報', '対象とゴール', '関連する講習会'],
  round1: ['開催内容', '開催準備', '公開と教材'],
  round2: ['開催内容', '開催準備', '公開と教材'],
  settings: ['開催の管理', '削除の設定'],
};
const occurrenceTypes = [
  { label: '通常開催', value: 'standard', description: '新しい回として開催' },
  { label: '再放送', value: 'rebroadcast', description: '同じ回をもう一度開催' },
  { label: '総集編', value: 'digest', description: '複数回をまとめて開催' },
];

const WorkshopEditorPrototype = defineComponent({
  name: 'WorkshopEditorPrototype',
  components: { AppIcon, BasiqButton, BasiqCard, BasiqCheckbox, BasiqFormField, BasiqInput, BasiqRadioGroup, BasiqSwitch, BasiqTabs, BasiqTextarea, BasiqThemeProvider },
  setup() {
    const activeTab = ref<SectionKey>('general');
    const modalOpen = ref(false);
    const copiedRound = ref('');
    const course = reactive({ name: 'Webフロントエンド入門', description: 'HTML・CSS・JavaScriptの基本を、手を動かしながら学ぶ全3回の講習会です。', target: 'Web開発を始めたい人', goal: '簡単なWebページを自分で組み立てられる' });
    const rounds = reactive({
      round1: { title: 'Webページの仕組みとHTML', number: '1', kind: 'standard', learning: 'ブラウザがWebページを表示する仕組みと、意味のあるHTMLの書き方を学びます。', datetime: '2026-09-18 18:00', location: '部室', group: 'Webエンジニア班', target: 'プログラミング初学者', materialUrl: 'https://example.com/web-basics/01', materialDescription: 'スライドと演習問題' },
      round2: { title: 'CSSレイアウトの基本', number: '2', kind: 'standard', learning: 'FlexboxとGridを使い、画面幅に合わせたレイアウトを作ります。', datetime: '2026-09-25 18:00', location: '部室', group: 'Webエンジニア班', target: '第1回を終えた人', materialUrl: '', materialDescription: '' },
    });
    const published = reactive({ round1: true, round2: false });
    const preparation = reactive({ round1: { knoq: true, office: false, ta: false }, round2: { knoq: false, office: false, ta: false } });
    const prerequisiteGit = ref(true);
    const prerequisiteWeb = ref(false);
    const successorTs = ref(true);
    const successorDeploy = ref(false);
    const newKind = ref('standard');
    const wizardPosition = reactive<Record<SectionKey, number>>({ general: 0, round1: 0, round2: 0, settings: 0 });
    const wizardCompleted = reactive<Record<SectionKey, boolean>>({ general: false, round1: false, round2: false, settings: false });

    const selectTab = (value: string) => {
      if (value === 'add') { modalOpen.value = true; return; }
      activeTab.value = value as SectionKey;
    };
    const stepCount = (tab: SectionKey) => wizardSteps[tab].length;
    const goWizard = (tab: SectionKey, delta: number) => {
      wizardCompleted[tab] = false;
      wizardPosition[tab] = Math.min(stepCount(tab) - 1, Math.max(0, wizardPosition[tab] + delta));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const finishWizard = (tab: SectionKey) => { wizardCompleted[tab] = true; window.scrollTo({ top: 0, behavior: 'smooth' }); };
    const reopenWizard = (tab: SectionKey) => { wizardCompleted[tab] = false; };
    const nextSection = (tab: SectionKey) => {
      const next = sectionTabs[sectionTabs.findIndex((section) => section.value === tab) + 1];
      if (next) activeTab.value = next.value as SectionKey;
    };
    const announcement = (tab: 'round1' | 'round2') => `# ${course.name} ${tab === 'round1' ? '第1回' : '第2回'}\n\n${rounds[tab].datetime}に${rounds[tab].location}で「${rounds[tab].title}」を開催します。\n\n対象：${rounds[tab].target}\n内容：${rounds[tab].learning}`;
    const copyAnnouncement = async (tab: 'round1' | 'round2') => {
      try { await navigator.clipboard.writeText(announcement(tab)); copiedRound.value = tab; }
      catch { copiedRound.value = ''; }
    };
    watch(activeTab, () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    return { activeTab, announcement, copiedRound, copyAnnouncement, course, finishWizard, goWizard, modalOpen, newKind, nextSection, occurrenceTypes, preparation, prerequisiteGit, prerequisiteWeb, published, reopenWizard, rounds, sectionTabs, selectTab, stepCount, successorDeploy, successorTs, tabItems, wizardCompleted, wizardPosition, wizardSteps };
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
            <div class="breadcrumb"><span>運営向けページ</span><b>/</b><span>講習会を編集</span></div>
            <header class="page-header"><h1>講習会を編集</h1><span class="header-status"><span></span>公開中</span></header>
            <BasiqTabs :model-value="activeTab" @update:model-value="selectTab" class="section-tabs" :items="tabItems" aria-label="講習会の編集項目" list-width="100%">
              <template #trigger="{ item: triggerItem }"><span v-if="triggerItem.value === 'add'" class="add-tab-control"><AppIcon name="plus" :size="16" /><span class="add-tab-text">開催を追加</span></span><template v-else>{{ triggerItem.label }}</template></template>
              <template #content="{ item }">
                <div v-if="item.value !== 'add'" class="tab-content">
                  <section v-if="!wizardCompleted[item.value]" class="wizard-panel" :aria-label="item.label + 'のウィザード'">
                    <div class="wizard-progress">
                      <ol :aria-label="item.label + 'の進捗'" :style="{ gridTemplateColumns: 'repeat(' + stepCount(item.value) + ', minmax(0, 1fr))' }"><li v-for="(label, index) in wizardSteps[item.value]" :key="label" :class="{ current: index === wizardPosition[item.value], complete: index < wizardPosition[item.value] }"><span>{{ index < wizardPosition[item.value] ? '✓' : index + 1 }}</span><small>{{ label }}</small></li></ol>
                    </div>

                    <BasiqCard v-if="item.value === 'general' && wizardPosition.general === 0" class="wizard-card">
                      <template #header><div><p class="card-kicker">全般</p><h2>講習会の基本情報</h2></div></template>
                      <div class="wizard-content"><p class="step-lead">まず、講習会の名前と概要を入力します。</p><BasiqFormField label="講習会名" required><BasiqInput v-model="course.name" required /></BasiqFormField><BasiqFormField label="概要" required><BasiqTextarea v-model="course.description" :rows="4" required /></BasiqFormField></div>
                    </BasiqCard>
                    <BasiqCard v-else-if="item.value === 'general' && wizardPosition.general === 1" class="wizard-card">
                      <template #header><div><p class="card-kicker">全般</p><h2>対象とゴール</h2></div></template>
                      <div class="wizard-content"><p class="step-lead">誰に向けた講習会か、受講後に何ができるようになるかを決めます。</p><BasiqFormField label="対象者" required><BasiqInput v-model="course.target" required /></BasiqFormField><BasiqFormField label="受講後のゴール" required><BasiqTextarea v-model="course.goal" :rows="3" required /></BasiqFormField><div class="value-preview"><strong>{{ course.name }}</strong><span>対象：{{ course.target }}</span><span>ゴール：{{ course.goal }}</span></div></div>
                    </BasiqCard>
                    <BasiqCard v-else-if="item.value === 'general'" class="wizard-card">
                      <template #header><div><p class="card-kicker">全般</p><h2>関連する講習会</h2></div></template>
                      <div class="wizard-content"><p class="step-lead">学ぶ順番につながる講習会を選びます。</p><div class="connection-columns"><section><div class="connection-label"><h3>先に学ぶ</h3></div><label class="choice-row" :class="{ selected: prerequisiteGit }"><BasiqCheckbox v-model="prerequisiteGit" /><span><strong>Git入門</strong><small>変更履歴と共同作業の基本</small></span></label><label class="choice-row" :class="{ selected: prerequisiteWeb }"><BasiqCheckbox v-model="prerequisiteWeb" /><span><strong>Webシステム入門</strong><small>Webの全体像をつかむ</small></span></label></section><section><div class="connection-label"><h3>次に学ぶ</h3></div><label class="choice-row" :class="{ selected: successorTs }"><BasiqCheckbox v-model="successorTs" /><span><strong>TypeScript入門</strong><small>型を使ったフロントエンド開発</small></span></label><label class="choice-row" :class="{ selected: successorDeploy }"><BasiqCheckbox v-model="successorDeploy" /><span><strong>Webサービス公開入門</strong><small>作ったサービスを公開する</small></span></label></section></div></div>
                    </BasiqCard>

                    <template v-else-if="item.value === 'round1' || item.value === 'round2'">
                      <BasiqCard v-if="wizardPosition[item.value] === 0" class="wizard-card">
                        <template #header><div><p class="card-kicker">{{ item.label }}</p><h2>開催内容</h2></div></template>
                        <div class="wizard-content"><p class="step-lead">この回で扱う内容を入力します。</p><div class="field-grid"><BasiqFormField label="回のタイトル" required><BasiqInput v-model="rounds[item.value].title" required /></BasiqFormField><BasiqFormField label="回番号"><BasiqInput v-model="rounds[item.value].number" inputmode="numeric" /></BasiqFormField><BasiqRadioGroup class="field-wide" v-model="rounds[item.value].kind" label="開催種別" :items="occurrenceTypes" orientation="horizontal" /><BasiqFormField class="field-wide" label="この回で学べること" required><BasiqTextarea v-model="rounds[item.value].learning" :rows="4" required /></BasiqFormField></div></div>
                      </BasiqCard>
                      <BasiqCard v-else-if="wizardPosition[item.value] === 1" class="wizard-card">
                        <template #header><div><p class="card-kicker">{{ item.label }}</p><h2>開催準備</h2></div></template>
                        <div class="wizard-content"><p class="step-lead">日時と対象者を決め、必要な準備を確認します。</p><div class="field-grid"><BasiqFormField label="日時"><BasiqInput v-model="rounds[item.value].datetime" /></BasiqFormField><BasiqFormField label="場所"><BasiqInput v-model="rounds[item.value].location" /></BasiqFormField><BasiqFormField label="開催する組織・班" required><BasiqInput v-model="rounds[item.value].group" required /></BasiqFormField><BasiqFormField label="対象者" required><BasiqInput v-model="rounds[item.value].target" required /></BasiqFormField></div><section class="task-list"><h3>準備チェック</h3><label><BasiqCheckbox v-model="preparation[item.value].knoq" /><span :class="{ done: preparation[item.value].knoq }">knoQに開催ページを作成する</span></label><label><BasiqCheckbox v-model="preparation[item.value].office" /><span :class="{ done: preparation[item.value].office }">庶務連絡を投稿する</span></label><label><BasiqCheckbox v-model="preparation[item.value].ta" /><span :class="{ done: preparation[item.value].ta }">TA募集を投稿する</span></label></section></div>
                      </BasiqCard>
                      <BasiqCard v-else class="wizard-card">
                        <template #header><div><p class="card-kicker">{{ item.label }}</p><h2>公開と教材</h2></div></template>
                        <div class="wizard-content"><div class="publish-control"><BasiqSwitch v-model="published[item.value]">学習者に公開する</BasiqSwitch><p>公開すると検索と講習会詳細に表示されます。</p></div><div class="field-grid"><BasiqFormField class="field-wide" label="教材URL"><BasiqInput v-model="rounds[item.value].materialUrl" type="url" placeholder="https://" /></BasiqFormField><BasiqFormField class="field-wide" label="教材の説明文"><BasiqInput v-model="rounds[item.value].materialDescription" /></BasiqFormField></div><section class="copy-block"><div><h3>告知文</h3><BasiqButton tone="neutral" variant="outline" type="button" @click="copyAnnouncement(item.value)"><AppIcon name="copy" :size="16" />{{ copiedRound === item.value ? 'コピーしました' : 'コピー' }}</BasiqButton></div><pre>{{ announcement(item.value) }}</pre></section></div>
                      </BasiqCard>
                    </template>

                    <BasiqCard v-else-if="item.value === 'settings' && wizardPosition.settings === 0" class="wizard-card">
                      <template #header><div><p class="card-kicker">設定</p><h2>開催の管理</h2></div></template>
                      <div class="wizard-content"><p class="step-lead">登録済みの開催と公開状態を確認します。</p><div class="round-list"><div><span class="round-number">第1回</span><div><strong>{{ rounds.round1.title }}</strong><small>{{ published.round1 ? '公開中' : '下書き' }}</small></div></div><div><span class="round-number muted">第2回</span><div><strong>{{ rounds.round2.title }}</strong><small>{{ published.round2 ? '公開中' : '下書き' }}</small></div></div></div></div>
                    </BasiqCard>
                    <BasiqCard v-else class="wizard-card">
                      <template #header><div><p class="card-kicker">設定</p><h2>削除の設定</h2></div></template>
                      <div class="wizard-content"><p class="step-lead">講習会全体を削除する操作です。必要な場合だけ実行します。</p><div class="danger-zone"><div><strong>講習会を削除</strong><p>開催・完了記録・ロードマップ上の配置も削除されます。</p></div><BasiqButton tone="danger" variant="outline" type="button"><AppIcon name="trash" :size="17" />講習会を削除</BasiqButton></div></div>
                    </BasiqCard>

                    <nav class="wizard-navigation" :aria-label="item.label + 'のステップ移動'"><BasiqButton tone="neutral" variant="outline" type="button" :disabled="wizardPosition[item.value] === 0" @click="goWizard(item.value, -1)">前へ</BasiqButton><BasiqButton v-if="wizardPosition[item.value] < stepCount(item.value) - 1" type="button" @click="goWizard(item.value, 1)">次へ</BasiqButton><BasiqButton v-else type="button" @click="finishWizard(item.value)">保存する</BasiqButton></nav>
                  </section>
                  <section v-else class="wizard-complete" aria-live="polite"><BasiqCard class="wizard-card"><template #header><div><p class="completion-mark">✓</p><h2>{{ item.label }}を保存しました</h2></div></template><p>このタブの入力内容を保存しました。</p><template #footer><div class="completion-actions"><BasiqButton tone="neutral" variant="outline" type="button" @click="reopenWizard(item.value)">内容に戻る</BasiqButton><BasiqButton v-if="item.value !== 'settings'" type="button" @click="nextSection(item.value)">次のタブへ</BasiqButton></div></template></BasiqCard></section>
                </div>
              </template>
            </BasiqTabs>
          </main>
        </div>
        <nav class="mobile-nav" aria-label="モバイルナビゲーション"><a href="#"><AppIcon name="home" />ホーム</a><a href="#"><AppIcon name="map" />ロードマップ</a><a href="#"><AppIcon name="user" />プロフィール</a><a class="active" href="#" aria-current="page"><AppIcon name="edit" />運営</a></nav>
        <div v-if="modalOpen" class="modal-backdrop" @click.self="modalOpen = false"><BasiqCard class="add-modal" role="dialog" aria-modal="true" aria-labelledby="add-modal-title"><template #header><div class="modal-heading"><h2 id="add-modal-title">開催を追加</h2><BasiqButton tone="neutral" variant="outline" type="button" @click="modalOpen = false">閉じる</BasiqButton></div></template><div class="modal-fields"><BasiqFormField label="回番号"><BasiqInput model-value="3" inputmode="numeric" /></BasiqFormField><BasiqFormField label="回のタイトル" required><BasiqInput placeholder="例：JavaScriptの基本" required /></BasiqFormField><BasiqRadioGroup v-model="newKind" label="開催種別" :items="occurrenceTypes" /></div><div class="modal-actions"><BasiqButton tone="neutral" variant="outline" type="button" @click="modalOpen = false">キャンセル</BasiqButton><BasiqButton type="button" @click="modalOpen = false">追加</BasiqButton></div></BasiqCard></div>
      </div>
    </BasiqThemeProvider>`,
});

createApp(WorkshopEditorPrototype).mount('#app');
