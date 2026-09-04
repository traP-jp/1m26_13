import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-800.css';
import '@fontsource/m-plus-1p/400.css';
import '@fontsource/m-plus-1p/500.css';
import '@fontsource/m-plus-1p/700.css';
import '@fontsource/m-plus-1p/800.css';
import 'basiq-ui/styles.css';
import './styles.css';

import {
  BasiqButton,
  BasiqCard,
  BasiqFormField,
  BasiqInput,
  BasiqRadioGroup,
  BasiqSwitch,
  BasiqTextarea,
  BasiqThemeProvider,
} from 'basiq-ui';
import { createApp, defineComponent, ref } from 'vue';

type Workshop = {
  id: string;
  title: string;
  team: string;
  year: string;
};

type RoadmapItem = {
  id: number;
  workshopId: string;
  editing: boolean;
};

const workshops: Workshop[] = [
  { id: 'git', title: 'Git入門講習会', team: 'SysAd班', year: '2026年度' },
  { id: 'linux', title: 'Linux基礎講習会', team: 'SysAd班', year: '2026年度' },
  { id: 'html-css', title: 'HTML・CSS講習会', team: 'Webエンジニアリング班', year: '2026年度' },
  { id: 'javascript', title: 'JavaScript入門講習会', team: 'Webエンジニアリング班', year: '2026年度' },
  { id: 'typescript', title: 'TypeScript講習会', team: 'Webエンジニアリング班', year: '2026年度' },
  { id: 'vue', title: 'Vue.js講習会', team: 'Webエンジニアリング班', year: '2026年度' },
];

const Icon = defineComponent({
  props: { name: { type: String, required: true } },
  template: `
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <template v-if="name === 'home'"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></template>
      <template v-else-if="name === 'map'"><path d="m3 6 5-2 8 3 5-2v13l-5 2-8-3-5 2Z"/><path d="M8 4v13M16 7v13"/></template>
      <template v-else-if="name === 'user'"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></template>
      <template v-else-if="name === 'edit'"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></template>
      <template v-else-if="name === 'chevron'"><path d="m9 18 6-6-6-6"/></template>
      <template v-else-if="name === 'up'"><path d="m6 15 6-6 6 6"/></template>
      <template v-else-if="name === 'down'"><path d="m6 9 6 6 6-6"/></template>
      <template v-else-if="name === 'plus'"><path d="M12 5v14M5 12h14"/></template>
      <template v-else-if="name === 'trash'"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/></template>
      <template v-else><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></template>
    </svg>`,
});

