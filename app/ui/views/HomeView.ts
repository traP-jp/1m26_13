import { BasiqButton } from 'basiq-ui';
import { defineComponent, onMounted, ref } from 'vue/dist/vue.esm-bundler.js';
import type { DiscoveryResponse } from '../../lib/contracts';
import { ApiClientError, fetchDiscovery } from '../api';
import AppIcon from '../components/AppIcon';
import WorkshopSummaryCard from '../components/WorkshopSummaryCard';

const empty: DiscoveryResponse = { workshops: [], roadmaps: [], teams: [], years: [] };

export default defineComponent({
  name: 'HomeView',
  components: { AppIcon, BasiqButton, WorkshopSummaryCard },
  setup() {
    const data = ref<DiscoveryResponse>(empty);
    const query = ref('');
    const loading = ref(true);
    const error = ref('');
    const load = async () => {
      loading.value = true;
      error.value = '';
      try { data.value = await fetchDiscovery(); }
      catch (caught) { error.value = caught instanceof ApiClientError ? caught.message : 'ホームを読み込めませんでした。'; }
      finally { loading.value = false; }
    };
    const submitSearch = () => {
      const params = new URLSearchParams();
      if (query.value.trim()) params.set('q', query.value.trim());
      history.pushState({}, '', `/workshops${params.size ? `?${params}` : ''}`);
      window.dispatchEvent(new CustomEvent('one-monthon:location-change'));
      window.scrollTo(0, 0);
    };
    onMounted(load);
    return { data, query, loading, error, load, submitSearch };
  },
  template: `
    <main class="page home-page" tabindex="-1">
      <header class="page-heading compact-heading">
        <div><h1>ホーム</h1><p>公開された講習会と教材を見つけます。</p></div>
      </header>

      <form class="home-search" role="search" aria-label="講習会を検索" @submit.prevent="submitSearch">
        <label><span class="visually-hidden">講習会を検索</span><AppIcon name="search" :size="20" /><input v-model="query" type="search" placeholder="講習会名・概要から検索" /></label>
        <BasiqButton type="submit">検索</BasiqButton>
      </form>

      <section class="home-section" aria-labelledby="workshops-title">
        <div class="section-heading"><div><h2 id="workshops-title">講習会</h2><p>公開中の講習会をすべて表示しています。</p></div><span v-if="!loading && !error">{{ data.workshops.length }}件</span></div>
        <div v-if="loading" class="feedback" role="status">講習会を読み込んでいます。</div>
        <div v-else-if="error" class="feedback feedback-error" role="alert"><div><strong>読み込めませんでした</strong><p>{{ error }}</p></div><BasiqButton tone="neutral" variant="outline" type="button" @click="load">再試行</BasiqButton></div>
        <div v-else-if="!data.workshops.length" class="empty-inline">公開中の講習会はありません。</div>
        <ul v-else class="workshop-card-grid"><li v-for="workshop in data.workshops" :key="workshop.id"><WorkshopSummaryCard :workshop="workshop" /></li></ul>
      </section>
    </main>`,
});
