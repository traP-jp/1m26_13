import type { LectureSession, Roadmap } from '@/types/lecture';

export const INITIAL_LECTURES: LectureSession[] = [
  {
    id: '2026-sysad-web-1',
    seriesId: '2026-sysad-web',
    title: 'Webエンジニアになろう講習会 第1回',
    seriesTitle: 'Webエンジニアになろう講習会',
    sessionNumber: 1,
    year: 2026,
    team: 'SysAd',
    instructors: ['Lachite', 'quarantineeeeeeeeee'],
    description: 'Webフロントとバックエンドの基礎、Webエンジニアとしての基礎的な知識を広く浅く教えます。',
    prerequisites: '特別な事前知識は不要です。PCを持参してください。',
    targetAudience: 'SysAd班やWeb開発に興味がある新入生・在校生',
    format: '対面',
    date: '2026-06-09',
    location: 'S2-204',
    materials: [
      { title: '第1回実習資料', url: 'https://traptitech.github.io/naro-text/web_basic/1_frontend.html' }
    ],
    recordingUrl: 'https://youtu.be/-IzkoAQkST0',
    roadmapIds: ['roadmap-sysad-basic']
  },
  {
    id: '2026-sysad-web-2',
    seriesId: '2026-sysad-web',
    title: 'Webエンジニアになろう講習会 第2回',
    seriesTitle: 'Webエンジニアになろう講習会',
    sessionNumber: 2,
    year: 2026,
    team: 'SysAd',
    instructors: ['Lachite', 'quarantineeeeeeeeee'],
    description: 'Webバックエンド開発の基礎（HTTP通信、APIサーバ）を学びます。',
    prerequisites: '第1回の内容を理解していること。',
    targetAudience: 'SysAd班やWeb開発に興味がある人',
    format: '対面',
    date: '2026-06-10',
    location: 'S2-204',
    materials: [
      { title: '第2回実習資料', url: 'https://traptitech.github.io/naro-text/web_basic/2_backend.html' }
    ],
    recordingUrl: 'https://youtu.be/NTvn5l5a86o',
    roadmapIds: ['roadmap-sysad-basic']
  },
  {
    id: '2026-graphics-3dcg-1',
    seriesId: '2026-graphics-3dcg',
    title: '3DCG講習会 第1回',
    seriesTitle: '3DCG講習会',
    sessionNumber: 1,
    year: 2026,
    team: 'Graphics',
    instructors: ['Charararu', 'yabeeyatsu'],
    description: '座学で3DCGの基本を学んだ後、Blenderを用いて簡単なモデリングを行います。',
    prerequisites: 'Blenderを事前にインストールしておいてください。',
    targetAudience: '3DCGやBlenderに興味がある人',
    format: '対面',
    date: '2026-05-21',
    location: 'S2-203',
    materials: [],
    roadmapIds: []
  },
  {
    id: '2026-sound-0to1-0',
    seriesId: '2026-sound-0to1',
    title: 'サウンド0→1講習会 第0回',
    seriesTitle: 'サウンド0→1講習会',
    sessionNumber: 0,
    year: 2026,
    team: 'Sound',
    instructors: ['METCH722'],
    description: '今後のサウンド講習会の起点となる講習会です。DTMの導入と全体像を把握します。',
    prerequisites: '特になし',
    targetAudience: '作曲や音作りに興味のあるすべての会員',
    format: 'ハイブリッド',
    date: '2026-04-27',
    location: '対面/配信',
    materials: [
      { title: '概要資料', url: 'https://md.trap.jp/eF6o4CEzQFuHUJLjmKOnzA?view' }
    ],
    roadmapIds: ['roadmap-sound-starter']
  }
];

export const INITIAL_ROADMAPS: Roadmap[] = [
  {
    id: 'roadmap-sysad-basic',
    title: 'SysAdエンジニア初心者ロードマップ',
    description: 'ターミナル操作からWebアプリケーション開発までを網羅するおすすめロードマップです。',
    team: 'SysAd',
    year: 2026,
    sessionIds: ['2026-sysad-web-1', '2026-sysad-web-2']
  },
  {
    id: 'roadmap-sound-starter',
    title: 'サウンドクリエイター入門ロードマップ',
    description: 'DAWの基本操作から音楽理論までマスターするコースです。',
    team: 'Sound',
    year: 2026,
    sessionIds: ['2026-sound-0to1-0']
  }
];