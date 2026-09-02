import { BasiqButton, BasiqCard, BasiqToggleButton } from 'basiq-ui';
import { computed, defineComponent, ref, watch, type PropType } from 'vue/dist/vue.esm-bundler.js';
import type { RoadmapInput, RoadmapInputStage, WorkshopSummary } from '../../lib/contracts';
import { ApiClientError, fetchDiscovery, fetchManagedRoadmap, removeRoadmap, saveRoadmap } from '../api';

const blankStage = (): RoadmapInputStage => ({ items: [] });

export default defineComponent({
  name: 'RoadmapEditorView',
  components: { BasiqButton, BasiqCard, BasiqToggleButton },
  props: {
    editorMode: { type: String as PropType<'new' | 'edit'>, required: true },
    roadmapId: { type: String, default: '' },
  },
  emits: ['navigate'],
  setup(props, { emit }) {
    const form = ref<RoadmapInput>({ title: '', summary: '', audience: '', published: false, stages: [blankStage()] });
    const workshops = ref<WorkshopSummary[]>([]); const loading = ref(true); const saving = ref(false); const deleting = ref(false); const error = ref(''); const fields = ref<Record<string, string>>({});
    const isEdit = computed(() => props.editorMode === 'edit');
    const load = async () => {
      loading.value = true; error.value = '';
      try {
        const discovery = await fetchDiscovery(); workshops.value = discovery.workshops;
        if (isEdit.value) {
          const roadmap = await fetchManagedRoadmap(props.roadmapId);
          form.value = { title: roadmap.title, summary: roadmap.summary, audience: roadmap.audience, published: roadmap.published, stages: roadmap.stages.map((stage) => ({ items: stage.items.map((item) => ({ ...item })) })) };
        } else form.value = { title: '', summary: '', audience: '', published: false, stages: [blankStage()] };
      } catch (caught) { error.value = caught instanceof ApiClientError ? caught.message : 'ロードマップを読み込めませんでした。'; }
      finally { loading.value = false; }
    };
    const selected = (stage: RoadmapInputStage, workshopId: number) => stage.items.some((item) => item.workshopId === workshopId);
    const toggleWorkshop = (stage: RoadmapInputStage, workshopId: number, checked: boolean) => {
      if (checked && !selected(stage, workshopId)) stage.items.push({ workshopId, note: '' });
      if (!checked) stage.items = stage.items.filter((item) => item.workshopId !== workshopId);
    };
    const onWorkshopChange = (stage: RoadmapInputStage, workshopId: number, event: Event) => toggleWorkshop(stage, workshopId, (event.currentTarget as HTMLInputElement).checked);
    const addStage = () => form.value.stages.push(blankStage());
    const removeStage = (index: number) => { if (form.value.stages.length > 1) form.value.stages.splice(index, 1); };
    const submit = async () => {
      saving.value = true; error.value = ''; fields.value = {};
      try { const roadmap = await saveRoadmap(form.value, isEdit.value ? props.roadmapId : undefined); emit('navigate', `/admin/roadmaps/${roadmap.id}`); }
      catch (caught) {
        if (caught instanceof ApiClientError) { error.value = caught.message; fields.value = caught.fields; }
        else error.value = '保存できませんでした。';
      } finally { saving.value = false; }
    };
    const destroy = async () => {
      if (!isEdit.value || !confirm('このロードマップを削除しますか？この操作は元に戻せません。')) return;
      deleting.value = true; error.value = '';
      try { await removeRoadmap(props.roadmapId); emit('navigate', '/admin'); }
      catch (caught) { error.value = caught instanceof ApiClientError ? caught.message : '削除できませんでした。'; }
      finally { deleting.value = false; }
    };
    watch(() => [props.editorMode, props.roadmapId], load, { immediate: true });
    return { addStage, deleting, destroy, error, fields, form, isEdit, loading, onWorkshopChange, removeStage, saving, selected, submit, workshops };
  },
  template: `
    <main class="page roadmap-editor-page" tabindex="-1">
      <a class="back-link" href="/admin" data-route>運営向けページへ戻る</a>
      <header class="page-heading"><div><p class="eyebrow">ロードマップ管理</p><h1>{{ isEdit ? 'ロードマップを編集' : 'ロードマップを作成' }}</h1><p>閲覧ページに表示する講習会と順番を設定します。</p></div></header>
      <div v-if="loading" class="feedback" role="status">ロードマップを読み込んでいます。</div>
      <div v-else-if="error && !form.title && isEdit" class="feedback feedback-error" role="alert"><div><strong>表示できませんでした</strong><p>{{ error }}</p></div></div>
      <form v-else class="roadmap-editor-form" @submit.prevent="submit">
        <div v-if="error" class="feedback feedback-error" role="alert"><div><strong>保存できませんでした</strong><p>{{ error }}</p></div></div>
        <BasiqCard title="基本情報">
          <div class="form-grid two-columns">
            <label class="field span-2"><span>ロードマップ名 <em>必須</em></span><input v-model="form.title" required maxlength="100" :aria-invalid="Boolean(fields.title)" /><small v-if="fields.title" class="field-error">{{ fields.title }}</small></label>
            <label class="field span-2"><span>概要 <em>必須</em></span><textarea v-model="form.summary" required maxlength="240" rows="3"></textarea></label>
            <label class="field"><span>対象者 <em>必須</em></span><input v-model="form.audience" required maxlength="500" /></label>
            <div class="field"><span>公開状態</span><BasiqToggleButton :model-value="form.published" :aria-label="form.published ? '公開中。押すと下書きに戻します' : '下書き。押すと公開します'" @update:model-value="form.published = $event">✓</BasiqToggleButton><small>{{ form.published ? '公開中' : '下書き' }}</small><small v-if="fields.published" class="field-error">{{ fields.published }}</small></div>
          </div>
        </BasiqCard>

        <section class="roadmap-stage-editor" aria-labelledby="stage-editor-title">
          <div class="section-heading"><div><h2 id="stage-editor-title">講習会の順番</h2><p>各段階の講習会が、上から順に閲覧ページへ表示されます。</p></div><BasiqButton type="button" tone="neutral" variant="outline" @click="addStage">段階を追加</BasiqButton></div>
          <p v-if="fields.stages" class="field-error" role="alert">{{ fields.stages }}</p>
          <ol class="roadmap-stage-editor-list">
            <li v-for="(stage, stageIndex) in form.stages" :key="stageIndex">
              <BasiqCard>
                <template #header><div class="editor-stage-heading"><span>{{ stageIndex + 1 }}</span><h3>段階 {{ stageIndex + 1 }}</h3><BasiqButton v-if="form.stages.length > 1" type="button" tone="danger" variant="outline" @click="removeStage(stageIndex)">削除</BasiqButton></div></template>
                <fieldset class="workshop-checklist"><legend>この段階の講習会</legend><label v-for="workshop in workshops" :key="workshop.id"><input type="checkbox" :checked="selected(stage, workshop.id)" @change="onWorkshopChange(stage, workshop.id, $event)" /><span><strong>{{ workshop.title }}</strong><small>{{ workshop.teams.join(' / ') }}</small></span></label></fieldset>
              </BasiqCard>
            </li>
          </ol>
        </section>

        <div class="editor-actions"><BasiqButton v-if="isEdit" type="button" tone="danger" variant="outline" :disabled="deleting || saving" @click="destroy">{{ deleting ? '削除中…' : 'ロードマップを削除' }}</BasiqButton><span></span><a class="secondary-link" href="/admin" data-route>キャンセル</a><BasiqButton type="submit" :disabled="saving || deleting">{{ saving ? '保存中…' : '保存' }}</BasiqButton></div>
      </form>
    </main>`,
});
