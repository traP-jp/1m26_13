import { BasiqButton } from 'basiq-ui';
import { defineComponent, onMounted, ref } from 'vue/dist/vue.esm-bundler.js';
import type { RoadmapManage } from '../../lib/contracts';
import { ApiClientError, fetchManagedRoadmaps } from '../api';
import AppIcon from '../components/AppIcon';

export default defineComponent({
  name: 'AdminHomeView',
  components: { AppIcon, BasiqButton },
  emits: ['navigate'],
  setup() {
    const roadmaps = ref<RoadmapManage[]>([]); const loading = ref(true); const error = ref('');
    const load = async () => {
      loading.value = true; error.value = '';
      try { roadmaps.value = await fetchManagedRoadmaps(); }
      catch (caught) { error.value = caught instanceof ApiClientError ? caught.message : 'ロードマップを読み込めませんでした。'; }
      finally { loading.value = false; }
    };
    onMounted(load);
    return { roadmaps, loading, error, load };
  },
  template: `
    <main class="page admin-page" tabindex="-1">
      <header class="page-heading"><div><p class="eyebrow">運営</p><h1>運営向けページ</h1><p>講習会とロードマップの作成・編集をここから行います。</p></div></header>

      <section class="admin-section" aria-labelledby="admin-workshop-title">
        <div class="section-heading"><div><h2 id="admin-workshop-title">講習会</h2><p>案内に沿って、講習会と最初の開催を登録します。</p></div><BasiqButton type="button" @click="$emit('navigate', '/admin/workshops/new')">講習会を作成</BasiqButton></div>
      </section>

      <section class="admin-section" aria-labelledby="admin-roadmap-title">
        <div class="section-heading"><div><h2 id="admin-roadmap-title">ロードマップ</h2><p>閲覧用とは分けて、段階と講習会の並びを管理します。</p></div><a class="primary-link" href="/admin/roadmaps/new" data-route>新規作成<AppIcon name="chevron" :size="18" /></a></div>
        <div v-if="loading" class="feedback" role="status">ロードマップを読み込んでいます。</div>
        <div v-else-if="error" class="feedback feedback-error" role="alert"><div><strong>読み込めませんでした</strong><p>{{ error }}</p></div><BasiqButton tone="neutral" variant="outline" @click="load">再試行</BasiqButton></div>
        <div v-else-if="!roadmaps.length" class="empty-state"><h3>ロードマップはありません</h3><p>最初のロードマップを作成してください。</p></div>
        <ul v-else class="admin-roadmap-list">
          <li v-for="roadmap in roadmaps" :key="roadmap.id">
            <span><strong>{{ roadmap.title }}</strong><small>{{ roadmap.summary }}</small></span>
            <span class="status-label" :class="roadmap.published ? 'published' : 'draft'">{{ roadmap.published ? '公開中' : '下書き' }}</span>
            <span class="admin-row-actions"><a v-if="roadmap.published" :href="'/roadmaps/' + roadmap.id" data-route>閲覧</a><a :href="'/admin/roadmaps/' + roadmap.id" data-route>編集</a></span>
          </li>
        </ul>
      </section>
    </main>`,
});
