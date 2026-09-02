import { ref, computed } from 'vue';
import { storageService } from '@/services/storageService';
import type { LectureSession, Roadmap, SearchFilter } from '@/types/lecture';

export function useSearch() {
  const activeTab = ref<'lectures' | 'roadmaps'>('lectures');
  const isModalOpen = ref(false);

  const lectures = ref<LectureSession[]>(storageService.getLectures());
  const roadmaps = ref<Roadmap[]>(storageService.getRoadmaps());

  const filter = ref<SearchFilter>({
    keyword: '',
    instructor: '',
    team: '',
    year: null,
    startDate: '',
    endDate: '',
    format: '',
    roadmapId: ''
  });

  const selectedRoadmap = computed(() => {
    if (!filter.value.roadmapId) return null;
    return roadmaps.value.find((r) => r.id === filter.value.roadmapId) || null;
  });

  const filteredLectures = computed(() => {
    return lectures.value.filter((item) => {
      // ロードマップによる絞り込み
      if (filter.value.roadmapId && !item.roadmapIds.includes(filter.value.roadmapId)) {
        return false;
      }
      // キーワード検索
      if (filter.value.keyword) {
        const kw = filter.value.keyword.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(kw);
        const matchDesc = item.description.toLowerCase().includes(kw);
        const matchInst = item.instructors.some((inst) => inst.toLowerCase().includes(kw));
        if (!matchTitle && !matchDesc && !matchInst) return false;
      }
      // 講師
      if (filter.value.instructor) {
        const instKw = filter.value.instructor.toLowerCase();
        if (!item.instructors.some((i) => i.toLowerCase().includes(instKw))) return false;
      }
      // 班
      if (filter.value.team && item.team !== filter.value.team) return false;
      // 年度
      if (filter.value.year && item.year !== filter.value.year) return false;
      // 形式
      if (filter.value.format && item.format !== filter.value.format) return false;
      // 日付
      if (filter.value.startDate && item.date && item.date < filter.value.startDate) return false;
      if (filter.value.endDate && item.date && item.date > filter.value.endDate) return false;

      return true;
    });
  });

  const filteredRoadmaps = computed(() => {
    return roadmaps.value.filter((item) => {
      if (filter.value.keyword) {
        const kw = filter.value.keyword.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(kw);
        const matchDesc = item.description.toLowerCase().includes(kw);
        if (!matchTitle && !matchDesc) return false;
      }
      if (filter.value.team && item.team !== filter.value.team) return false;
      if (filter.value.year && item.year !== filter.value.year) return false;
      return true;
    });
  });

  const selectRoadmapFilter = (roadmapId: string) => {
    filter.value.roadmapId = roadmapId;
    activeTab.value = 'lectures'; // 講習会一覧タブへ自動切替
  };

  const clearRoadmapFilter = () => {
    filter.value.roadmapId = '';
  };

  const resetFilter = () => {
    filter.value = {
      keyword: '',
      instructor: '',
      team: '',
      year: null,
      startDate: '',
      endDate: '',
      format: '',
      roadmapId: ''
    };
  };

  return {
    activeTab,
    isModalOpen,
    filter,
    selectedRoadmap,
    filteredLectures,
    filteredRoadmaps,
    selectRoadmapFilter,
    clearRoadmapFilter,
    resetFilter
  };
}