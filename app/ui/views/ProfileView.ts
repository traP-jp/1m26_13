import { BasiqButton, BasiqCard } from 'basiq-ui';
import { computed, defineComponent, nextTick, ref, watch, type PropType } from 'vue/dist/vue.esm-bundler.js';
import type { UserProfile } from '../../lib/contracts';
import { ApiClientError, fetchProfile } from '../api';

const date = new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' });
type ProfileSection = 'badges' | 'completions' | 'roadmaps';
const profileSections: ProfileSection[] = ['badges', 'completions', 'roadmaps'];

export default defineComponent({
  name: 'ProfileView',
  components: { BasiqButton, BasiqCard },
  props: { userId: { type: String as PropType<string>, required: true } },
  setup(props) {
    const profile = ref<UserProfile | null>(null);
    const loading = ref(true);
    const error = ref('');
    const activeSection = ref<ProfileSection>('badges');
    const selectedBadgeId = ref<number | null>(null);

    const selectedBadge = computed(() => profile.value?.badges.find((badge) => badge.workshopId === selectedBadgeId.value) ?? null);
    const profileInitial = computed(() => profile.value?.displayName.trim().slice(0, 1).toLocaleUpperCase('ja-JP') || '1');
    const roadmapCompletedCount = computed(() => profile.value?.roadmaps.reduce((total, roadmap) => total + roadmap.completedCount, 0) ?? 0);

    const load = async () => {
      loading.value = true;
      error.value = '';
      try {
        profile.value = await fetchProfile(props.userId);
        const badgeStillExists = profile.value.badges.some((badge) => badge.workshopId === selectedBadgeId.value);
        if (!badgeStillExists) selectedBadgeId.value = profile.value.badges[0]?.workshopId ?? null;
        document.title = `${profile.value.displayName}のプロフィール | 1-Monthon β`;
      } catch (caught) {
        error.value = caught instanceof ApiClientError ? caught.message : 'プロフィールを読み込めませんでした。';
      } finally {
        loading.value = false;
      }
    };

    const handleTabKey = (event: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const currentIndex = profileSections.indexOf(activeSection.value);
      const nextIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? profileSections.length - 1
          : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + profileSections.length) % profileSections.length;
      activeSection.value = profileSections[nextIndex];
      void nextTick(() => document.getElementById(`profile-tab-${activeSection.value}`)?.focus());
    };

    watch(() => props.userId, load, { immediate: true });
    return {
      activeSection,
      error,
      formatDate: (value: string) => date.format(new Date(value)),
      handleTabKey,
      load,
      loading,
      profile,
      profileInitial,
      roadmapCompletedCount,
      selectedBadge,
      selectedBadgeId,
    };
  },
  template: `
    <main class="page profile-page" tabindex="-1">
      <div v-if="loading" class="feedback" role="status">プロフィールを読み込んでいます。</div>
      <div v-else-if="error" class="feedback feedback-error" role="alert">
        <div><strong>表示できませんでした</strong><p>{{ error }}</p></div>
        <BasiqButton tone="neutral" variant="outline" @click="load">再試行</BasiqButton>
      </div>

      <template v-else-if="profile">
        <header class="profile-header">
          <div class="profile-identity">
            <span class="profile-avatar" aria-hidden="true">{{ profileInitial }}</span>
            <div><p class="eyebrow">プロフィール</p><h1>{{ profile.displayName }}</h1></div>
          </div>
          <dl class="profile-stats" aria-label="学習状況">
            <div><dt>完了した講習会</dt><dd>{{ profile.completions.length }}</dd></div>
            <div><dt>獲得バッジ</dt><dd>{{ profile.badges.length }}</dd></div>
            <div><dt>ロードマップ内の完了</dt><dd>{{ roadmapCompletedCount }}</dd></div>
          </dl>
        </header>

        <nav class="profile-tabs" aria-label="プロフィール" role="tablist">
          <button id="profile-tab-badges" type="button" role="tab" :tabindex="activeSection === 'badges' ? 0 : -1" :aria-selected="activeSection === 'badges'" aria-controls="profile-badges" @click="activeSection = 'badges'" @keydown="handleTabKey">バッジ <span>{{ profile.badges.length }}</span></button>
          <button id="profile-tab-completions" type="button" role="tab" :tabindex="activeSection === 'completions' ? 0 : -1" :aria-selected="activeSection === 'completions'" aria-controls="profile-completions" @click="activeSection = 'completions'" @keydown="handleTabKey">完了した講習会 <span>{{ profile.completions.length }}</span></button>
          <button id="profile-tab-roadmaps" type="button" role="tab" :tabindex="activeSection === 'roadmaps' ? 0 : -1" :aria-selected="activeSection === 'roadmaps'" aria-controls="profile-roadmaps" @click="activeSection = 'roadmaps'" @keydown="handleTabKey">ロードマップ <span>{{ profile.roadmaps.length }}</span></button>
        </nav>

        <section v-if="activeSection === 'badges'" id="profile-badges" class="profile-tab-panel badge-panel" role="tabpanel" aria-labelledby="profile-tab-badges">
          <div class="badge-collection">
            <div class="section-heading"><div><h2>講習会バッジ</h2><p>講習会全体を完了した記録です。</p></div><span>{{ profile.badges.length }}件</span></div>
            <div v-if="!profile.badges.length" class="empty-state">
              <h3>バッジはまだありません</h3>
              <p>講習会を完了すると、その講習会のバッジがここに追加されます。</p>
              <a href="/workshops" data-route>講習会を探す</a>
            </div>
            <ul v-else class="badge-grid">
              <li v-for="badge in profile.badges" :key="badge.workshopId">
                <button
                  type="button"
                  class="badge-tile"
                  :class="{ 'is-selected': badge.workshopId === selectedBadgeId }"
                  :aria-pressed="badge.workshopId === selectedBadgeId"
                  @click="selectedBadgeId = badge.workshopId"
                >
                  <span class="badge-mark" aria-hidden="true"><span>1M</span></span>
                  <span class="badge-tile-copy"><strong>{{ badge.title }}</strong><small>{{ badge.year }}年度 · {{ formatDate(badge.completedAt) }}</small></span>
                </button>
              </li>
            </ul>
          </div>

          <aside v-if="selectedBadge" class="badge-detail-rail" aria-label="選択したバッジ">
            <BasiqCard class="badge-detail-card">
              <template #header><h2>バッジ詳細</h2></template>
              <div class="badge-detail-mark" aria-hidden="true"><span>1M</span></div>
              <div class="badge-detail-copy">
                <strong>{{ selectedBadge.title }}</strong>
                <dl><div><dt>年度</dt><dd>{{ selectedBadge.year }}年度</dd></div><div><dt>獲得日</dt><dd>{{ formatDate(selectedBadge.completedAt) }}</dd></div></dl>
              </div>
              <template #footer><a class="action-link" :href="'/workshops/' + selectedBadge.workshopId" data-route>講習会の詳細を見る</a></template>
            </BasiqCard>
          </aside>
        </section>

        <section v-else-if="activeSection === 'completions'" id="profile-completions" class="profile-tab-panel" role="tabpanel" aria-labelledby="profile-tab-completions">
          <div class="section-heading"><div><h2>完了した講習会</h2><p>完了として記録した講習会を、新しい順に確認できます。</p></div><span>{{ profile.completions.length }}件</span></div>
          <div v-if="!profile.completions.length" class="empty-state">
            <h3>完了記録はありません</h3>
            <p>講習会詳細の「受講し終わった」から記録できます。</p>
            <a href="/workshops" data-route>講習会を探す</a>
          </div>
          <ul v-else class="completion-record-list">
            <li v-for="item in profile.completions" :key="item.workshopId">
              <a :href="'/workshops/' + item.workshopId" data-route>
                <span class="completion-record-copy"><strong>{{ item.title }}</strong><span>{{ item.team }} · {{ item.year }}年度</span></span>
                <time :datetime="item.completedAt">{{ formatDate(item.completedAt) }} 完了</time>
              </a>
            </li>
          </ul>
        </section>

        <section v-else id="profile-roadmaps" class="profile-tab-panel" role="tabpanel" aria-labelledby="profile-tab-roadmaps">
          <div class="section-heading"><div><h2>ロードマップの進み具合</h2><p>完了記録をもとに、各ロードマップでの現在地を表示します。</p></div><span>{{ profile.roadmaps.length }}件</span></div>
          <div v-if="!profile.roadmaps.length" class="empty-state">
            <h3>ロードマップはまだありません</h3>
            <p>利用できるロードマップが追加されると、ここに進捗が表示されます。</p>
            <a href="/workshops?view=roadmaps" data-route>ロードマップを探す</a>
          </div>
          <ul v-else class="profile-roadmap-list">
            <li v-for="roadmap in profile.roadmaps" :key="roadmap.id">
              <a :href="'/roadmaps/' + roadmap.id" data-route>
                <span class="profile-roadmap-copy"><strong>{{ roadmap.title }}</strong><span>{{ roadmap.summary }}</span></span>
                <span class="profile-roadmap-progress">
                  <span>{{ roadmap.completedCount }}/{{ roadmap.workshopCount }} 完了</span>
                  <progress :value="roadmap.completedCount" :max="Math.max(roadmap.workshopCount, 1)">{{ roadmap.completedCount }}/{{ roadmap.workshopCount }}</progress>
                  <small>{{ roadmap.nextWorkshopId ? '次の講習会あり' : roadmap.workshopCount ? '完了' : '講習会未登録' }}</small>
                </span>
              </a>
            </li>
          </ul>
        </section>
      </template>
    </main>`,
});
