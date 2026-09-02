export type Team = 'SysAd' | 'Game' | 'CTF' | 'Algorithm' | 'Kaggle' | 'Graphics' | 'Sound' | '融合系';

export type LectureFormat = '対面' | 'オンライン' | 'ハイブリッド' | 'アーカイブ/動画';

export interface LectureSession {
  id: string;
  seriesId: string;
  title: string;
  seriesTitle: string;
  sessionNumber: number;
  year: number;
  team: Team;
  instructors: string[];
  description: string;
  prerequisites?: string;
  targetAudience: string;
  format: LectureFormat;
  date?: string; // YYYY-MM-DD
  location?: string;
  materials: { title: string; url: string }[];
  recordingUrl?: string;
  roadmapIds: string[];
}

export interface Roadmap {
  id: string;
  title: string;
  description: string;
  team: Team;
  year: number;
  sessionIds: string[];
}

export interface SearchFilter {
  keyword: string;
  instructor: string;
  team: Team | '';
  year: number | null;
  startDate: string;
  endDate: string;
  format: LectureFormat | '';
  roadmapId: string; // 特定ロードマップでの絞り込み用
}