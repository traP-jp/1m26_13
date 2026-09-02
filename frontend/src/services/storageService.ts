import { INITIAL_LECTURES, INITIAL_ROADMAPS } from '@/mock/mockData';
import type { LectureSession, Roadmap } from '@/types/lecture';

const LECTURES_KEY = 'trap_lectures_data';
const ROADMAPS_KEY = 'trap_roadmaps_data';
const COMPLETED_KEY = 'trap_completed_lectures';

export const storageService = {
  getLectures(): LectureSession[] {
    const data = localStorage.getItem(LECTURES_KEY);
    if (!data) {
      localStorage.setItem(LECTURES_KEY, JSON.stringify(INITIAL_LECTURES));
      return INITIAL_LECTURES;
    }
    return JSON.parse(data);
  },

  getRoadmaps(): Roadmap[] {
    const data = localStorage.getItem(ROADMAPS_KEY);
    if (!data) {
      localStorage.setItem(ROADMAPS_KEY, JSON.stringify(INITIAL_ROADMAPS));
      return INITIAL_ROADMAPS;
    }
    return JSON.parse(data);
  },

  getCompletedSessionIds(): string[] {
    const data = localStorage.getItem(COMPLETED_KEY);
    return data ? JSON.parse(data) : [];
  },

  toggleCompletedSession(id: string): boolean {
    const completed = this.getCompletedSessionIds();
    const index = completed.indexOf(id);
    let isCompleted = false;
    if (index >= 0) {
      completed.splice(index, 1);
    } else {
      completed.push(id);
      isCompleted = true;
    }
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(completed));
    return isCompleted;
  }
};