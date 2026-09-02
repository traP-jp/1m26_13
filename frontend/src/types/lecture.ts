export type Team = 'SysAd' | 'Game' | 'CTF' | 'Algorithm' | 'Kaggle' | 'Graphics' | 'Sound' | '融合系';

export type LectureFormat = '対面' | 'オンライン' | 'ハイブリッド' | 'アーカイブ/動画';

export interface LectureSession {
  id: string; // 例: "2026-sysad-web-1"
  seriesId: string; // 例: "2026-sysad-web"
  title: string; // 例: "Webエンジニアになろう講習会 第1回"
  seriesTitle: string; // 例: "Webエンジニアになろう講習会"
  sessionNumber: number; // 例: 1
  year: number; // 例: 2026
  season: '春' | '秋' | '通年';
  team: Team;
  instructors: string[]; // traQ ID (例: ["Lachite", "quarantineeeeeeeeee"])
  description: string;
  prerequisites?: string; // 参加前の準備
  targetAudience: string;
  format: LectureFormat;
  date?: string; // 例: "2026-06-09"
  location?: string; // 例: "S2-204"
  materials: { title: string; url: string }[];
  recordingUrl?: string;
  roadmapIds: string[]; // 含まれるロードマップID
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
}