import { BasiqButton, BasiqCard, BasiqToggleButton } from 'basiq-ui';
import { computed, defineComponent, nextTick, onMounted, reactive, ref, watch, type PropType } from 'vue/dist/vue.esm-bundler.js';
import type { WorkshopInput, WorkshopSummary } from '../../lib/contracts';
import OccurrenceFields from '../components/OccurrenceFields';
import { ApiClientError, copyOccurrence, fetchDiscovery, fetchWorkshop, saveWorkshop } from '../api';
import { blankOccurrence, blankWorkshop, detailToInput } from '../forms/workshopForm';

type EditorMode = 'wizard' | 'edit';

export default defineComponent({
  name: 'WorkshopEditorView', components: { BasiqButton, BasiqCard, BasiqToggleButton, OccurrenceFields },
  props: { editorMode: { type: String as PropType<EditorMode>, required: true }, workshopId: { type: String, default: '' } }, emits: ['navigate'],
  setup(props, { emit }) {
    const form = reactive<WorkshopInput>(blankWorkshop()); const options = ref<WorkshopSummary[]>([]); const loading = ref(props.editorMode === 'edit'); const step = ref(1); const saving = ref(false); const copyingId = ref<number | null>(null); const error = ref(''); const notice = ref(''); const fieldErrors = ref<Record<string, string>>({}); const restored = ref(false);
    const isWizard = computed(() => props.editorMode === 'wizard'); const isEdit = computed(() => props.editorMode === 'edit'); const draftKey = computed(() => `one-monthon.beta.${props.editorMode}.draft.v1`);
    const applyInput = (input: WorkshopInput) => { form.title = input.title; form.summary = input.summary; form.prerequisiteIds = [...input.prerequisiteIds]; form.successorIds = [...input.successorIds]; form.occurrences = input.occurrences.map((item) => ({ ...item })); };
    const load = async () => { loading.value = true; error.value = ''; try { const discovery = await fetchDiscovery(); options.value = discovery.workshops.filter((item) => String(item.id) !== props.workshopId); if (isEdit.value) applyInput(detailToInput(await fetchWorkshop(props.workshopId, true))); else { const saved = sessionStorage.getItem(draftKey.value); if (saved) { applyInput(JSON.parse(saved) as WorkshopInput); restored.value = true; } } } catch (caught) { error.value = caught instanceof ApiClientError ? caught.message : '編集内容を読み込めませんでした。'; } finally { loading.value = false; } };
    const validate = () => { const errors: Record<string, string> = {}; if (!form.title.trim()) errors.title = '講習会名を入力してください。'; if (!form.summary.trim()) errors.summary = '概要を入力してください。'; form.occurrences.forEach((item, index) => { if (!item.description.trim()) errors[`occurrences.${index}.description`] = `開催${index + 1}の「学べること」を入力してください。`; if (!item.team.trim()) errors[`occurrences.${index}.team`] = `開催${index + 1}の班を入力してください。`; if (!item.audience.trim()) errors[`occurrences.${index}.audience`] = `開催${index + 1}の対象者を入力してください。`; }); fieldErrors.value = errors; if (Object.keys(errors).length) { void nextTick(() => document.querySelector<HTMLElement>('.editor-form input:invalid, .editor-form textarea:invalid')?.focus()); return false; } return true; };
    const toggleRelation = (field: 'prerequisiteIds' | 'successorIds', id: number, selected: boolean) => { const other = field === 'prerequisiteIds' ? 'successorIds' : 'prerequisiteIds'; form[field] = selected ? [...form[field], id] : form[field].filter((item) => item !== id); if (selected) form[other] = form[other].filter((item) => item !== id); };
    const addOccurrence = () => { const next = Math.max(0, ...form.occurrences.filter((item) => item.kind === 'standard').map((item) => item.sequenceNumber)) + 1; form.occurrences.push(blankOccurrence(next)); };
    const submit = async () => { if (saving.value || !validate()) return; saving.value = true; error.value = ''; notice.value = ''; try { const workshop = await saveWorkshop(JSON.parse(JSON.stringify(form)), isEdit.value ? props.workshopId : undefined); if (!isEdit.value) sessionStorage.removeItem(draftKey.value); notice.value = '保存しました。'; emit('navigate', isEdit.value ? `/admin/workshops/${workshop.id}` : `/workshops/${workshop.id}`); } catch (caught) { if (caught instanceof ApiClientError) { error.value = caught.message; fieldErrors.value = caught.fields; } else error.value = '保存できませんでした。入力内容は保持されています。'; } finally { saving.value = false; } };
    const copy = async (occurrenceId: number | undefined, kind: 'standard' | 'rebroadcast') => { if (!isEdit.value || !occurrenceId || copyingId.value) return; copyingId.value = occurrenceId; error.value = ''; try { const detail = await copyOccurrence(Number(props.workshopId), occurrenceId, kind); applyInput(detailToInput(detail)); notice.value = kind === 'rebroadcast' ? '再放送を複製しました。内容は元開催と独立して編集できます。' : '次回を複製しました。内容は元開催と独立して編集できます。'; } catch (caught) { error.value = caught instanceof ApiClientError ? caught.message : '開催を複製できませんでした。'; } finally { copyingId.value = null; } };
    const nextStep = () => { if (step.value === 1 && (!form.title.trim() || !form.summary.trim())) { validate(); return; } if (step.value === 2 && !validate()) return; step.value += 1; window.scrollTo(0, 0); };
    onMounted(load); watch(form, () => { if (!isEdit.value && !loading.value) sessionStorage.setItem(draftKey.value, JSON.stringify(form)); }, { deep: true });
    return { form, options, loading, step, saving, copyingId, error, notice, fieldErrors, restored, isWizard, isEdit, toggleRelation, addOccurrence, submit, copy, nextStep };
  },
  template: `
    <main class="page editor-page" tabindex="-1">
      <header class="page-heading"><div><h1>{{ isEdit ? '講習会を編集' : '講習会を登録' }}</h1><p>{{ isEdit ? '講習会の概要と、開催ごとの情報を編集します。' : '案内に沿って、最初の開催まで登録します。' }}</p></div></header>
      <div v-if="loading" class="feedback" role="status">編集内容を読み込んでいます。</div>
      <template v-else>
        <div v-if="restored" class="feedback feedback-success" role="status">このブラウザに残っていた下書きを復元しました。</div>
        <div v-if="notice" class="feedback feedback-success" role="status">{{ notice }}</div>
        <div v-if="error" class="feedback feedback-error" role="alert"><div><strong>保存できませんでした</strong><p>{{ error }}</p><ul v-if="Object.keys(fieldErrors).length"><li v-for="message in fieldErrors" :key="message">{{ message }}</li></ul></div></div>
        <ol v-if="isWizard" class="step-list" aria-label="登録手順"><li :aria-current="step === 1 ? 'step' : undefined">1. 講習会</li><li :aria-current="step === 2 ? 'step' : undefined">2. 開催</li><li :aria-current="step === 3 ? 'step' : undefined">3. つながりと確認</li></ol>
        <form class="editor-form" @submit.prevent="submit">
          <BasiqCard v-show="!isWizard || step === 1"><template #header><div class="form-section-title"><h2>講習会</h2><p>検索結果と詳細ページの先頭に表示する共通情報です。</p></div></template>
            <div class="form-grid"><label class="field field-wide"><span>講習会名 <em>必須</em></span><input v-model="form.title" required maxlength="100" :aria-invalid="Boolean(fieldErrors.title)" /></label><label class="field field-wide"><span>概要 <em>必須</em></span><textarea v-model="form.summary" required maxlength="240" rows="3" :aria-invalid="Boolean(fieldErrors.summary)"></textarea></label></div>
          </BasiqCard>
          <section v-show="!isWizard || step === 2" class="form-section" aria-labelledby="occurrences-form-title"><div class="section-heading"><div><h2 id="occurrences-form-title">開催</h2><p>日時、教材、対象者などは開催ごとに独立して保存されます。</p></div><BasiqButton v-if="!isWizard" type="button" tone="neutral" variant="outline" @click="addOccurrence">開催を追加</BasiqButton></div><OccurrenceFields v-for="(occurrence, index) in form.occurrences" :key="occurrence.id ?? 'new-' + index" v-model="form.occurrences[index]" :index="index" :show-copy="isEdit && Boolean(occurrence.id)" :copying="copyingId === occurrence.id" @copy="copy(occurrence.id, $event)" /></section>
          <BasiqCard v-show="!isWizard || step === 3"><template #header><div class="form-section-title"><h2>学びのつながり</h2><p>検索とは別に、先に学ぶ内容と次に進む内容を示します。どちらも任意です。</p></div></template>
            <div class="relation-columns"><section><h3>先に学ぶ</h3><ul class="relation-options"><li v-for="item in options" :key="'before-' + item.id"><BasiqToggleButton :model-value="form.prerequisiteIds.includes(item.id)" :aria-label="item.title + 'を先に学ぶ講習会に設定'" @update:model-value="toggleRelation('prerequisiteIds', item.id, $event)">✓</BasiqToggleButton><span><strong>{{ item.title }}</strong><small>{{ item.summary }}</small></span></li></ul></section><section><h3>次に学ぶ</h3><ul class="relation-options"><li v-for="item in options" :key="'after-' + item.id"><BasiqToggleButton :model-value="form.successorIds.includes(item.id)" :aria-label="item.title + 'を次に学ぶ講習会に設定'" @update:model-value="toggleRelation('successorIds', item.id, $event)">✓</BasiqToggleButton><span><strong>{{ item.title }}</strong><small>{{ item.summary }}</small></span></li></ul></section></div>
          </BasiqCard>
          <div class="form-actions"><BasiqButton v-if="isWizard && step > 1" type="button" tone="neutral" variant="outline" @click="step -= 1">戻る</BasiqButton><BasiqButton v-if="isWizard && step < 3" type="button" @click="nextStep">次へ</BasiqButton><BasiqButton v-else type="submit" :disabled="saving">{{ saving ? '保存中…' : isEdit ? '変更を保存' : '講習会を保存' }}</BasiqButton></div>
        </form>
      </template>
    </main>`,
});