const App = defineComponent({
  components: {
    BasiqButton,
    BasiqCard,
    BasiqFormField,
    BasiqInput,
    BasiqRadioGroup,
    BasiqSwitch,
    BasiqTextarea,
    BasiqThemeProvider,
    Icon,
  },
  setup() {
    const title = ref('Web開発の入口');
    const summary = ref('Webサービスづくりに必要な基礎を、道具の使い方から順に学べるロードマップです。');
    const audience = ref('Web開発をこれから始めたい新入生');
    const published = ref(true);
    const roadmapItems = ref<RoadmapItem[]>([
      { id: 1, workshopId: 'git', editing: false },
      { id: 2, workshopId: 'html-css', editing: false },
      { id: 3, workshopId: 'typescript', editing: false },
    ]);

    const getWorkshop = (id: string) => workshops.find((workshop) => workshop.id === id) ?? workshops[0];
    const workshopOptionsFor = (currentItem: RoadmapItem) => {
      const selectedElsewhere = new Set(roadmapItems.value.filter((item) => item.id !== currentItem.id).map((item) => item.workshopId));
      return workshops.map((workshop) => ({
        value: workshop.id,
        label: workshop.title,
        description: `${workshop.team} · ${workshop.year}`,
        disabled: selectedElsewhere.has(workshop.id),
      }));
    };
    const moveWorkshop = (index: number, offset: number) => {
      const targetIndex = index + offset;
      if (targetIndex < 0 || targetIndex >= roadmapItems.value.length) return;
      const nextItems = [...roadmapItems.value];
      [nextItems[index], nextItems[targetIndex]] = [nextItems[targetIndex], nextItems[index]];
      roadmapItems.value = nextItems;
    };
    const removeWorkshop = (id: number) => {
      if (roadmapItems.value.length === 1) return;
      roadmapItems.value = roadmapItems.value.filter((item) => item.id !== id);
    };
    const addWorkshop = () => {
      const selected = new Set(roadmapItems.value.map((item) => item.workshopId));
      const nextWorkshop = workshops.find((workshop) => !selected.has(workshop.id));
      if (!nextWorkshop) return;
      const nextId = Math.max(...roadmapItems.value.map((item) => item.id), 0) + 1;
      roadmapItems.value.push({ id: nextId, workshopId: nextWorkshop.id, editing: true });
    };

    return { addWorkshop, audience, getWorkshop, moveWorkshop, published, removeWorkshop, roadmapItems, summary, title, workshops, workshopOptionsFor };
  },
  template: `
    <BasiqThemeProvider mode="light" class="prototype-theme">
      <a class="skip-link" href="#main-content">本文へ移動</a>
      <div class="app-shell">
        <aside class="sidebar">
          <button class="brand" type="button" aria-label="1-Monthon ホーム">
            <span class="brand-mark">1M</span>
            <span><strong>1-Monthon</strong><small>講習会アーカイブ</small></span>
          </button>
          <nav class="navigation" aria-label="メインナビゲーション">
            <p>学ぶ</p>
            <button type="button"><Icon name="home" /><span>ホーム</span></button>
            <button type="button"><Icon name="map" /><span>ロードマップ</span></button>
            <button type="button"><Icon name="user" /><span>プロフィール</span></button>
          </nav>
          <div class="sidebar-admin">
            <p>運営</p>
            <button class="navigation-admin" type="button" aria-current="page"><Icon name="edit" /><span>運営向けページ</span></button>
          </div>
        </aside>

        <section class="workspace">
          <header class="mobile-header">
            <span class="brand-mark">1M</span><strong>1-Monthon</strong><span>運営</span>
          </header>
          <main id="main-content" class="page">
            <nav class="breadcrumb" aria-label="パンくずリスト">
              <button type="button">運営向けページ</button><Icon name="chevron" />
              <button type="button">ロードマップ管理</button><Icon name="chevron" />
              <span aria-current="page">編集</span>
            </nav>

            <header class="page-heading">
              <div>
                <h1>ロードマップを編集</h1>
                <p>ロードマップの内容と講習会の順番を編集します。</p>
              </div>
            </header>

            <form class="editor-form" @submit.prevent>
              <BasiqCard title="基本情報">
                <div class="basic-grid">
                  <BasiqFormField class="span-two" label="ロードマップ名" required>
                    <template #default="field"><BasiqInput v-model="title" :id="field.id" :invalid="field.invalid" :required="field.required" :aria-describedby="field.describedBy" maxlength="100" /></template>
                  </BasiqFormField>
                  <BasiqFormField class="span-two" label="概要" required>
                    <template #default="field"><BasiqTextarea v-model="summary" :id="field.id" :invalid="field.invalid" :required="field.required" :aria-describedby="field.describedBy" :rows="3" resize="vertical" maxlength="240" /></template>
                  </BasiqFormField>
                  <BasiqFormField label="対象者" required>
                    <template #default="field"><BasiqInput v-model="audience" :id="field.id" :invalid="field.invalid" :required="field.required" :aria-describedby="field.describedBy" placeholder="例：新入生" maxlength="100" /></template>
                  </BasiqFormField>
                  <div class="publication-field">
                    <strong>公開状態</strong>
                    <BasiqSwitch v-model="published" name="published"><span>{{ published ? '公開中' : '下書き' }}</span></BasiqSwitch>
                  </div>
                </div>
              </BasiqCard>

              <section class="sequence-section" aria-labelledby="sequence-title">
                <div class="section-heading">
                  <h2 id="sequence-title">講習会の順番</h2>
                  <BasiqButton type="button" tone="neutral" variant="outline" :disabled="roadmapItems.length === workshops.length" @click="addWorkshop"><Icon name="plus" />講習会を追加</BasiqButton>
                </div>

                <ol class="workshop-sequence">
                  <li v-for="(item, itemIndex) in roadmapItems" :key="item.id">
                    <BasiqCard>
                      <div class="sequence-item">
                        <span class="sequence-number">{{ itemIndex + 1 }}</span>
                        <Icon name="map" />
                        <span class="workshop-copy"><strong>{{ getWorkshop(item.workshopId).title }}</strong><small>{{ getWorkshop(item.workshopId).team }} · {{ getWorkshop(item.workshopId).year }}</small></span>
                        <div class="sequence-actions">
                          <BasiqButton type="button" tone="neutral" variant="outline" :disabled="itemIndex === 0" :aria-label="getWorkshop(item.workshopId).title + 'を上へ移動'" @click="moveWorkshop(itemIndex, -1)"><Icon name="up" /></BasiqButton>
                          <BasiqButton type="button" tone="neutral" variant="outline" :disabled="itemIndex === roadmapItems.length - 1" :aria-label="getWorkshop(item.workshopId).title + 'を下へ移動'" @click="moveWorkshop(itemIndex, 1)"><Icon name="down" /></BasiqButton>
                          <BasiqButton type="button" tone="neutral" variant="outline" @click="item.editing = !item.editing">{{ item.editing ? '閉じる' : '変更' }}</BasiqButton>
                          <BasiqButton type="button" tone="danger" variant="outline" :disabled="roadmapItems.length === 1" :aria-label="getWorkshop(item.workshopId).title + 'を削除'" @click="removeWorkshop(item.id)"><Icon name="trash" /></BasiqButton>
                        </div>
                      </div>
                      <div v-if="item.editing" class="workshop-picker">
                        <BasiqRadioGroup v-model="item.workshopId" :items="workshopOptionsFor(item)" :name="'roadmap-item-' + item.id" label="講習会を選択" orientation="vertical" required />
                      </div>
                    </BasiqCard>
                  </li>
                </ol>
              </section>

              <div class="action-bar">
                <BasiqButton type="button" tone="danger" variant="outline"><Icon name="trash" />ロードマップを削除</BasiqButton>
                <div class="action-bar-primary">
                  <BasiqButton type="button" tone="neutral" variant="outline">キャンセル</BasiqButton>
                  <BasiqButton type="submit">変更を保存</BasiqButton>
                </div>
              </div>
            </form>
          </main>
        </section>

        <nav class="mobile-navigation" aria-label="モバイルナビゲーション">
          <button type="button"><Icon name="home" /><span>ホーム</span></button>
          <button type="button"><Icon name="map" /><span>ロードマップ</span></button>
          <button type="button"><Icon name="user" /><span>プロフィール</span></button>
          <button type="button" aria-current="page"><Icon name="edit" /><span>運営</span></button>
        </nav>
      </div>
    </BasiqThemeProvider>`,
});

createApp(App).mount('#app');
