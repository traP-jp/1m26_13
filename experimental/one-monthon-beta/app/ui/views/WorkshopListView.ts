import { BasiqButton, BasiqCard } from 'basiq-ui';
import { computed, defineComponent, onBeforeUnmount, onMounted, ref } from 'vue/dist/vue.esm-bundler.js';
import type { DiscoveryResponse } from '../../lib/contracts';
import AppIcon from '../components/AppIcon';
import WorkshopSummaryCard from '../components/WorkshopSummaryCard';
import { ApiClientError, fetchDiscovery } from '../api';

type DiscoveryView = 'conditions' | 'roadmaps';
const empty: DiscoveryResponse = { workshops: [], roadmaps: [], teams: [], years: [] };

export default defineComponent({
  name: 'WorkshopListView',
  components: { AppIcon, BasiqButton, BasiqCard, WorkshopSummaryCard },
  setup() {
    const view = ref<DiscoveryView>('conditions');
    const query = ref('');
    const team = ref('');
    const year = ref('');
    const data = ref<DiscoveryResponse>(empty);
    const loading = ref(true);
    const error = ref('');
    const selectedRoadmapId = ref<number | null>(null);
    const filterOpen = ref(window.innerWidth > 760);
    const selectedRoadmap = computed(() => data.value.roadmaps.find((item) => item.id === selectedRoadmapId.value) ?? data.value.roadmaps[0] ?? null);
    const isRoadmapComplete = (roadmap?: DiscoveryResponse['roadmaps'][number] | null) => Boolean(roadmap && roadmap.workshopCount > 0 && roadmap.completedCount === roadmap.workshopCount);
    const completedCardStyle = computed(() => isRoadmapComplete(selectedRoadmap.value) ? { '--basiq-color-card-background': 'var(--app-success-soft)' } : undefined);

    const syncUrl = () => {
      const params = new URLSearchParams();
      if (view.value === 'roadmaps') params.set('view', 'roadmaps');
      if (query.value.trim()) params.set('q', query.value.trim());
      if (view.value === 'conditions' && team.value) params.set('team', team.value);
      if (view.value === 'conditions' && year.value) params.set('year', year.value);
      history.replaceState({}, '', `/workshops${params.size ? `?${params}` : ''}`);
      window.dispatchEvent(new CustomEvent('one-monthon:location-change'));
    };
    const search = async (sync = true) => {
      loading.value = true;
      error.value = '';
      if (sync) syncUrl();
      try {
        const result = await fetchDiscovery(query.value, view.value === 'conditions' ? team.value : '', view.value === 'conditions' ? year.value : '');
        data.value = {
          ...result,
          teams: result.teams.length ? result.teams : data.value.teams,
          years: result.years.length ? result.years : data.value.years,
        };
        if (!result.roadmaps.some((item) => item.id === selectedRoadmapId.value)) selectedRoadmapId.value = result.roadmaps[0]?.id ?? null;
      } catch (caught) {
        error.value = caught instanceof ApiClientError ? caught.message : '検索結果を読み込めませんでした。';
      } finally {
        loading.value = false;
      }
    };
    const reset = () => {
      query.value = '';
      team.value = '';
      year.value = '';
      void search();
    };
    const setView = (next: DiscoveryView) => {
      if (view.value === next) return;
      view.value = next;
      void search();
    };
    const fromLocation = () => {
      const params = new URLSearchParams(location.search);
      view.value = params.get('view') === 'roadmaps' ? 'roadmaps' : 'conditions';
      query.value = params.get('q') ?? '';
      team.value = params.get('team') ?? '';
      year.value = params.get('year') ?? '';
      void search(false);
    };
    const syncFilterDisclosure = (event: Event) => {
      filterOpen.value = (event.currentTarget as HTMLDetailsElement).open;
    };
    onMounted(() => {
      addEventListener('one-monthon:navigate', fromLocation);
      fromLocation();
    });
    onBeforeUnmount(() => removeEventListener('one-monthon:navigate', fromLocation));
    return {
      view,
      query,
      team,
      year,
      data,
      loading,
      error,
      selectedRoadmapId,
      selectedRoadmap,
      isRoadmapComplete,
      completedCardStyle,
      filterOpen,
      search,
      reset,
      setView,
      syncFilterDisclosure,
    };
  },
  template: `
    <main class="page discovery-page" tabindex="-1">
      <header class="page-heading compact-heading">
        <div><h1>{{ view === 'roadmaps' ? 'ロードマップ' : '講習会を探す' }}</h1><p>{{ view === 'roadmaps' ? '目的に沿った順番で講習会を確認します。' : '過去の教材を名前、班、年度から絞り込みます。' }}</p></div>
      </header>

      <section v-if="view === 'conditions'" class="discovery-layout">
        <details class="filter-disclosure" :open="filterOpen" @toggle="syncFilterDisclosure">
          <summary><AppIcon name="search" :size="18" />絞り込み <span v-if="query || team || year">条件あり</span></summary>
          <BasiqCard class="discovery-filter">
            <form class="filter-form" aria-label="講習会を絞り込む" @submit.prevent="search()">
              <label class="field"><span>キーワード</span><input v-model="query" type="search" placeholder="講習会名・概要" /></label>
              <label class="field"><span>班</span><select v-model="team"><option value="">すべて</option><option v-for="item in data.teams" :key="item" :value="item">{{ item }}</option></select></label>
              <label class="field"><span>年度</span><select v-model="year"><option value="">すべて</option><option v-for="item in data.years" :key="item" :value="String(item)">{{ item }}年度</option></select></label>
              <div class="filter-actions"><button v-if="query || team || year" type="button" class="text-button" @click="reset">クリア</button><BasiqButton type="submit" :disabled="loading">{{ loading ? '検索中…' : 'この条件で検索' }}</BasiqButton></div>
            </form>
          </BasiqCard>
        </details>

        <div class="discovery-results">
          <div class="results-heading"><div><h2>講習会</h2><p>公開済みの講習会と教材</p></div><strong aria-live="polite">{{ loading ? '—' : data.workshops.length }}件</strong></div>
          <div v-if="error" class="feedback feedback-error" role="alert"><div><strong>読み込めませんでした</strong><p>{{ error }}</p></div><BasiqButton tone="neutral" variant="outline" @click="search(false)">再試行</BasiqButton></div>
          <div v-else-if="loading" class="feedback" role="status">検索結果を読み込んでいます。</div>
          <div v-else-if="!data.workshops.length" class="empty-state"><h3>該当する講習会はありません</h3><p>キーワードや絞り込み条件を減らして再検索してください。</p><div class="empty-actions"><BasiqButton tone="neutral" variant="outline" @click="reset">条件をクリア</BasiqButton></div></div>
          <ul v-else class="workshop-card-grid">
            <li v-for="workshop in data.workshops" :key="workshop.id"><WorkshopSummaryCard :workshop="workshop" /></li>
          </ul>
        </div>
      </section>

      <section v-else class="roadmap-catalog">
        <form class="catalog-search" @submit.prevent="search()"><label><span class="visually-hidden">ロードマップを検索</span><AppIcon name="search" :size="19" /><input v-model="query" type="search" placeholder="ロードマップ名・対象者" /></label><BasiqButton type="submit" :disabled="loading">検索</BasiqButton></form>
        <div v-if="error" class="feedback feedback-error" role="alert"><div><strong>読み込めませんでした</strong><p>{{ error }}</p></div><BasiqButton tone="neutral" variant="outline" @click="search(false)">再試行</BasiqButton></div>
        <div v-else-if="loading" class="feedback" role="status">ロードマップを読み込んでいます。</div>
        <div v-else-if="!data.roadmaps.length" class="empty-state"><h3>該当するロードマップはありません</h3><p>キーワードを短くするか、講習会を条件から探してください。</p><div class="empty-actions"><BasiqButton tone="neutral" variant="outline" @click="reset">検索をクリア</BasiqButton><button type="button" class="link-button" @click="setView('conditions')">条件から探す</button></div></div>
        <div v-else class="catalog-layout">
          <div class="catalog-list-wrap"><div class="results-heading"><div><h2>ロードマップ</h2><p>目的に沿って並べた講習会</p></div><strong>{{ data.roadmaps.length }}件</strong></div><ul class="roadmap-catalog-list"><li v-for="roadmap in data.roadmaps" :key="roadmap.id"><a :href="'/roadmaps/' + roadmap.id" data-route :class="{ 'is-selected': selectedRoadmap?.id === roadmap.id, 'is-completed': isRoadmapComplete(roadmap) }" @mouseenter="selectedRoadmapId = roadmap.id" @focus="selectedRoadmapId = roadmap.id"><span><strong>{{ roadmap.title }}</strong><small>{{ roadmap.summary }}</small><em>対象: {{ roadmap.audience }}</em></span><span class="catalog-progress">{{ roadmap.completedCount }}/{{ roadmap.workshopCount }}<small>完了</small></span><AppIcon name="chevron" :size="18" /></a></li></ul></div>
          <aside v-if="selectedRoadmap" class="catalog-preview" aria-label="選択したロードマップ"><BasiqCard :style="completedCardStyle"><div class="catalog-preview-body"><span class="eyebrow">ロードマップ</span><h2>{{ selectedRoadmap.title }}</h2><p>{{ selectedRoadmap.summary }}</p><dl><div><dt>対象</dt><dd>{{ selectedRoadmap.audience }}</dd></div><div><dt>講習会</dt><dd>{{ selectedRoadmap.workshopCount }}件</dd></div><div><dt>現在の進捗</dt><dd>{{ selectedRoadmap.completedCount }}/{{ selectedRoadmap.workshopCount }} 完了</dd></div></dl><a class="primary-link" :href="'/roadmaps/' + selectedRoadmap.id" data-route>ロードマップを見る<AppIcon name="chevron" :size="18" /></a></div></BasiqCard></aside>
        </div>
      </section>
    </main>`,
});
