import { BasiqButton, BasiqCard } from 'basiq-ui';
import { computed, defineComponent, onMounted, ref } from 'vue/dist/vue.esm-bundler.js';
import type { DiscoveryResponse } from '../../lib/contracts';
import { ApiClientError, fetchDiscovery } from '../api';
import AppIcon from '../components/AppIcon';

const empty: DiscoveryResponse = { workshops: [], roadmaps: [], teams: [], years: [] };
const shortDate = new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' });

export default defineComponent({
  name: 'HomeView',
  components: { AppIcon, BasiqButton, BasiqCard },
  setup() {
    const data = ref<DiscoveryResponse>(empty);
    const loading = ref(true);
    const error = ref('');
    const recent = computed(() => data.value.workshops.slice(0, 4));
    const load = async () => {
      loading.value = true;
      error.value = '';
      try { data.value = await fetchDiscovery(); }
      catch (caught) { error.value = caught instanceof ApiClientError ? caught.message : 'ホームを読み込めませんでした。'; }
      finally { loading.value = false; }
    };
    onMounted(load);
    return { data, recent, loading, error, load, formatDate: (value: string | null) => value ? shortDate.format(new Date(value)) : '日程未定' };
  },
  template: `
    <main class="page home-page" tabindex="-1">
      <header class="page-heading compact-heading"><div><h1>ホーム</h1><p>講習会を探す、順番に学ぶ、運営情報を登録する。</p></div></header>

      <section class="home-discovery" aria-labelledby="home-discovery-title">
        <h2 id="home-discovery-title" class="visually-hidden">講習会の探し方</h2>
        <a class="home-entry home-entry-search" href="/workshops" data-route><span class="home-entry-icon"><AppIcon name="search" :size="28" /></span><span><strong>条件から探す</strong><small>名前、班、年度から絞り込む</small></span><AppIcon name="chevron" /></a>
        <a class="home-entry home-entry-map" href="/workshops?view=roadmaps" data-route><span class="home-entry-icon"><AppIcon name="map" :size="28" /></span><span><strong>ロードマップから探す</strong><small>目的に沿った順番で見つける</small></span><AppIcon name="chevron" /></a>
      </section>

      <section class="home-section" aria-labelledby="recent-title">
        <div class="section-heading"><h2 id="recent-title">最近公開された講習会</h2><a href="/workshops" data-route>すべて見る</a></div>
        <div v-if="loading" class="feedback" role="status">講習会を読み込んでいます。</div>
        <div v-else-if="error" class="feedback feedback-error" role="alert"><div><strong>読み込めませんでした</strong><p>{{ error }}</p></div><BasiqButton tone="neutral" variant="outline" type="button" @click="load">再試行</BasiqButton></div>
        <div v-else-if="!recent.length" class="empty-inline">公開中の講習会はありません。</div>
        <ul v-else class="home-workshop-list"><li v-for="workshop in recent" :key="workshop.id"><a :href="'/workshops/' + workshop.id" data-route><span class="resource-mark"><AppIcon name="book" /></span><span class="home-workshop-main"><strong>{{ workshop.title }}</strong><small>{{ workshop.summary }}</small></span><span>{{ workshop.teams.join(' / ') }}</span><span>{{ workshop.occurrenceCount === 1 ? '1回完結' : workshop.occurrenceCount + '開催' }}</span><time>{{ formatDate(workshop.latestScheduledAt) }}</time><AppIcon name="chevron" /></a></li></ul>
      </section>

      <section class="home-section" aria-labelledby="register-title">
        <div class="section-heading"><div><h2 id="register-title">講習会を登録</h2><p>進め方に合わせて入力方法を選びます。</p></div></div>
        <div class="home-register-grid">
          <BasiqCard><a class="register-entry" href="/admin/workshops/new" data-route><span class="home-entry-icon"><AppIcon name="wand" :size="26" /></span><span><strong>案内に沿って始める</strong><small>3段階で最初の開催まで登録</small></span><AppIcon name="chevron" /></a></BasiqCard>
          <BasiqCard><a class="register-entry" href="/admin/workshops/new?mode=form" data-route><span class="home-entry-icon"><AppIcon name="edit" :size="26" /></span><span><strong>入力フォームから始める</strong><small>必要な情報を一画面で直接入力</small></span><AppIcon name="chevron" /></a></BasiqCard>
        </div>
      </section>
    </main>`,
});
