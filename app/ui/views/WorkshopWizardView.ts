import { BasiqButton, BasiqCard, BasiqToggleButton } from 'basiq-ui';
import { computed, defineComponent, nextTick, onMounted, reactive, ref, watch, type PropType } from 'vue/dist/vue.esm-bundler.js';
import type { WorkshopInput, WorkshopSummary } from '../../lib/contracts';
import OccurrenceFields from '../components/OccurrenceFields';
import { ApiClientError, copyOccurrence, fetchDiscovery, fetchWorkshop, removeWorkshop, saveWorkshop } from '../api';
import { blankOccurrence, blankWorkshop, detailToInput } from '../forms/workshopForm';

type EditorMode = 'wizard' | 'edit';

export default defineComponent({
  name: 'WorkshopEditorView', components: { BasiqButton, BasiqCard, BasiqToggleButton, OccurrenceFields },
  props: { editorMode: { type: String as PropType<EditorMode>, required: true }, workshopId: { type: String, default: '' } }, emits: ['navigate'],
  setup(props, { emit }) {
    const form = reactive<WorkshopInput>(blankWorkshop(props.editorMode === 'edit')); const options = ref<WorkshopSummary[]>([]); const loading = ref(props.editorMode === 'edit'); const saving = ref(false); const deleting = ref(false); const copyingId = ref<number | null>(null); const error = ref(''); const errorTitle = ref('保存できませんでした'); const notice = ref(''); const fieldErrors = ref<Record<string, string>>({}); const restored = ref(false);
    const isWizard = computed(() => props.editorMode === 'wizard'); const isEdit = computed(() => props.editorMode === 'edit'); const draftKey = computed(() => `one-monthon.beta.${props.editorMode}.draft.v2`);
    const applyInput = (input: WorkshopInput) => { form.title = input.title; form.summary = input.summary; form.prerequisiteIds = [...input.prerequisiteIds]; form.successorIds = [...input.successorIds]; form.occurrences = input.occurrences.map((item) => ({ ...item })); };
    const addOccurrence = () => { const next = Math.max(0, ...form.occurrences.filter((item) => item.kind === 'standard').map((item) => item.sequenceNumber)) + 1; form.occurrences.push(blankOccurrence(next)); };
    const removeOccurrence = (index: number) => { if (form.occurrences.length > 1) { form.occurrences.splice(index, 1); notice.value = ''; } };
    const load = async () => {
      loading.value = true; error.value = '';
      try {
        const discovery = await fetchDiscovery(); options.value = discovery.workshops.filter((item) => String(item.id) !== props.workshopId);
        if (isEdit.value) {
          applyInput(detailToInput(await fetchWorkshop(props.workshopId, true)));
          if (!form.occurrences.length) addOccurrence();
          if (new URL(location.href).searchParams.get('created') === '1') notice.value = '講習会を作成しました。続けて最初の開催を登録してください。';
        } else {
          const saved = sessionStorage.getItem(draftKey.value);
          if (saved) { const input = JSON.parse(saved) as WorkshopInput; form.title = input.title; form.summary = input.summary; restored.value = true; }
        }
      } catch (caught) { error.value = caught instanceof ApiClientError ? caught.message : '編集内容を読み込めませんでした。'; }
      finally { loading.value = false; }
    };
    const validate = () => {
      const errors: Record<string, string> = {};
      if (!form.title.trim()) errors.title = '講習会名を入力してください。';
      if (!form.summary.trim()) errors.summary = '概要を入力してください。';
      if (isEdit.value && !form.occurrences.length) errors.occurrences = '開催を1件以上入力してください。';
      if (isEdit.value) form.occurrences.forEach((item, index) => {
        if (!item.description.trim()) errors[`occurrences.${index}.description`] = `開催${index + 1}の「この回で学べること」を入力してください。`;
        if (!item.team.trim()) errors[`occurrences.${index}.team`] = `開催${index + 1}の開催する組織・班を入力してください。`;
        if (!item.audience.trim()) errors[`occurrences.${index}.audience`] = `開催${index + 1}の対象者を入力してください。`;
      });
      fieldErrors.value = errors;
      if (Object.keys(errors).length) { void nextTick(() => document.querySelector<HTMLElement>('.editor-form input:invalid, .editor-form textarea:invalid')?.focus()); return false; }
      return true;
    };
    const toggleRelation = (field: 'prerequisiteIds' | 'successorIds', id: number, selected: boolean) => { const other = field === 'prerequisiteIds' ? 'successorIds' : 'prerequisiteIds'; form[field] = selected ? [...new Set([...form[field], id])] : form[field].filter((item) => item !== id); if (selected) form[other] = form[other].filter((item) => item !== id); };
    const relationToggleStyle = (selected: boolean) => selected ? {
      '--basiq-color-toggle-button-content-on': 'var(--app-success)',
      '--basiq-color-toggle-button-background-on-rest': 'var(--app-success-soft)',
      '--basiq-color-toggle-button-background-on-hover': 'var(--app-success-soft)',
      '--basiq-color-toggle-button-background-on-pressed': 'var(--app-success-soft)',
    } : undefined;
    const submit = async () => {
      if (saving.value || !validate()) return;
      saving.value = true; error.value = ''; errorTitle.value = '保存できませんでした'; notice.value = '';
      try {
        const payload: WorkshopInput = isWizard.value ? { title: form.title, summary: form.summary, prerequisiteIds: [], successorIds: [], occurrences: [] } : JSON.parse(JSON.stringify(form));
        const workshop = await saveWorkshop(payload, isEdit.value ? props.workshopId : undefined);
        if (isWizard.value) sessionStorage.removeItem(draftKey.value);
        if (isEdit.value) { notice.value = '開催データを保存しました。'; emit('navigate', `/admin/workshops/${workshop.id}`); }
        else emit('navigate', `/admin/workshops/${workshop.id}?created=1`);
      } catch (caught) {
        if (caught instanceof ApiClientError) { error.value = caught.message; fieldErrors.value = caught.fields; }
        else error.value = '保存できませんでした。入力内容は保持されています。';
      } finally { saving.value = false; }
    };
    const copy = async (occurrenceId: number | undefined, kind: 'standard' | 'rebroadcast') => {
      if (!isEdit.value || !occurrenceId || copyingId.value) return;
      copyingId.value = occurrenceId; error.value = ''; errorTitle.value = '複製できませんでした';
      try { const detail = await copyOccurrence(Number(props.workshopId), occurrenceId, kind); applyInput(detailToInput(detail)); notice.value = kind === 'rebroadcast' ? '再放送を複製しました。内容は元開催と独立して編集できます。' : '次回を複製しました。内容は元開催と独立して編集できます。'; }
      catch (caught) { error.value = caught instanceof ApiClientError ? caught.message : '開催を複製できませんでした。'; }
      finally { copyingId.value = null; }
    };
    const destroy = async () => {
      if (!isEdit.value || deleting.value || saving.value || !confirm('この講習会とすべての開催データ、完了記録、ロードマップ上の配置を削除しますか？この操作は元に戻せません。')) return;
      deleting.value = true; error.value = ''; errorTitle.value = '削除できませんでした'; notice.value = '';
      try { await removeWorkshop(props.workshopId); emit('navigate', '/'); }
      catch (caught) { error.value = caught instanceof ApiClientError ? caught.message : '講習会を削除できませんでした。'; }
      finally { deleting.value = false; }
    };
    onMounted(load); watch(form, () => { if (isWizard.value && !loading.value) sessionStorage.setItem(draftKey.value, JSON.stringify(form)); }, { deep: true });
    return { form, options, loading, saving, deleting, copyingId, error, errorTitle, notice, fieldErrors, restored, isWizard, isEdit, toggleRelation, relationToggleStyle, addOccurrence, removeOccurrence, submit, copy, destroy };
  },
  template: `
    <main class="page editor-page" tabindex="-1">
      <header class="page-heading"><div><h1>{{ isEdit ? '講習会を編集' : '講習会を登録' }}</h1><p>{{ isEdit ? '講習会の概要と、開催ごとの情報を編集します。' : 'まず講習会を作成し、その後に開催ごとの内容を追加します。' }}</p></div></header>
      <div v-if="loading" class="feedback" role="status">編集内容を読み込んでいます。</div>
      <template v-else>
        <div v-if="restored" class="feedback feedback-success" role="status">このブラウザに残っていた下書きを復元しました。</div>
        <div v-if="notice" class="feedback feedback-success" role="status">{{ notice }}</div>
        <div v-if="error" class="feedback feedback-error" role="alert"><div><strong>{{ errorTitle }}</strong><p>{{ error }}</p><ul v-if="Object.keys(fieldErrors).length"><li v-for="message in fieldErrors" :key="message">{{ message }}</li></ul></div></div>
        <form class="editor-form" @submit.prevent="submit">
          <BasiqCard><template #header><div class="form-section-title"><h2>講習会</h2><p>講習会の名前と概要を書いてください。シリーズの講習会である場合は、シリーズ名を書いてください。</p></div></template>
            <div class="form-grid"><label class="field field-wide"><span>講習会名 <em>必須</em></span><input v-model="form.title" required maxlength="100" placeholder="例: なろう講習会" :aria-invalid="Boolean(fieldErrors.title)" /></label><label class="field field-wide"><span>概要 <em>必須</em></span><textarea v-model="form.summary" required maxlength="240" rows="3" :aria-invalid="Boolean(fieldErrors.summary)"></textarea></label></div>
          </BasiqCard>
          <template v-if="isEdit">
            <section class="form-section" aria-labelledby="occurrences-form-title"><div class="section-heading"><div><h2 id="occurrences-form-title">開催</h2><p>シリーズものの講習会であれば、回ごとに教材や対象者やこの回で学べることを書いてください。<br />単発の講習会であれば、第1回のみの開催にしてください。</p></div><BasiqButton type="button" tone="neutral" variant="outline" aria-label="開催を追加" @click="addOccurrence">＋</BasiqButton></div><OccurrenceFields v-for="(occurrence, index) in form.occurrences" :key="occurrence.id ?? 'new-' + index" v-model="form.occurrences[index]" :index="index" :show-copy="Boolean(occurrence.id)" :copying="copyingId === occurrence.id" :can-remove="form.occurrences.length > 1" @copy="copy(occurrence.id, $event)" @remove="removeOccurrence(index)" /></section>
            <BasiqCard><template #header><div class="form-section-title"><h2>学びのつながり</h2><p>先に学んでおくべき内容と次にやるべき内容を選択してください。どちらも任意です。</p></div></template>
              <div class="relation-columns"><section><h3>先に学ぶ（{{ form.prerequisiteIds.length }}件選択）</h3><ul class="relation-options"><li v-for="item in options" :key="'before-' + item.id" :class="{ 'feedback-success': form.prerequisiteIds.includes(item.id) }"><BasiqToggleButton :model-value="form.prerequisiteIds.includes(item.id)" :style="relationToggleStyle(form.prerequisiteIds.includes(item.id))" :aria-label="item.title + 'を先に学ぶ講習会に設定'" @update:model-value="toggleRelation('prerequisiteIds', item.id, $event)">✓</BasiqToggleButton><span><strong>{{ item.title }}</strong><small>{{ item.summary }}</small></span></li></ul></section><section><h3>次に学ぶ（{{ form.successorIds.length }}件選択）</h3><ul class="relation-options"><li v-for="item in options" :key="'after-' + item.id" :class="{ 'feedback-success': form.successorIds.includes(item.id) }"><BasiqToggleButton :model-value="form.successorIds.includes(item.id)" :style="relationToggleStyle(form.successorIds.includes(item.id))" :aria-label="item.title + 'を次に学ぶ講習会に設定'" @update:model-value="toggleRelation('successorIds', item.id, $event)">✓</BasiqToggleButton><span><strong>{{ item.title }}</strong><small>{{ item.summary }}</small></span></li></ul></section></div>
            </BasiqCard>
          </template>
          <div class="form-actions"><BasiqButton v-if="isEdit" type="button" tone="danger" :disabled="saving || deleting" @click="destroy">{{ deleting ? '削除中…' : '講習会を削除' }}</BasiqButton><BasiqButton type="submit" :disabled="saving || deleting">{{ saving ? (isEdit ? '保存中…' : '作成中…') : (isEdit ? '変更を保存' : '講習会を作成') }}</BasiqButton></div>
        </form>
      </template>
    </main>`,
});
