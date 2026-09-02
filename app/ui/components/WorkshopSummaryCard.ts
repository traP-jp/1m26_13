import { BasiqCard } from 'basiq-ui';
import { computed, defineComponent, type PropType } from 'vue/dist/vue.esm-bundler.js';
import type { WorkshopSummary } from '../../lib/contracts';
import AppIcon from './AppIcon';

function compactTeamName(team: string) {
  const name = team.replace(/班$/, '');
  return /^[A-Za-z]/.test(name) ? name.slice(0, 3) : name.slice(0, 2);
}

export default defineComponent({
  name: 'WorkshopSummaryCard',
  components: { AppIcon, BasiqCard },
  props: {
    workshop: { type: Object as PropType<WorkshopSummary>, required: true },
  },
  setup(props) {
    const primaryTeam = computed(() => props.workshop.teams[0] ?? '未定');
    const teamMark = computed(() => compactTeamName(primaryTeam.value));
    const target = computed(() => props.workshop.published ? `/workshops/${props.workshop.id}` : `/admin/workshops/${props.workshop.id}`);
    return { primaryTeam, target, teamMark };
  },
  template: `
    <a class="workshop-card-link" :href="target" data-route>
      <BasiqCard class="workshop-summary-card">
        <template #header>
          <div class="workshop-card-heading">
            <span class="resource-mark team-mark" aria-hidden="true">{{ teamMark }}</span>
            <span class="workshop-card-title"><strong>{{ workshop.title }}</strong><small>{{ workshop.summary }}</small></span>
          </div>
        </template>
        <dl class="workshop-card-facts">
          <div><dt>班</dt><dd>{{ workshop.teams.join(' / ') || '未定' }}</dd></div>
          <div><dt>年度</dt><dd>{{ workshop.years.map(y => y + '年度').join(' / ') || '未定' }}</dd></div>
        </dl>
        <template #footer>
          <div class="workshop-card-footer">
            <span>{{ workshop.occurrenceCount === 0 ? '開催未定' : workshop.occurrenceCount === 1 ? '1回完結' : workshop.occurrenceCount + '開催' }}</span>
            <span class="workshop-card-open">{{ workshop.published ? '詳細を見る' : '編集を続ける' }}<AppIcon name="chevron" :size="18" /></span>
          </div>
        </template>
      </BasiqCard>
    </a>`,
});
