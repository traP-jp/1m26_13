import { BasiqButton, BasiqCard, BasiqChoiceGroup, BasiqChoiceGroupItem } from 'basiq-ui';
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue/dist/vue.esm-bundler.js';
import type { WorkshopOccurrence, WorkshopDetail } from '../../lib/contracts';
import AppIcon from '../components/AppIcon';
import { ApiClientError, completeWorkshop, fetchWorkshop, uncompleteWorkshop } from '../api';

const dateTime = new Intl.DateTimeFormat('ja-JP', { dateStyle: 'long', timeStyle: 'short' });

export default defineComponent({
  name: 'WorkshopDetailView', components: { AppIcon, BasiqButton, BasiqCard, BasiqChoiceGroup, BasiqChoiceGroupItem }, props: { workshopId: { type: String as PropType<string>, required: true } },
  setup(props) {
    const workshop = ref<WorkshopDetail | null>(null); const loading = ref(true); const busy = ref(false); const error = ref(''); const notice = ref(''); const selectedRound = ref('1');
    const groups = computed(() => { const map = new Map<number, WorkshopOccurrence[]>(); for (const occurrence of workshop.value?.occurrences ?? []) map.set(occurrence.sequenceNumber, [...(map.get(occurrence.sequenceNumber) ?? []), occurrence]); return [...map.entries()].sort(([a], [b]) => a - b).map(([number, occurrences]) => ({ number, occurrences })); });
    const simple = computed(() => groups.value.length === 1 && groups.value[0].occurrences.length === 1 && groups.value[0].occurrences[0].kind === 'standard');
    const visibleGroup = computed(() => groups.value.find((group) => String(group.number) === selectedRound.value) ?? groups.value[0]);
    const primaryOccurrence = computed(() => visibleGroup.value?.occurrences.find((item) => item.kind === 'standard') ?? visibleGroup.value?.occurrences[0] ?? null);
    const setRoundFromHash = () => { const value = location.hash.slice(1); if (groups.value.some((group) => String(group.number) === value)) selectedRound.value = value; else if (groups.value[0]) selectedRound.value = String(groups.value[0].number); };
    const selectRound = async (value: string | null) => { if (!value) return; selectedRound.value = value; history.replaceState({}, '', `${location.pathname}${location.search}#${value}`); await nextTick(); document.getElementById(value)?.focus({ preventScroll: true }); document.getElementById(value)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    const load = async () => { loading.value = true; error.value = ''; try { workshop.value = await fetchWorkshop(props.workshopId); document.title = `${workshop.value.title} | 1-Monthon β`; await nextTick(); setRoundFromHash(); } catch (caught) { error.value = caught instanceof ApiClientError ? caught.message : '講習会を読み込めませんでした。'; } finally { loading.value = false; } };
    const toggleCompletion = async () => { if (!workshop.value || busy.value) return; const wasCompleted = workshop.value.completed; busy.value = true; error.value = ''; notice.value = ''; try { if (wasCompleted) await uncompleteWorkshop(workshop.value.id); else await completeWorkshop(workshop.value.id); workshop.value = await fetchWorkshop(props.workshopId); notice.value = wasCompleted ? '完了記録を取り消しました。' : 'この講習会の完了を記録しました。'; } catch (caught) { error.value = caught instanceof ApiClientError ? caught.message : '完了記録を更新できませんでした。'; } finally { busy.value = false; } };
    const formatDate = (value: string | null) => value ? dateTime.format(new Date(value)) : '日程未定';
    const kindLabel = (kind: WorkshopOccurrence['kind']) => kind === 'rebroadcast' ? '再放送' : kind === 'digest' ? '総集編' : '';
    onMounted(() => addEventListener('hashchange', setRoundFromHash)); onBeforeUnmount(() => removeEventListener('hashchange', setRoundFromHash)); watch(() => props.workshopId, load, { immediate: true });
    return { workshop, loading, busy, error, notice, groups, simple, visibleGroup, primaryOccurrence, selectedRound, selectRound, toggleCompletion, load, formatDate, kindLabel };
  },
  template: `
    <main class="page detail-page" tabindex="-1">
      <nav class="breadcrumb" aria-label="パンくず"><a href="/workshops" data-route>講習会を探す</a><AppIcon name="chevron" :size="15" /><span aria-current="page">講習会詳細</span></nav>
      <div v-if="loading" class="feedback" role="status">講習会を読み込んでいます。</div>
      <div v-else-if="error && !workshop" class="feedback feedback-error" role="alert"><div><strong>表示できませんでした</strong><p>{{ error }}</p></div><BasiqButton tone="neutral" variant="outline" @click="load">再試行</BasiqButton></div>
      <template v-else-if="workshop">
        <header class="detail-title-block"><div class="detail-title-copy"><div class="meta-tags"><span v-for="team in workshop.teams" :key="team">{{ team }}</span><span v-for="year in workshop.years" :key="year">{{ year }}年度</span><span>{{ simple ? '1回完結' : groups.length + '回構成' }}</span></div><h1>{{ workshop.title }}</h1><p>{{ workshop.summary }}</p></div><a v-if="workshop.canManage" class="secondary-link" :href="'/admin/workshops/' + workshop.id" data-route><AppIcon name="edit" :size="17" />編集</a></header>
        <div v-if="notice" class="feedback feedback-success" role="status">{{ notice }}</div><div v-if="error" class="feedback feedback-error" role="alert">{{ error }}</div>

        <section v-if="!simple" class="round-switcher" aria-labelledby="rounds-title">
          <div><h2 id="rounds-title">回を選ぶ</h2><p>URLの回番号から同じ内容を開けます。</p></div>
          <div class="round-choice-scroll"><BasiqChoiceGroup :model-value="selectedRound" aria-label="回を選択" @update:model-value="selectRound"><BasiqChoiceGroupItem v-for="group in groups" :key="group.number" :value="String(group.number)" :aria-label="'第' + group.number + '回'">{{ group.number }}</BasiqChoiceGroupItem></BasiqChoiceGroup></div>
        </section>

        <div v-if="visibleGroup && primaryOccurrence" class="workshop-detail-layout">
          <div :id="String(visibleGroup.number)" class="workshop-detail-main" tabindex="-1">
            <section class="detail-section" aria-labelledby="outcome-title"><h2 id="outcome-title">この回で学べること</h2><template v-if="simple"><p class="lead-copy">{{ primaryOccurrence.description }}</p></template><div v-else class="occurrence-stack"><article v-for="occurrence in visibleGroup.occurrences" :key="occurrence.id" class="occurrence-detail"><header><span v-if="kindLabel(occurrence.kind)" class="kind-label">{{ kindLabel(occurrence.kind) }}</span><div><h3>{{ occurrence.title || '第' + occurrence.sequenceNumber + '回' }}</h3><p>{{ occurrence.team }} · {{ occurrence.year }}年度</p></div></header><p>{{ occurrence.description }}</p></article></div></section>

            <section class="detail-section audience-section" aria-label="対象者と前提知識"><div><h2>対象者</h2><p>{{ primaryOccurrence.audience }}</p></div><div><h2>前提知識</h2><p>{{ primaryOccurrence.prerequisites || '特になし' }}</p></div></section>

            <section class="detail-section" aria-labelledby="materials-title"><h2 id="materials-title">教材</h2><ul v-if="visibleGroup.occurrences.some(item => item.materialUrl)" class="material-list"><li v-for="occurrence in visibleGroup.occurrences.filter(item => item.materialUrl)" :key="occurrence.id"><a :href="occurrence.materialUrl ?? '#'" target="_blank" rel="noreferrer"><span class="resource-mark"><AppIcon name="book" :size="19" /></span><span><strong>{{ occurrence.materialLabel }}</strong><small v-if="!simple">第{{ occurrence.sequenceNumber }}回{{ kindLabel(occurrence.kind) ? ' · ' + kindLabel(occurrence.kind) : '' }}</small></span><span>開く</span><AppIcon name="chevron" :size="17" /></a></li></ul><div v-else class="empty-inline">教材は登録されていません。</div></section>

            <section class="detail-section" aria-labelledby="connections-title"><h2 id="connections-title">前後の講習会</h2><div v-if="!workshop.prerequisites.length && !workshop.successors.length" class="empty-inline">前後関係は登録されていません。</div><dl v-else class="connection-list"><div v-if="workshop.prerequisites.length"><dt>先に学ぶ</dt><dd><a v-for="item in workshop.prerequisites" :key="item.id" :href="'/workshops/' + item.id" data-route>{{ item.title }}</a></dd></div><div v-if="workshop.successors.length"><dt>次に学ぶ</dt><dd><a v-for="item in workshop.successors" :key="item.id" :href="'/workshops/' + item.id" data-route>{{ item.title }}</a></dd></div></dl></section>
          </div>

          <aside class="workshop-detail-rail">
            <BasiqCard class="learning-card"><div class="rail-card-body"><h2>学習状況</h2><div class="completion-state" :class="{ completed: workshop.completed }"><AppIcon :name="workshop.completed ? 'check' : 'record'" :size="22" /><span><strong>{{ workshop.completed ? '完了済み' : '未完了' }}</strong><small>{{ workshop.completed ? 'プロフィールに保存されています' : '受講後に記録できます' }}</small></span></div><BasiqButton class="completion-button" :tone="workshop.completed ? 'neutral' : 'accent'" :variant="workshop.completed ? 'outline' : 'solid'" :disabled="busy" @click="toggleCompletion">{{ busy ? '保存中…' : workshop.completed ? '完了を取り消す' : '受講し終わった' }}</BasiqButton></div></BasiqCard>

            <BasiqCard><div class="rail-card-body"><h2>開催情報</h2><dl class="rail-facts"><div><dt><AppIcon name="calendar" :size="17" />日時</dt><dd>{{ formatDate(primaryOccurrence.scheduledAt) }}</dd></div><div><dt><AppIcon name="pin" :size="17" />場所</dt><dd>{{ primaryOccurrence.location || '未定' }}</dd></div><div><dt><AppIcon name="user" :size="17" />講師・運営</dt><dd>{{ primaryOccurrence.instructor || '未登録' }}</dd></div><div><dt>班・年度</dt><dd>{{ primaryOccurrence.team }} · {{ primaryOccurrence.year }}年度</dd></div></dl></div></BasiqCard>

            <BasiqCard v-if="workshop.roadmaps.length"><div class="rail-card-body"><h2>含まれるロードマップ</h2><ul class="rail-link-list"><li v-for="roadmap in workshop.roadmaps" :key="roadmap.id"><a :href="'/roadmaps/' + roadmap.id" data-route><span><strong>{{ roadmap.title }}</strong><small>{{ roadmap.completedCount }}/{{ roadmap.workshopCount }} 完了</small></span><AppIcon name="chevron" :size="17" /></a></li></ul></div></BasiqCard>
          </aside>
        </div>
      </template>
    </main>`,
});
