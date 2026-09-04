import { BasiqButton, BasiqCard } from 'basiq-ui';
import { computed, defineComponent, onMounted, reactive, ref } from 'vue/dist/vue.esm-bundler.js';
import type { Flow, FlowCategory, FlowInput, WorkshopOccurrence, WorkshopSummary } from '../../lib/contracts';
import { ApiClientError, fetchDiscovery, fetchFlows, fetchWorkshop, removeFlow, saveFlow } from '../api';

const labels: Record<FlowCategory, string> = {
  lecture_pre: '講習会の事前フロー', session_main: '各開催のメインフロー', lecture_post: '講習会の事後フロー',
};

export default defineComponent({
  name: 'FlowManager', components: { BasiqButton, BasiqCard },
  setup() {
    const flows = ref<Flow[]>([]); const lectures = ref<WorkshopSummary[]>([]); const sessions = ref<WorkshopOccurrence[]>([]);
    const selectedLectureId = ref<number | null>(null); const editingId = ref<number | null>(null); const loading = ref(true); const saving = ref(false); const error = ref(''); const notice = ref('');
    const form = reactive<FlowInput>({ name: '', description: '', category: 'lecture_pre', lectureId: null, sessionId: null });
    const isSessionFlow = computed(() => form.category === 'session_main');
    const load = async () => { loading.value = true; error.value = ''; try { const [items, discovery] = await Promise.all([fetchFlows(), fetchDiscovery('', '', '', true)]); flows.value = items; lectures.value = discovery.workshops; } catch (caught) { error.value = caught instanceof ApiClientError ? caught.message : 'フローを読み込めませんでした。'; } finally { loading.value = false; } };
    const selectLecture = async () => { sessions.value = []; form.sessionId = null; if (!selectedLectureId.value) return; try { sessions.value = (await fetchWorkshop(selectedLectureId.value, true)).occurrences; } catch { error.value = '開催を読み込めませんでした。'; } };
    const changeCategory = () => { form.lectureId = null; form.sessionId = null; sessions.value = []; selectedLectureId.value = null; };
    const reset = () => { editingId.value = null; form.name = ''; form.description = ''; form.category = 'lecture_pre'; form.lectureId = null; form.sessionId = null; selectedLectureId.value = null; };
    const submit = async () => { saving.value = true; error.value = ''; notice.value = ''; try { const input = { ...form, lectureId: isSessionFlow.value ? null : Number(form.lectureId) || null, sessionId: isSessionFlow.value ? Number(form.sessionId) || null : null }; const saved = await saveFlow(input, editingId.value ?? undefined); flows.value = editingId.value ? flows.value.map((item) => item.id === saved.id ? saved : item) : [saved, ...flows.value]; reset(); notice.value = 'フローを保存しました。'; } catch (caught) { error.value = caught instanceof ApiClientError ? caught.message : 'フローを保存できませんでした。'; } finally { saving.value = false; } };
    const edit = async (flow: Flow) => { editingId.value = flow.id; form.name = flow.name; form.description = flow.description; form.category = flow.category; form.lectureId = flow.lectureId; form.sessionId = flow.sessionId; if (flow.sessionId) { for (const lecture of lectures.value) { const candidates = (await fetchWorkshop(lecture.id, true)).occurrences; if (candidates.some((session) => session.id === flow.sessionId)) { selectedLectureId.value = lecture.id; sessions.value = candidates; form.sessionId = flow.sessionId; break; } } } };
    const destroy = async (flow: Flow) => { if (!confirm(`「${flow.name}」を削除しますか？`)) return; try { await removeFlow(flow.id); flows.value = flows.value.filter((item) => item.id !== flow.id); notice.value = 'フローを削除しました。'; } catch (caught) { error.value = caught instanceof ApiClientError ? caught.message : 'フローを削除できませんでした。'; } };
    const targetName = (flow: Flow) => flow.lectureId ? lectures.value.find((item) => item.id === flow.lectureId)?.title ?? `講習会 #${flow.lectureId}` : `開催 #${flow.sessionId}`;
    onMounted(load); return { flows, lectures, sessions, selectedLectureId, editingId, loading, saving, error, notice, form, labels, isSessionFlow, load, selectLecture, changeCategory, submit, edit, reset, destroy, targetName };
  },
  template: `
    <section class="admin-section" aria-labelledby="admin-flow-title">
      <div class="section-heading"><div><h2 id="admin-flow-title">フロー</h2><p>講習会の前後と、各開催の中心となる手順を分類して管理します。</p></div></div>
      <div v-if="error" class="feedback feedback-error" role="alert"><strong>処理できませんでした</strong><p>{{ error }}</p></div>
      <div v-if="notice" class="feedback feedback-success" role="status">{{ notice }}</div>
      <BasiqCard>
        <template #header><div class="form-section-title"><h3>{{ editingId ? 'フローを編集' : 'フローを追加' }}</h3><p>事前・事後は講習会へ、メインは開催へ紐づきます。</p></div></template>
        <form class="form-grid" @submit.prevent="submit">
          <label class="field"><span>フロー名 <em>必須</em></span><input v-model="form.name" required maxlength="100" /></label>
          <label class="field"><span>フロー属性 <em>必須</em></span><select v-model="form.category" @change="changeCategory"><option v-for="(label, value) in labels" :key="value" :value="value">{{ label }}</option></select></label>
          <template v-if="isSessionFlow"><label class="field"><span>講習会を選択</span><select v-model="selectedLectureId" @change="selectLecture"><option :value="null">選択してください</option><option v-for="lecture in lectures" :key="lecture.id" :value="lecture.id">{{ lecture.title }}</option></select></label><label class="field"><span>対象の開催 <em>必須</em></span><select v-model="form.sessionId" required><option :value="null">選択してください</option><option v-for="session in sessions" :key="session.id" :value="session.id">{{ session.title || '第' + session.sequenceNumber + '回' }}</option></select></label></template>
          <label v-else class="field field-wide"><span>対象の講習会 <em>必須</em></span><select v-model="form.lectureId" required><option :value="null">選択してください</option><option v-for="lecture in lectures" :key="lecture.id" :value="lecture.id">{{ lecture.title }}</option></select></label>
          <label class="field field-wide"><span>説明</span><textarea v-model="form.description" maxlength="1000" rows="3"></textarea></label>
          <div class="form-actions field-wide"><BasiqButton v-if="editingId" type="button" tone="neutral" variant="outline" @click="reset">キャンセル</BasiqButton><BasiqButton type="submit" :disabled="saving">{{ saving ? '保存中…' : (editingId ? '変更を保存' : 'フローを追加') }}</BasiqButton></div>
        </form>
      </BasiqCard>
      <div v-if="loading" class="feedback" role="status">フローを読み込んでいます。</div>
      <div v-else-if="!flows.length" class="empty-state"><h3>フローはありません</h3><p>最初のフローを追加してください。</p></div>
      <ul v-else class="admin-roadmap-list"><li v-for="flow in flows" :key="flow.id"><span><strong>{{ flow.name }}</strong><small>{{ labels[flow.category] }} · {{ targetName(flow) }}</small></span><span>{{ flow.description }}</span><span class="admin-row-actions"><BasiqButton type="button" @click="edit(flow)">編集</BasiqButton><BasiqButton type="button" tone="danger" variant="outline" @click="destroy(flow)">削除</BasiqButton></span></li></ul>
    </section>`,
});
