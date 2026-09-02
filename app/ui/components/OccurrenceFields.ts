import { BasiqButton, BasiqCard } from 'basiq-ui';
import { computed, defineComponent, type PropType } from 'vue/dist/vue.esm-bundler.js';
import type { OccurrenceInput } from '../../lib/contracts';

export default defineComponent({
  name: 'OccurrenceFields', components: { BasiqButton, BasiqCard },
  props: { modelValue: { type: Object as PropType<OccurrenceInput>, required: true }, index: { type: Number, required: true }, showCopy: { type: Boolean, default: false }, copying: { type: Boolean, default: false }, canRemove: { type: Boolean, default: false } },
  emits: ['update:modelValue', 'copy', 'remove'],
  setup(props, { emit }) {
    const update = (key: keyof OccurrenceInput, value: unknown) => emit('update:modelValue', { ...props.modelValue, [key]: value });
    const dateValue = computed(() => props.modelValue.scheduledAt?.slice(0, 16) ?? '');
    const eventValue = (event: Event) => (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
    const eventNumber = (event: Event) => Number(eventValue(event));
    const updateScheduledAt = (event: Event) => {
      const value = eventValue(event);
      const year = /^\d{4}-/.test(value) ? Number(value.slice(0, 4)) : props.modelValue.year;
      emit('update:modelValue', { ...props.modelValue, scheduledAt: value || null, year });
    };
    return { update, updateScheduledAt, dateValue, eventValue, eventNumber };
  },
  template: `
    <BasiqCard class="occurrence-form-card">
      <template #header><div class="form-card-heading"><div><h3>第{{ modelValue.sequenceNumber }}回の開催</h3><span v-if="modelValue.copiedFromOccurrenceId">開催 #{{ modelValue.copiedFromOccurrenceId }} から複製</span></div><div class="copy-actions"><template v-if="showCopy"><BasiqButton tone="neutral" variant="outline" :disabled="copying" @click="$emit('copy', 'rebroadcast')">再放送として複製</BasiqButton><BasiqButton tone="neutral" variant="outline" :disabled="copying" @click="$emit('copy', 'standard')">次回として複製</BasiqButton></template><BasiqButton tone="danger" variant="outline" :disabled="!canRemove || copying" :title="canRemove ? 'この開催を削除' : '開催は1件以上必要です'" :aria-label="'第' + modelValue.sequenceNumber + '回の開催を削除'" @click="$emit('remove')">−</BasiqButton></div></div></template>
      <div class="form-grid">
        <label class="field"><span>回番号（単発講習会なら1で）</span><input :value="modelValue.sequenceNumber" type="number" min="1" max="99" @input="update('sequenceNumber', eventNumber($event))" /></label>
        <label class="field"><span>種別</span><select :value="modelValue.kind" @change="update('kind', eventValue($event))"><option value="standard">通常開催</option><option value="rebroadcast">再放送</option><option value="digest">総集編</option></select></label>
        <label class="field"><span>公開状態</span><select :value="modelValue.status" @change="update('status', eventValue($event))"><option value="draft">下書き</option><option value="published">公開</option></select></label>
        <label class="field field-wide"><span>この回で学べること <em>必須</em></span><textarea :value="modelValue.description" rows="4" @input="update('description', eventValue($event))"></textarea></label>
        <label class="field"><span>開催する組織・班 <em>必須</em></span><input :value="modelValue.team" placeholder="例: Webエンジニア班" @input="update('team', eventValue($event))" /></label>
        <label class="field"><span>日時</span><input :value="dateValue" type="datetime-local" @input="updateScheduledAt" /></label>
        <label class="field"><span>場所</span><input :value="modelValue.location" @input="update('location', eventValue($event))" /></label>
        <label class="field"><span>講師・運営</span><input :value="modelValue.instructor" @input="update('instructor', eventValue($event))" /></label>
        <label class="field field-wide"><span>対象者 <em>必須</em></span><textarea :value="modelValue.audience" rows="2" @input="update('audience', eventValue($event))"></textarea></label>
        <label class="field field-wide"><span>前提知識</span><textarea :value="modelValue.prerequisites" rows="2" @input="update('prerequisites', eventValue($event))"></textarea></label>
        <label class="field field-wide"><span>教材URL</span><input :value="modelValue.materialUrl ?? ''" type="url" placeholder="https://" @input="update('materialUrl', eventValue($event) || null)" /></label>
        <label class="field"><span>教材の説明文</span><input :value="modelValue.materialLabel" @input="update('materialLabel', eventValue($event))" /></label>
      </div>
    </BasiqCard>`,
});
