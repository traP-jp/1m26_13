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
    format: ''
  });

  const filteredLectures = computed(() => {
    return lectures.value.filter((item) => {
      // キーワード検索（タイトル、概要、講師名）
      if (filter.value.keyword) {
        const kw = filter.value.keyword.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(kw);
        const matchDesc = item.description.toLowerCase().includes(kw);
        const matchInst = item.instructors.some((inst) => inst.toLowerCase().includes(kw));
        if (!matchTitle && !matchDesc && !matchInst) return false;
      }
      // 講師（高度な検索）
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
      // 日付範囲
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

  const resetFilter = () => {
    filter.value = {
      keyword: '',
      instructor: '',
      team: '',
      year: null,
      startDate: '',
      endDate: '',
      format: ''
    };
  };

  return {
    activeTab,
    isModalOpen,
    filter,
    filteredLectures,
    filteredRoadmaps,
    resetFilter
  };
}