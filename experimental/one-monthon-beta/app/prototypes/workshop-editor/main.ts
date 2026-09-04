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
import { computed, createApp, defineComponent, reactive, ref, watch } from 'vue/dist/vue.esm-bundler.js';

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

const sectionTabs = [
  { label: '全般', value: 'general' },
  { label: '第1回', value: 'round1' },
  { label: '第2回', value: 'round2' },
  { label: '設定', value: 'settings' },
];

const tabItems = [sectionTabs[0], sectionTabs[1], sectionTabs[2], { label: '開催を追加', value: 'add' }, sectionTabs[3]];

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
    const activeTab = ref('general');
    const modalOpen = ref(false);
    const published = reactive({ round1: true, round2: false });
    const kinds = reactive({ round1: 'standard', round2: 'standard' });
    const newKind = ref('standard');
    const prerequisiteGit = ref(true);
    const prerequisiteWeb = ref(false);
    const successorTs = ref(true);
    const successorDeploy = ref(false);
    const tabIndex = computed(() => sectionTabs.findIndex((tab) => tab.value === activeTab.value));
    const goToTab = (index: number) => {
      activeTab.value = sectionTabs[Math.min(sectionTabs.length - 1, Math.max(0, index))].value;
    };
    const selectTab = (value: string) => {
      if (value === 'add') {
        modalOpen.value = true;
        return;
      }
      activeTab.value = value;
    };
    watch(activeTab, () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    return {
      activeTab,
      modalOpen,
      published,
      kinds,
      newKind,
      prerequisiteGit,
      prerequisiteWeb,
      successorTs,
      successorDeploy,
      tabIndex,
      sectionTabs,
      tabItems,
      occurrenceTypes,
      goToTab,
      selectTab,
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
            <div class="breadcrumb"><span>運営向けページ</span><b>/</b><span>講習会を編集</span></div>
            <header class="page-header"><h1>講習会を編集</h1><span class="header-status"><span></span>公開中</span></header>

            <BasiqTabs :model-value="activeTab" @update:model-value="selectTab" class="section-tabs" :items="tabItems" aria-label="講習会の編集項目" list-width="100%">
              <template #trigger="{ item: triggerItem }"><span v-if="triggerItem.value === 'add'" class="add-tab-control"><AppIcon name="plus" :size="16" /><span class="add-tab-text">開催を追加</span></span><template v-else>{{ triggerItem.label }}</template></template>
              <template #content="{ item }">
                <div class="tab-content">
                  <section v-if="item.value === 'general'" class="tab-panel general-panel">
                    <BasiqCard class="section-card">
                      <template #header><div class="card-heading"><span class="section-icon">全</span><h2>講習会名と概要</h2></div></template>
                      <div class="field-grid">
                        <BasiqFormField class="field-wide" label="講習会名" required description="シリーズの場合は、シリーズ全体の名前を書きます。"><BasiqInput model-value="Webフロントエンド入門" required /></BasiqFormField>
                        <BasiqFormField class="field-wide" label="概要" required description="どんな人に、何を学んでもらう講習会かを短くまとめます。"><BasiqTextarea model-value="HTML・CSS・JavaScriptの基本を、手を動かしながら学ぶ全3回の講習会です。" :rows="4" required /></BasiqFormField>
                      </div>
                    </BasiqCard>

                    <BasiqCard class="section-card connections-card">
                      <template #header><div class="card-heading"><span class="section-icon"><AppIcon name="map" :size="18" /></span><h2>関連する講習会</h2></div></template>
                      <div class="connection-columns">
                        <section><div class="connection-label"><h3>先に学ぶ</h3><span>1件選択</span></div><label class="choice-row selected"><BasiqCheckbox v-model="prerequisiteGit" /><span><strong>Git入門</strong><small>変更履歴と共同作業の基本</small></span></label><label class="choice-row"><BasiqCheckbox v-model="prerequisiteWeb" /><span><strong>Webシステム入門</strong><small>Webの全体像をつかむ</small></span></label></section>
                        <section><div class="connection-label"><h3>次に学ぶ</h3><span>1件選択</span></div><label class="choice-row selected"><BasiqCheckbox v-model="successorTs" /><span><strong>TypeScript入門</strong><small>型を使ったフロントエンド開発</small></span></label><label class="choice-row"><BasiqCheckbox v-model="successorDeploy" /><span><strong>Webサービス公開入門</strong><small>作ったサービスを公開する</small></span></label></section>
                      </div>
                    </BasiqCard>
                  </section>

                  <section v-else-if="item.value === 'round1' || item.value === 'round2'" class="tab-panel round-panel">
                    <div class="round-heading">
                      <div><span class="occurrence-index">{{ item.label }}</span><div><h2>{{ item.value === 'round1' ? 'Webページの仕組みとHTML' : 'CSSレイアウトの基本' }}</h2><p>{{ published[item.value] ? '公開中' : '下書き' }}</p></div></div>
                      <div class="card-actions"><BasiqButton tone="neutral" variant="outline" type="button"><AppIcon name="copy" :size="17" />複製</BasiqButton><BasiqButton tone="danger" variant="outline" type="button" :aria-label="item.label + 'を削除'"><AppIcon name="trash" :size="17" /></BasiqButton></div>
                    </div>

                    <BasiqCard class="occurrence-card">
                      <template #header><h2>開催内容</h2></template>
                      <div class="field-grid">
                        <BasiqFormField label="回のタイトル" required><BasiqInput :model-value="item.value === 'round1' ? 'Webページの仕組みとHTML' : 'CSSレイアウトの基本'" required /></BasiqFormField>
                        <BasiqFormField label="回番号"><BasiqInput :model-value="item.value === 'round1' ? '1' : '2'" inputmode="numeric" /></BasiqFormField>
                        <BasiqRadioGroup class="field-wide" :model-value="kinds[item.value]" @update:model-value="kinds[item.value] = $event" label="開催種別" :items="occurrenceTypes" orientation="horizontal" />
                        <BasiqFormField class="field-wide" label="この回で学べること" required><BasiqTextarea :model-value="item.value === 'round1' ? 'ブラウザがWebページを表示する仕組みと、意味のあるHTMLの書き方を学びます。' : 'FlexboxとGridを使い、画面幅に合わせたレイアウトを作ります。'" :rows="3" required /></BasiqFormField>
                        <BasiqFormField label="日時"><BasiqInput :model-value="item.value === 'round1' ? '2026-09-18 18:00' : '2026-09-25 18:00'" /></BasiqFormField>
                        <BasiqFormField label="場所"><BasiqInput model-value="部室" /></BasiqFormField>
                        <BasiqFormField label="開催する組織・班" required><BasiqInput model-value="Webエンジニア班" required /></BasiqFormField>
                        <BasiqFormField label="対象者" required><BasiqInput :model-value="item.value === 'round1' ? 'プログラミング初学者' : '第1回を終えた人'" required /></BasiqFormField>
                      </div>
                    </BasiqCard>

                    <div class="round-subgrid">
                      <BasiqCard class="section-card publish-card">
                        <template #header><h2>公開状態</h2></template>
                        <div class="publish-control"><BasiqSwitch :model-value="published[item.value]" @update:model-value="published[item.value] = $event">学習者に公開する</BasiqSwitch><p>公開すると検索と講習会詳細に表示されます。</p></div>
                      </BasiqCard>
                      <BasiqCard class="section-card materials-card">
                        <template #header><div class="card-heading"><span class="section-icon"><AppIcon name="book" :size="18" /></span><h2>教材</h2></div></template>
                        <div class="field-grid"><BasiqFormField class="field-wide" label="教材URL"><BasiqInput type="url" :model-value="item.value === 'round1' ? 'https://example.com/web-basics/01' : ''" placeholder="https://" /></BasiqFormField><BasiqFormField class="field-wide" label="教材の説明文"><BasiqInput :model-value="item.value === 'round1' ? 'スライドと演習問題' : ''" /></BasiqFormField></div>
                      </BasiqCard>
                    </div>
                  </section>

                  <section v-else class="tab-panel settings-panel">
                    <BasiqCard class="section-card">
                      <template #header><div class="settings-heading"><h2>開催</h2></div></template>
                      <div class="round-list"><div><span class="round-number">第1回</span><div><strong>Webページの仕組みとHTML</strong><small>公開中</small></div></div><div><span class="round-number muted">第2回</span><div><strong>CSSレイアウトの基本</strong><small>下書き</small></div></div></div>
                    </BasiqCard>
                    <div class="danger-zone"><div><strong>講習会を削除</strong><p>開催・完了記録・ロードマップ上の配置も削除されます。</p></div><BasiqButton tone="danger" variant="outline" type="button"><AppIcon name="trash" :size="17" />講習会を削除</BasiqButton></div>
                  </section>

                  <footer class="tab-actions"><BasiqButton v-if="tabIndex > 0" tone="neutral" variant="outline" type="button" @click="goToTab(tabIndex - 1)">戻る</BasiqButton><BasiqButton v-if="tabIndex < sectionTabs.length - 1" type="button" @click="goToTab(tabIndex + 1)">次へ：{{ sectionTabs[tabIndex + 1].label }}</BasiqButton><BasiqButton v-else type="button">変更を保存</BasiqButton></footer>
                </div>
              </template>
            </BasiqTabs>
          </main>
        </div>

        <nav class="mobile-nav" aria-label="モバイルナビゲーション"><a href="#"><AppIcon name="home" />ホーム</a><a href="#"><AppIcon name="map" />ロードマップ</a><a href="#"><AppIcon name="user" />プロフィール</a><a class="active" href="#" aria-current="page"><AppIcon name="edit" />運営</a></nav>

        <div v-if="modalOpen" class="modal-backdrop" @click.self="modalOpen = false">
          <BasiqCard class="add-modal" role="dialog" aria-modal="true" aria-labelledby="add-modal-title">
            <template #header><div class="modal-heading"><h2 id="add-modal-title">開催を追加</h2><BasiqButton tone="neutral" variant="outline" type="button" @click="modalOpen = false">閉じる</BasiqButton></div></template>
            <div class="modal-fields">
              <BasiqFormField label="回番号"><BasiqInput model-value="3" inputmode="numeric" /></BasiqFormField>
              <BasiqFormField label="回のタイトル" required><BasiqInput placeholder="例：JavaScriptの基本" required /></BasiqFormField>
              <BasiqRadioGroup v-model="newKind" label="開催種別" :items="occurrenceTypes" />
            </div>
            <div class="modal-actions"><BasiqButton tone="neutral" variant="outline" type="button" @click="modalOpen = false">キャンセル</BasiqButton><BasiqButton type="button" @click="modalOpen = false">追加</BasiqButton></div>
          </BasiqCard>
        </div>
      </div>
    </BasiqThemeProvider>`,
});

createApp(WorkshopEditorPrototype).mount('#app');
