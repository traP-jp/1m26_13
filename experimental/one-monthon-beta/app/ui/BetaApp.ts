import { BasiqButton, BasiqThemeProvider } from 'basiq-ui';
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref } from 'vue/dist/vue.esm-bundler.js';
import AppIcon from './components/AppIcon';
import HomeView from './views/HomeView';
import ProfileView from './views/ProfileView';
import RoadmapDetailView from './views/RoadmapDetailView';
import WorkshopDetailView from './views/WorkshopDetailView';
import WorkshopListView from './views/WorkshopListView';
import WorkshopEditorView from './views/WorkshopWizardView';

type Route =
  | { name: 'home' }
  | { name: 'workshops' }
  | { name: 'workshop'; id: string }
  | { name: 'roadmap'; id: string }
  | { name: 'editor'; mode: 'wizard' | 'form' | 'edit'; id?: string }
  | { name: 'profile'; id: string }
  | { name: 'not-found' };

function parseRoute(href: string): Route {
  const url = new URL(href);
  const segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (!segments.length) return { name: 'home' };
  if (segments.length === 1 && segments[0] === 'workshops') return { name: 'workshops' };
  if (segments[0] === 'workshops' && segments.length === 2) return { name: 'workshop', id: segments[1] };
  if (segments[0] === 'roadmaps' && segments.length === 2) return { name: 'roadmap', id: segments[1] };
  if (segments.join('/') === 'admin/workshops/new') return { name: 'editor', mode: url.searchParams.get('mode') === 'form' ? 'form' : 'wizard' };
  if (segments[0] === 'admin' && segments[1] === 'workshops' && segments.length === 3) return { name: 'editor', mode: 'edit', id: segments[2] };
  if (segments[0] === 'users' && segments.length === 2) return { name: 'profile', id: segments[1] };
  return { name: 'not-found' };
}

function routeTitle(route: Route) {
  if (route.name === 'home') return 'ホーム';
  if (route.name === 'workshops') return '講習会を探す';
  if (route.name === 'workshop') return '講習会詳細';
  if (route.name === 'roadmap') return 'ロードマップ';
  if (route.name === 'editor') return route.mode === 'edit' ? '講習会を編集' : '講習会を登録';
  if (route.name === 'profile') return '学びの記録';
  return 'ページが見つかりません';
}

export default defineComponent({
  name: 'BetaApp',
  components: {
    AppIcon,
    BasiqButton,
    BasiqThemeProvider,
    HomeView,
    ProfileView,
    RoadmapDetailView,
    WorkshopDetailView,
    WorkshopListView,
    WorkshopEditorView,
  },
  setup() {
    const locationValue = ref(location.href);
    const route = computed(() => parseRoute(locationValue.value));
    const announcement = ref('');
    const currentUrl = computed(() => new URL(locationValue.value));
    const roadmapActive = computed(() => route.value.name === 'roadmap' || (route.value.name === 'workshops' && currentUrl.value.searchParams.get('view') === 'roadmaps'));
    const workshopsActive = computed(() => route.value.name === 'workshop' || (route.value.name === 'workshops' && !roadmapActive.value));

    const updateContext = async () => {
      await nextTick();
      const next = routeTitle(route.value);
      document.title = `${next} | 1-Monthon β`;
      announcement.value = next;
      document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true });
    };
    const sync = () => {
      locationValue.value = location.href;
      window.dispatchEvent(new CustomEvent('one-monthon:navigate'));
      void updateContext();
    };
    const syncFromChild = () => {
      locationValue.value = location.href;
      void updateContext();
    };
    const navigate = (target: string) => {
      const url = new URL(target, location.origin);
      history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
      locationValue.value = url.href;
      window.dispatchEvent(new CustomEvent('one-monthon:navigate'));
      window.scrollTo(0, 0);
      void updateContext();
    };
    const internalLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-route]') : null;
      if (!link || link.target) return;
      event.preventDefault();
      navigate(link.href);
    };
    onMounted(() => {
      addEventListener('popstate', sync);
      addEventListener('one-monthon:location-change', syncFromChild);
      void updateContext();
    });
    onBeforeUnmount(() => {
      removeEventListener('popstate', sync);
      removeEventListener('one-monthon:location-change', syncFromChild);
    });
    return { route, announcement, roadmapActive, workshopsActive, navigate, internalLink };
  },
  template: `
    <BasiqThemeProvider mode="light" class="theme-root" @click="internalLink">
      <a class="skip-link" href="#route-content">本文へ移動</a>
      <div class="app-shell">
        <aside class="site-sidebar">
          <a class="site-brand" href="/" data-route aria-label="1-Monthon ホーム">
            <span class="site-mark">1M</span>
            <span><strong>1-Monthon</strong><small>講習会アーカイブ</small></span>
          </a>

          <nav class="site-navigation" aria-label="メインナビゲーション">
            <p>学ぶ</p>
            <a href="/" data-route :aria-current="route.name === 'home' ? 'page' : undefined"><AppIcon name="home" /><span>ホーム</span></a>
            <a href="/workshops" data-route :aria-current="workshopsActive ? 'page' : undefined"><AppIcon name="search" /><span>講習会を探す</span></a>
            <a href="/workshops?view=roadmaps" data-route :aria-current="roadmapActive ? 'page' : undefined"><AppIcon name="map" /><span>ロードマップ</span></a>
            <a href="/users/demo-learner" data-route :aria-current="route.name === 'profile' ? 'page' : undefined"><AppIcon name="record" /><span>学びの記録</span></a>
          </nav>

          <div class="sidebar-operation">
            <p>運営</p>
            <BasiqButton class="sidebar-create" type="button" tone="neutral" variant="outline" @click="navigate('/admin/workshops/new')"><AppIcon name="edit" :size="18" />講習会を登録</BasiqButton>
          </div>
          <small class="sidebar-version">β · ローカル試用版</small>
        </aside>

        <div class="site-workspace">
          <header class="mobile-header"><a class="mobile-brand" href="/" data-route><span class="site-mark">1M</span><strong>1-Monthon</strong></a><span>{{ route.name === 'editor' ? '運営' : '講習会アーカイブ' }}</span></header>
          <p class="visually-hidden" aria-live="polite">{{ announcement }}</p>
          <div id="route-content" class="route-content">
            <HomeView v-if="route.name === 'home'" />
            <WorkshopListView v-else-if="route.name === 'workshops'" />
            <WorkshopDetailView v-else-if="route.name === 'workshop'" :key="'w' + route.id" :workshop-id="route.id" />
            <RoadmapDetailView v-else-if="route.name === 'roadmap'" :key="'r' + route.id" :roadmap-id="route.id" />
            <WorkshopEditorView v-else-if="route.name === 'editor'" :key="route.mode + (route.id ?? '')" :editor-mode="route.mode" :workshop-id="route.id ?? ''" @navigate="navigate" />
            <ProfileView v-else-if="route.name === 'profile'" :key="route.id" :user-id="route.id" />
            <main v-else class="page" tabindex="-1"><header class="page-heading"><div><h1>ページが見つかりません</h1><p>URLを確認してください。</p></div></header><a href="/workshops" data-route>講習会を探すへ戻る</a></main>
          </div>
        </div>
      </div>
    </BasiqThemeProvider>`,
});
