import { BasiqButton, BasiqCard } from 'basiq-ui';
import { computed, defineComponent, ref, watch, type PropType } from 'vue/dist/vue.esm-bundler.js';
import type { RoadmapDetail } from '../../lib/contracts';
import { ApiClientError, fetchRoadmap } from '../api';

export default defineComponent({
  name: 'RoadmapDetailView',
  components: { BasiqButton, BasiqCard },
  props: { roadmapId: { type: String as PropType<string>, required: true } },
  setup(props) {
    const roadmap = ref<RoadmapDetail | null>(null);
    const loading = ref(true);
    const error = ref('');
    const shareOpen = ref(false);
    const shareCopied = ref(false);
    const shareError = ref('');

    const progressPercent = computed(() => {
      if (!roadmap.value?.workshopCount) return 0;
      return Math.round((roadmap.value.completedCount / roadmap.value.workshopCount) * 100);
    });
    const nextWorkshop = computed(() => {
      const current = roadmap.value;
      if (!current?.nextWorkshopId) return null;
      return current.stages.flatMap((stage) => stage.items).find((item) => item.workshopId === current.nextWorkshopId) ?? null;
    });
    const pathItems = computed(() => roadmap.value?.stages.flatMap((stage) => stage.items) ?? []);
    const shareMarkdown = computed(() => {
      if (!roadmap.value) return '';
      const lines = [`## ${roadmap.value.title}`, '', '学ぶ順序：'];
      roadmap.value.stages.forEach((stage, index) => {
        if (!stage.items.length) return;
        lines.push('', `### 段階${index + 1}`);
        for (const item of stage.items) lines.push(`- [${item.title}](${location.origin}/workshops/${item.workshopId})`);
      });
      return lines.join('\n');
    });

    const copyShareMarkdown = async () => {
      shareCopied.value = false;
      shareError.value = '';
      try {
        await navigator.clipboard.writeText(shareMarkdown.value);
        shareCopied.value = true;
      } catch {
        shareError.value = 'コピーできませんでした。テキストを選択してコピーしてください。';
      }
    };

    const load = async () => {
      loading.value = true;
      error.value = '';
      try {
        roadmap.value = await fetchRoadmap(props.roadmapId);
        document.title = `${roadmap.value.title} | 1-Monthon β`;
      } catch (caught) {
        error.value = caught instanceof ApiClientError ? caught.message : 'ロードマップを読み込めませんでした。';
      } finally {
        loading.value = false;
      }
    };

    watch(() => props.roadmapId, load, { immediate: true });
    return { roadmap, loading, error, load, nextWorkshop, pathItems, progressPercent, shareMarkdown, shareCopied, shareError, shareOpen, copyShareMarkdown };
  },
  template: `
    <main class="page roadmap-page" tabindex="-1">
      <a class="back-link" href="/workshops?view=roadmaps" data-route>ロードマップ一覧へ戻る</a>

      <div v-if="loading" class="feedback" role="status">ロードマップを読み込んでいます。</div>
      <div v-else-if="error" class="feedback feedback-error" role="alert">
        <div><strong>表示できませんでした</strong><p>{{ error }}</p></div>
        <BasiqButton tone="neutral" variant="outline" @click="load">再試行</BasiqButton>
      </div>

      <template v-else-if="roadmap">
        <header class="page-heading roadmap-heading">
          <div class="roadmap-heading-copy">
            <p class="eyebrow">学習ロードマップ</p>
            <h1>{{ roadmap.title }}</h1>
            <p>{{ roadmap.summary }}</p>
            <dl class="roadmap-heading-meta">
              <div><dt>対象</dt><dd>{{ roadmap.audience }}</dd></div>
              <div><dt>講習会</dt><dd>{{ roadmap.workshopCount }}件</dd></div>
            </dl>
          </div>
          <BasiqButton type="button" tone="neutral" variant="outline" aria-controls="roadmap-share-panel" :aria-expanded="shareOpen" @click="shareOpen = !shareOpen; shareCopied = false; shareError = ''">{{ shareOpen ? '共有画面を閉じる' : 'ロードマップを共有' }}</BasiqButton>
        </header>

        <section v-if="shareOpen" id="roadmap-share-panel" aria-label="共有用Markdown">
          <BasiqCard title="共有用Markdown">
            <label class="field"><span>部員向けの投稿へそのまま貼り付けられます</span><textarea :value="shareMarkdown" readonly rows="8" @focus="$event.currentTarget.select()"></textarea></label>
            <div class="form-actions"><BasiqButton type="button" :tone="shareCopied ? 'neutral' : 'accent'" :variant="shareCopied ? 'outline' : 'solid'" aria-live="polite" @click="copyShareMarkdown">{{ shareCopied ? 'コピーしました' : 'Markdownをコピー' }}</BasiqButton></div>
            <div v-if="shareError" class="feedback feedback-error" role="alert">{{ shareError }}</div>
          </BasiqCard>
        </section>

        <div class="roadmap-detail-layout">
          <section class="roadmap-path" aria-labelledby="roadmap-path-title">
            <div class="section-heading roadmap-path-heading">
              <div><h2 id="roadmap-path-title">学ぶ順序</h2><p>上から順に進めます。完了した講習会は記録と連動します。</p></div>
              <span>{{ roadmap.completedCount }}/{{ roadmap.workshopCount }} 完了</span>
            </div>

            <div v-if="!roadmap.stages.length" class="empty-state">
              <h3>講習会はまだ登録されていません</h3>
              <p>このロードマップに講習会が追加されると、ここに順番が表示されます。</p>
            </div>

            <ol v-else class="roadmap-path-list">
              <li
                v-for="item in pathItems"
                :key="item.workshopId"
                class="roadmap-path-item"
                :class="{ 'is-completed': item.completed, 'is-next': item.workshopId === roadmap.nextWorkshopId }"
              >
                <span class="roadmap-path-node" aria-hidden="true">{{ item.completed ? '✓' : '' }}</span>
                <a :href="'/workshops/' + item.workshopId" data-route>
                  <span class="roadmap-item-copy">
                    <span class="roadmap-item-status">{{ item.completed ? '完了' : item.workshopId === roadmap.nextWorkshopId ? '次に進む' : '未受講' }}</span>
                    <strong>{{ item.title }}</strong>
                  </span>
                  <span class="roadmap-item-link-copy">詳細を見る</span>
                </a>
              </li>
            </ol>
          </section>

          <aside class="roadmap-progress-rail" aria-label="ロードマップの進捗">
            <BasiqCard class="roadmap-progress-card">
              <template #header><h2>進捗</h2></template>
              <div class="roadmap-progress-summary">
                <div class="roadmap-progress-count"><strong>{{ progressPercent }}%</strong><span>{{ roadmap.completedCount }}/{{ roadmap.workshopCount }} 完了</span></div>
                <progress :value="roadmap.completedCount" :max="Math.max(roadmap.workshopCount, 1)">{{ progressPercent }}%</progress>
              </div>
            </BasiqCard>

            <BasiqCard v-if="nextWorkshop" class="roadmap-next-card">
              <template #header><h2>次に進む講習会</h2></template>
              <div class="roadmap-next-copy"><strong>{{ nextWorkshop.title }}</strong><p>{{ nextWorkshop.summary }}</p></div>
              <template #footer><a class="action-link" :href="'/workshops/' + nextWorkshop.workshopId" data-route>講習会の詳細を見る</a></template>
            </BasiqCard>

            <BasiqCard v-else class="roadmap-next-card">
              <template #header><h2>{{ roadmap.workshopCount ? 'ロードマップ完了' : '次の講習会' }}</h2></template>
              <p>{{ roadmap.workshopCount ? '登録された講習会をすべて完了しました。' : '講習会が追加されると、次に進む内容が表示されます。' }}</p>
            </BasiqCard>
          </aside>
        </div>
      </template>
    </main>`,
});
