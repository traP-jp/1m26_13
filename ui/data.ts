export type WorkshopStatus = "public" | "draft";
export type OccurrenceStatus = "planned" | "held" | "cancelled" | "postponed";
export type OccurrenceRelation = "single" | "alternative" | "sequence" | "rebroadcast";
export type ResourceType = "material" | "video" | "practice" | "source" | "repository";

export type WorkshopOperator = {
  kind: "user" | "group";
  id: string;
  name: string;
};

export type WorkshopRelationRef =
  | { kind: "workshop"; workshopId: string }
  | { kind: "text"; text: string };

export type WorkshopResource = {
  id: string;
  type: ResourceType;
  title: string;
  url: string | null;
  note?: string;
  occurrenceId?: string;
};

export type Occurrence = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  mode: "offline" | "online" | "hybrid" | "undecided";
  place: string;
  instructor: string;
  relation: OccurrenceRelation;
  status: OccurrenceStatus;
  knoqUrl: string;
};

export type Revision = {
  at: string;
  by: string;
  summary: string;
};

export type Workshop = {
  id: string;
  lineageId: string;
  title: string;
  year: number;
  status: WorkshopStatus;
  summary: string;
  outcome: string;
  audience: string;
  prerequisites: string;
  preparation: string;
  howToLearn: string;
  team: string;
  operators: WorkshopOperator[];
  targetTeams: string[];
  isZeroToOne: boolean | null;
  previousTextRefs: WorkshopRelationRef[];
  prerequisiteRefs: WorkshopRelationRef[];
  recommendedRefs: WorkshopRelationRef[];
  contact: string;
  tags: string[];
  creators: string[];
  previousIds: string[];
  occurrences: Occurrence[];
  resources: WorkshopResource[];
  sourceUrl: string;
  sourceLabel: string;
  revisions: Revision[];
};

const wiki2026 = "https://wiki.trap.jp/Event/welcome/26/lecture";

type WorkshopWithOptionalStepOneFields = Omit<
  Workshop,
  | "operators"
  | "targetTeams"
  | "isZeroToOne"
  | "previousTextRefs"
  | "prerequisiteRefs"
  | "recommendedRefs"
> & Partial<Pick<
  Workshop,
  | "operators"
  | "targetTeams"
  | "isZeroToOne"
  | "previousTextRefs"
  | "prerequisiteRefs"
  | "recommendedRefs"
>>;

const isOperator = (value: unknown): value is WorkshopOperator => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<WorkshopOperator>;
  return (candidate.kind === "user" || candidate.kind === "group")
    && typeof candidate.id === "string"
    && typeof candidate.name === "string";
};

const isRelationRef = (value: unknown): value is WorkshopRelationRef => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<WorkshopRelationRef> & { workshopId?: unknown; text?: unknown };
  return (candidate.kind === "workshop" && typeof candidate.workshopId === "string")
    || (candidate.kind === "text" && typeof candidate.text === "string");
};

/** Adds Step 1 defaults to seed data and drafts saved before these fields existed. */
export const normalizeWorkshop = (workshop: WorkshopWithOptionalStepOneFields): Workshop => ({
  ...workshop,
  operators: Array.isArray(workshop.operators) ? workshop.operators.filter(isOperator) : [],
  targetTeams: Array.isArray(workshop.targetTeams)
    ? workshop.targetTeams.filter((team): team is string => typeof team === "string")
    : [],
  isZeroToOne: typeof workshop.isZeroToOne === "boolean" ? workshop.isZeroToOne : false,
  previousTextRefs: Array.isArray(workshop.previousTextRefs)
    ? workshop.previousTextRefs.filter(
      (reference): reference is Extract<WorkshopRelationRef, { kind: "text" }> => (
        isRelationRef(reference) && reference.kind === "text"
      ),
    )
    : [],
  prerequisiteRefs: Array.isArray(workshop.prerequisiteRefs)
    ? workshop.prerequisiteRefs.filter(isRelationRef)
    : [],
  recommendedRefs: Array.isArray(workshop.recommendedRefs)
    ? workshop.recommendedRefs.filter(isRelationRef)
    : [],
});

export const getAcademicYear = (date = new Date()): number => (
  date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1
);

const seedWorkshopRecords: WorkshopWithOptionalStepOneFields[] = [
  {
    id: "git-2024",
    lineageId: "git-intro",
    title: "2024年度 Git講習会",
    year: 2024,
    status: "public",
    summary: "Gitの目的と仕組み、commit・push・Pull Requestなど、共同開発に必要な基本操作を学びます。",
    outcome: "Gitの基本操作を理解し、ハッカソンやプロジェクトの共同開発を始められる。",
    audience: "Git未経験の新入部員、チーム開発を始めたい人",
    prerequisites: "特になし",
    preparation: "PCを持参し、GitHubアカウントを用意してください。",
    howToLearn: "掲載されている資料を上から順に読み、手元のPCで操作してください。",
    team: "班横断",
    contact: "",
    tags: ["Git", "GitHub", "新入生向け"],
    creators: [],
    previousIds: [],
    occurrences: [
      {
        id: "git-2024-a",
        title: "第1日程",
        description: "Gitの基本操作とGitHubを使った共同開発（同内容の日程）",
        date: "",
        time: "",
        mode: "undecided",
        place: "",
        instructor: "",
        relation: "alternative",
        status: "held",
        knoqUrl: "",
      },
      {
        id: "git-2024-b",
        title: "第2日程",
        description: "Gitの基本操作とGitHubを使った共同開発（同内容の日程）",
        date: "",
        time: "",
        mode: "undecided",
        place: "",
        instructor: "",
        relation: "alternative",
        status: "held",
        knoqUrl: "",
      },
    ],
    resources: [
      { id: "git24-slide", type: "material", title: "座学編", url: "https://trap-jp.github.io/git-lecture-slide/" },
      { id: "git24-practice", type: "practice", title: "実習編", url: "https://git-lecture.trap.show/" },
    ],
    sourceUrl: "https://wiki.trap.jp/Event/welcome/24/Git講習会",
    sourceLabel: "traP Wiki「2024 Git講習会」",
    revisions: [],
  },
  {
    id: "git-2025",
    lineageId: "git-intro",
    title: "2025年度 Git講習会",
    year: 2025,
    status: "public",
    summary: "traPの開発活動や部内ハッカソンで使うGitの基本操作を学ぶ0→1講習会です。",
    outcome: "変更を記録し、ブランチとPull Requestを使った共同開発に参加できる。",
    audience: "Gitを初めて使う新入生",
    prerequisites: "特になし",
    preparation: "PC、Git、GitHubアカウント",
    howToLearn: "公開されている実習資料を使って学べます。開催時の動画は出典では確認できません。",
    team: "SysAd班",
    contact: "",
    tags: ["Git", "GitHub", "新入生向け"],
    creators: [],
    previousIds: ["git-2024"],
    occurrences: [
      {
        id: "git-2025-a",
        title: "第1日程",
        description: "同じ内容で開かれた2日程のうちの1つ（日時・形式は未確認）",
        date: "",
        time: "",
        mode: "undecided",
        place: "",
        instructor: "",
        relation: "alternative",
        status: "held",
        knoqUrl: "",
      },
      {
        id: "git-2025-b",
        title: "第2日程",
        description: "同じ内容で開かれた2日程のうちの1つ（日時・形式は未確認）",
        date: "",
        time: "",
        mode: "undecided",
        place: "",
        instructor: "",
        relation: "alternative",
        status: "held",
        knoqUrl: "",
      },
    ],
    resources: [
      { id: "git25-material", type: "practice", title: "実習資料", url: "https://git-lecture.trap.show/", note: "公開教材" },
    ],
    sourceUrl: "https://trap.jp/post/2597/",
    sourceLabel: "traP公式ブログ「2025年度 Git講習会」",
    revisions: [],
  },
  {
    id: "git-2026",
    lineageId: "git-intro",
    title: "2026年度 Git講習会",
    year: 2026,
    status: "public",
    summary: "Gitの基本と、Gitea・GitHubを使った共同開発の進め方を、実際に手を動かしながら学びます。",
    outcome: "traPの開発で必要なGit操作を理解し、チーム開発を始められる。",
    audience: "ゲーム制作・システム開発など、traPで開発活動に参加する人",
    prerequisites: "特になし",
    preparation: "プログラミング基礎講習会テキストの第0章（環境構築）と第1章（ターミナル）を先に進めてください。",
    howToLearn: "公開されている実習資料を上から順に進めます。2026年度の配信動画は出典では確認できません。",
    team: "SysAd班",
    contact: "",
    tags: ["Git", "GitHub", "新入生向け"],
    creators: [],
    previousIds: ["git-2025"],
    occurrences: [
      {
        id: "git-2026-a",
        title: "第1日程",
        description: "Gitの基本とGitea・GitHubの使い方",
        date: "2026-05-13",
        time: "9–10限",
        mode: "undecided",
        place: "",
        instructor: "",
        relation: "alternative",
        status: "held",
        knoqUrl: "https://knoq.trap.jp/events/62907eda-54c5-41ca-ba1a-9f4943e57385",
      },
      {
        id: "git-2026-b",
        title: "再放送",
        description: "第1日程と同じ内容の再放送",
        date: "2026-05-19",
        time: "9–10限",
        mode: "undecided",
        place: "",
        instructor: "",
        relation: "rebroadcast",
        status: "held",
        knoqUrl: "https://knoq.trap.jp/events/00961676-af6f-4ae8-b76d-9619a7c1870a",
      },
    ],
    resources: [
      { id: "git26-practice", type: "practice", title: "Git講習会 実習資料", url: "https://git-lecture.trap.show/", note: "公開教材" },
      { id: "git26-source", type: "source", title: "2026年度 0→1講習会一覧（出典）", url: wiki2026, note: "開催情報の出典" },
    ],
    sourceUrl: wiki2026,
    sourceLabel: "traP Wiki「2026年度0→1講習会一覧」",
    revisions: [],
  },
  {
    id: "web-2025",
    lineageId: "web-engineer",
    title: "2025年度 Webエンジニアになろう講習会",
    year: 2025,
    status: "public",
    summary: "Web開発の基礎から、認証・セキュリティ・テスト・Dockerまでを全8回で学ぶ講習会です。",
    outcome: "Webアプリのフロントエンドとサーバーを作り、データベースや開発運用を扱えるようになる。",
    audience: "SysAd班への参加を希望している人、Web開発に興味がある人",
    prerequisites: "プログラミング基礎・Web基礎・Git講習会の受講を推奨。第5回以降は第一部の知識が必要です。",
    preparation: "PCを用意し、第1回の実習資料に従って開発環境を構築します。",
    howToLearn: "各回の座学資料または動画を確認してから、対応する実習資料を進めます。",
    team: "SysAd班",
    contact: "",
    tags: ["Web", "フロントエンド", "実習"],
    creators: [],
    previousIds: [],
    occurrences: [
      { id: "web25-1", title: "第1回 環境構築", description: "開発環境の準備とGoのHello World", date: "2025-06-07", time: "9–10限", mode: "offline", place: "S2-204", instructor: "akimo", relation: "sequence", status: "held", knoqUrl: "https://knoq.trap.jp/events/729a6343-745d-4f30-995c-841c626658a6" },
      { id: "web25-2", title: "第2回 フロントエンド", description: "Vueを使ったフロントエンド開発", date: "2025-06-11", time: "5–6限", mode: "offline", place: "I3-107", instructor: "kitsne", relation: "sequence", status: "held", knoqUrl: "https://knoq.trap.jp/events/65b2c0dd-fb92-42ca-8203-a095b9457a35" },
      { id: "web25-3", title: "第3回 サーバーアプリケーション", description: "GoによるサーバーとJSON API", date: "2025-06-13", time: "9–10限", mode: "offline", place: "S2-204", instructor: "matsun", relation: "sequence", status: "held", knoqUrl: "https://knoq.trap.jp/events/4ab3239d-953e-4c3f-9e1d-9289b907d3b9" },
      { id: "web25-4", title: "第4回 データベース", description: "SQLとサーバーからのデータベース利用", date: "2025-06-16", time: "9–10限", mode: "offline", place: "S2-204", instructor: "Kentaro1043", relation: "sequence", status: "held", knoqUrl: "https://knoq.trap.jp/events/c94889e4-3a04-4c86-86d8-599214cf0a0f" },
      { id: "web25-5", title: "第5回 認証・認可", description: "アカウントとセッション", date: "2025-09-16", time: "21:00〜", mode: "online", place: "Discord SysAd", instructor: "matsun", relation: "sequence", status: "held", knoqUrl: "https://knoq.trap.jp/events/8d91328f-04d1-4aa3-b470-1104e2e88c23" },
      { id: "web25-6", title: "第6回 セキュリティ入門", description: "ブラウザからサーバーへの通信", date: "2025-09-18", time: "21:00〜", mode: "online", place: "Discord SysAd", instructor: "Kentaro1043", relation: "sequence", status: "held", knoqUrl: "https://knoq.trap.jp/events/074960ff-5724-47c9-95e4-fe4f6b6931ba" },
      { id: "web25-7", title: "第7回 テスト・CI/CD", description: "テストと自動実行", date: "2025-09-21", time: "21:00〜", mode: "online", place: "Discord SysAd", instructor: "akimo", relation: "sequence", status: "held", knoqUrl: "https://knoq.trap.jp/events/be6fc8a1-79a8-4fba-9e6a-4d9241d520ab" },
      { id: "web25-8", title: "第8回 Docker", description: "DockerとDocker Compose", date: "2025-09-24", time: "21:00〜", mode: "online", place: "Discord SysAd", instructor: "kitsne", relation: "sequence", status: "held", knoqUrl: "https://knoq.trap.jp/events/716f6ef9-212f-4820-bc01-1f83790392f8" },
    ],
    resources: [
      { id: "web25-source", type: "source", title: "講習会Wikiページ", url: "https://wiki.trap.jp/Event/lecture/25/Webエンジニアになろう講習会", note: "開催情報と全リンクの出典" },
      { id: "web25-part1", type: "material", title: "第一部 座学資料 v1.5.1", url: "https://github.com/traPtitech/naro-text/releases/tag/v1.5.1" },
      { id: "web25-part2", type: "material", title: "第二部 座学資料 v1.7.1", url: "https://github.com/traPtitech/naro-text/releases/tag/v1.7.1" },
      { id: "web25-video-1", type: "video", title: "第1回 YouTube", url: "https://youtube.com/live/muxIyy8YYGc", occurrenceId: "web25-1" },
      { id: "web25-practice-1", type: "practice", title: "環境構築（Windows）", url: "https://traptitech.github.io/naro-text/chapter1/section1/0_setup-windows.html", occurrenceId: "web25-1" },
      { id: "web25-video-2", type: "video", title: "第2回 YouTube", url: "https://youtube.com/live/-708z26lgHg", occurrenceId: "web25-2" },
      { id: "web25-practice-2", type: "practice", title: "Vue入門", url: "https://traptitech.github.io/naro-text/chapter1/section2/0_vue-intro.html", occurrenceId: "web25-2" },
      { id: "web25-video-3", type: "video", title: "第3回 YouTube", url: "https://youtube.com/live/qzfU461_J7E", occurrenceId: "web25-3" },
      { id: "web25-practice-3", type: "practice", title: "サーバーアプリケーションを作ってみよう", url: "https://traptitech.github.io/naro-text/chapter1/section3/0_hello-server.html", occurrenceId: "web25-3" },
      { id: "web25-video-4", type: "video", title: "第4回 YouTube", url: "https://youtube.com/live/kOU3-PpYI0Q?feature=share", occurrenceId: "web25-4" },
      { id: "web25-practice-4", type: "practice", title: "SQLで遊ぶ", url: "https://traptitech.github.io/naro-text/chapter1/section4/1_sql.html", occurrenceId: "web25-4" },
      { id: "web25-practice-5", type: "practice", title: "アカウント機能の実装", url: "https://traptitech.github.io/naro-text/chapter2/section1/1_account.html", occurrenceId: "web25-5" },
      { id: "web25-practice-6", type: "practice", title: "サーバーとの通信", url: "https://traptitech.github.io/naro-text/chapter2/section2/2_fetch.html", occurrenceId: "web25-6" },
      { id: "web25-practice-7", type: "practice", title: "テストを書いてみよう", url: "https://traptitech.github.io/naro-text/chapter2/section3/0_test.html", occurrenceId: "web25-7" },
      { id: "web25-practice-8", type: "practice", title: "Docker Composeを使う", url: "https://traptitech.github.io/naro-text/chapter2/section4/2_compose.html", occurrenceId: "web25-8" },
    ],
    sourceUrl: "https://wiki.trap.jp/Event/lecture/25/Webエンジニアになろう講習会",
    sourceLabel: "traP Wiki「Webエンジニアになろう講習会」",
    revisions: [],
  },
  {
    id: "ml-2022",
    lineageId: "machine-learning-intro",
    title: "2022 機械学習講習会",
    year: 2022,
    status: "public",
    summary: "機械学習の雰囲気をつかみ、最後に部内データ分析コンペへ参加する全8回の講習会です。",
    outcome: "Pythonでデータを処理し、代表的な機械学習ライブラリを使ってデータ分析コンペに取り組める。",
    audience: "機械学習を触ってみたい人、機械学習コンペに参加してみたい人",
    prerequisites: "第1回以降は、Pythonを一通り使えることを前提とします。",
    preparation: "Google Colabを利用できるようにし、必要なら先にPython入門の講習会を受講します。",
    howToLearn: "第0回から順に座学資料を確認し、各回に対応するColabの実習を進めます。",
    team: "",
    contact: "#event/workshop/DacQ/sodan",
    tags: ["機械学習", "Python", "演習"],
    creators: [],
    previousIds: [],
    occurrences: [
      { id: "ml22-0", title: "第0回 全体像", description: "扱う範囲、機械学習、データ分析コンペ", date: "2022-05-26", time: "21:00〜", mode: "online", place: "", instructor: "idaten", relation: "sequence", status: "held", knoqUrl: "" },
      { id: "ml22-1", title: "第1回 環境構築", description: "Google ColabとPython", date: "2022-06-13", time: "20:00〜", mode: "online", place: "", instructor: "YumizSui", relation: "sequence", status: "held", knoqUrl: "" },
      { id: "ml22-2", title: "第2回 手書き文字認識", description: "数字を認識してみよう", date: "2022-06-16", time: "20:30〜", mode: "online", place: "", instructor: "Wakattaa", relation: "sequence", status: "held", knoqUrl: "" },
      { id: "ml22-3", title: "第3回 データ処理 1", description: "pandas・NumPy・scikit-learn", date: "2022-06-20", time: "20:00〜", mode: "online", place: "", instructor: "sea314", relation: "sequence", status: "held", knoqUrl: "" },
      { id: "ml22-4", title: "第4回 データ処理 2", description: "scikit-learn・matplotlib", date: "2022-06-23", time: "20:30〜", mode: "online", place: "", instructor: "Facish", relation: "sequence", status: "held", knoqUrl: "" },
      { id: "ml22-5", title: "第5回 自然言語処理", description: "PyTorchと自然言語処理", date: "2022-06-27", time: "20:00〜", mode: "online", place: "", instructor: "Silviase", relation: "sequence", status: "held", knoqUrl: "" },
      { id: "ml22-6", title: "第6回 コンペの進め方", description: "データコンペで取り組むこととTips", date: "2022-06-30", time: "20:00〜", mode: "online", place: "", instructor: "abap34", relation: "sequence", status: "held", knoqUrl: "" },
      { id: "ml22-final", title: "最終回 データ分析コンペ", description: "部内データ分析コンペ", date: "", time: "", mode: "online", place: "", instructor: "", relation: "sequence", status: "held", knoqUrl: "" },
    ],
    resources: [
      { id: "ml22-source", type: "source", title: "講習会Wikiページ", url: "https://wiki.trap.jp/Event/welcome/22/lecture/機械学習講習会", note: "開催情報と全リンクの出典" },
      { id: "ml22-material-0", type: "material", title: "第0回 座学資料", url: "https://drive.trap.jp/apps/files/?dir=/%E9%83%A8%E5%86%85%E5%85%B1%E6%9C%89/workshop/2022%E5%B9%B4%E5%BA%A6%E6%A9%9F%E6%A2%B0%E5%AD%A6%E7%BF%92%E8%AC%9B%E7%BF%92%E4%BC%9A&fileid=973913", occurrenceId: "ml22-0" },
      { id: "ml22-practice-1", type: "practice", title: "第1回 Colab実習", url: "https://colab.research.google.com/drive/1mCpoax7rXYYuA2clu3p6xMkOGqePczM1?usp=sharing", occurrenceId: "ml22-1" },
      { id: "ml22-practice-2", type: "practice", title: "第2回 手書き文字認識", url: "https://colab.research.google.com/drive/19OLnN0DjireVdh9pzOyx6_teNsgHtpJO?usp=sharing", occurrenceId: "ml22-2" },
      { id: "ml22-practice-3", type: "practice", title: "第3回 NumPy・pandas練習", url: "https://colab.research.google.com/drive/1pGH8tj_f_s9IWLv8hFcdQ3EbgCGgpMBI?usp=sharing", occurrenceId: "ml22-3" },
      { id: "ml22-practice-4", type: "practice", title: "第4回 実習", url: "https://colab.research.google.com/drive/1bkRUJ8QVd3u_lADzO3wqRnpma0PrCbMW#scrollTo=fuPZ5afZ0dtx", occurrenceId: "ml22-4" },
      { id: "ml22-material-5", type: "material", title: "第5回 NLP座学", url: "https://docs.google.com/presentation/d/1UJZNMPxOKykd8_CLm-w1f_KlTuDSU6kSASxlQaRXNTc/edit?usp=sharing", occurrenceId: "ml22-5" },
      { id: "ml22-practice-5", type: "practice", title: "第5回 NLPハンズオン", url: "https://colab.research.google.com/drive/1naoBuXXjHLhTmTEcNHeHTRcsTGpoSgaV?usp=sharing", occurrenceId: "ml22-5" },
    ],
    sourceUrl: "https://wiki.trap.jp/Event/welcome/22/lecture/機械学習講習会",
    sourceLabel: "traP Wiki「2022 機械学習講習会」",
    revisions: [],
  },
  {
    id: "pg-basic-2026",
    lineageId: "programming-basic",
    title: "2026 プログラミング基礎講習会",
    year: 2026,
    status: "public",
    summary: "複数回の講義と演習を通して、プログラミングの基礎を身につける講習会です。",
    outcome: "基本的なプログラムを読み書きし、より専門的な講習会へ進む準備ができる。",
    audience: "プログラミングを基礎から学びたい新入生",
    prerequisites: "特になし",
    preparation: "PC、開発環境、traQ。回ごとの案内を確認してください。",
    howToLearn: "公開テキストを読みながら、第1回から第4回の配信動画を順に視聴します。",
    team: "班横断",
    contact: "",
    tags: ["プログラミング", "基礎", "新入生向け"],
    creators: [],
    previousIds: [],
    occurrences: [
      { id: "pg26-1", title: "第1回", description: "環境構築", date: "2026-04-30", time: "7–8限", mode: "offline", place: "", instructor: "", relation: "sequence", status: "held", knoqUrl: "https://knoq.trap.jp/events/9865a7c8-9a30-4b6b-a863-d1c614011bbf" },
      { id: "pg26-2", title: "第1回（再）", description: "環境構築（第1回と同内容）", date: "2026-05-01", time: "7–8限", mode: "offline", place: "", instructor: "", relation: "rebroadcast", status: "held", knoqUrl: "https://knoq.trap.jp/events/cb64d6ac-845c-4938-b09f-3505ba45ed2c" },
      { id: "pg26-3", title: "第2回", description: "変数・入出力・演算子", date: "2026-05-07", time: "7–8限", mode: "offline", place: "", instructor: "", relation: "sequence", status: "held", knoqUrl: "https://knoq.trap.jp/events/37caa25a-ed78-4d5d-a424-65c93985a0f8" },
      { id: "pg26-4", title: "第2回（再）", description: "変数・入出力・演算子（第2回と同内容）", date: "2026-05-08", time: "7–8限", mode: "offline", place: "", instructor: "", relation: "rebroadcast", status: "held", knoqUrl: "https://knoq.trap.jp/events/12954f8f-65ae-40fa-8286-4901d03b1072" },
      { id: "pg26-5", title: "休日日程", description: "第1回から第4回までを1日で扱う日程", date: "2026-05-09", time: "10:00–18:00", mode: "offline", place: "", instructor: "", relation: "alternative", status: "held", knoqUrl: "https://knoq.trap.jp/events/33221355-2505-4d03-afce-b7ba1a558f9a" },
      { id: "pg26-6", title: "休日日程（再）", description: "第1回から第4回までを1日で扱う再放送", date: "2026-05-10", time: "10:00–18:00", mode: "offline", place: "", instructor: "", relation: "rebroadcast", status: "held", knoqUrl: "https://knoq.trap.jp/events/566961c5-d1cd-4a50-90b4-a5486b5eded5" },
      { id: "pg26-7", title: "第3回", description: "配列・繰り返し", date: "2026-05-11", time: "7–8限", mode: "offline", place: "", instructor: "", relation: "sequence", status: "held", knoqUrl: "https://knoq.trap.jp/events/a0967cf8-57c8-4f96-945d-9fd8f9372451" },
      { id: "pg26-8", title: "第3回（再）", description: "配列・繰り返し（第3回と同内容）", date: "2026-05-12", time: "7–8限", mode: "offline", place: "", instructor: "", relation: "rebroadcast", status: "held", knoqUrl: "https://knoq.trap.jp/events/8765b6d7-4f73-4070-9e71-e6aa1b9df9ac" },
      { id: "pg26-9", title: "第4回", description: "関数・構造体", date: "2026-05-14", time: "7–8限", mode: "offline", place: "", instructor: "", relation: "sequence", status: "held", knoqUrl: "https://knoq.trap.jp/events/72f53c51-8694-4d4d-8930-971e6f107a15" },
      { id: "pg26-10", title: "第4回（再）", description: "関数・構造体（第4回と同内容）", date: "2026-05-15", time: "7–8限", mode: "offline", place: "", instructor: "", relation: "rebroadcast", status: "held", knoqUrl: "https://knoq.trap.jp/events/5ecd4c74-19a7-42cf-984f-c3e733cf8b6d" },
    ],
    resources: [
      { id: "pg26-source", type: "source", title: "運営記録（出典）", url: "https://md.trap.jp/iRTsuoN2TSuADRShMmxz1A", note: "運営情報の出典であり、受講用教材ではありません" },
      { id: "pg26-text", type: "material", title: "プログラミング基礎講習会テキスト", url: "https://pg-basic.trap.show/", note: "公開教材" },
      { id: "pg26-repository", type: "repository", title: "テキストのGitHub", url: "https://github.com/traP-jp/pg-basic" },
      { id: "pg26-video-1", type: "video", title: "第1回 YouTube配信", url: "https://youtube.com/watch?v=6KLgt8cMuY0", occurrenceId: "pg26-1" },
      { id: "pg26-video-2", type: "video", title: "第2回 YouTube配信", url: "https://youtube.com/watch?v=PyLXarjQNZU", occurrenceId: "pg26-3" },
      { id: "pg26-video-3", type: "video", title: "第3回 YouTube配信", url: "https://youtube.com/watch?v=RTOW9ms0CWA", occurrenceId: "pg26-7" },
      { id: "pg26-video-4", type: "video", title: "第4回 YouTube配信", url: "https://youtube.com/watch?v=tfYT-T9w8Ec", occurrenceId: "pg26-9" },
    ],
    sourceUrl: "https://md.trap.jp/iRTsuoN2TSuADRShMmxz1A",
    sourceLabel: "traP MD「プログラミング基礎講習会の運営」（出典・受講教材ではありません）",
    revisions: [],
  },
  {
    id: "algorithm-2025",
    lineageId: "algorithm-basic",
    title: "2025 アルゴリズム基礎講習会",
    year: 2025,
    status: "public",
    summary: "アルゴリズム班が開催した基礎講習会の開催記録です。",
    outcome: "アルゴリズム分野の基本的な考え方に触れる。",
    audience: "アルゴリズムに興味がある人",
    prerequisites: "記録からは確認できません",
    preparation: "記録からは確認できません",
    howToLearn: "このデモでは開催記録のみを登録しています。資料・動画の公開状況は出典では未確認です。",
    team: "Algorithm班",
    contact: "",
    tags: ["アルゴリズム", "基礎", "開催記録"],
    creators: [],
    previousIds: [],
    occurrences: [
      { id: "algo25-1", title: "第1回", description: "開催記録（日時は出典で確認済み、その他の詳細は未確認）", date: "2025-05-12", time: "", mode: "undecided", place: "", instructor: "", relation: "sequence", status: "held", knoqUrl: "" },
      { id: "algo25-2", title: "第2回", description: "開催枠（日時・形式・個別内容は未確認）", date: "", time: "", mode: "undecided", place: "", instructor: "", relation: "sequence", status: "held", knoqUrl: "" },
      { id: "algo25-3", title: "第3回", description: "開催枠（日時・形式・個別内容は未確認）", date: "", time: "", mode: "undecided", place: "", instructor: "", relation: "sequence", status: "held", knoqUrl: "" },
      { id: "algo25-4", title: "第4回", description: "開催枠（日時・形式・個別内容は未確認）", date: "", time: "", mode: "undecided", place: "", instructor: "", relation: "sequence", status: "held", knoqUrl: "" },
      { id: "algo25-5", title: "第5回", description: "開催枠（日時・形式・個別内容は未確認）", date: "", time: "", mode: "undecided", place: "", instructor: "", relation: "sequence", status: "held", knoqUrl: "" },
      { id: "algo25-6", title: "第6回", description: "開催枠（日時・形式・個別内容は未確認）", date: "", time: "", mode: "undecided", place: "", instructor: "", relation: "sequence", status: "held", knoqUrl: "" },
    ],
    resources: [
      { id: "algo25-record", type: "source", title: "第1回の開催記録（出典）", url: "https://wiki.trap.jp/teams/algorithm/events/2025/0512-アルゴリズム基礎講習会-1", note: "このデモでは第1回の出典のみ確認済み。資料・動画の有無は未確認です" },
    ],
    sourceUrl: "https://wiki.trap.jp/teams/algorithm/events/2025/0512-アルゴリズム基礎講習会-1",
    sourceLabel: "traP Wiki「アルゴリズム基礎講習会 開催記録」",
    revisions: [],
  },
  {
    id: "unity-2026",
    lineageId: "unity",
    title: "2026年度 真Unity講習会",
    year: 2026,
    status: "public",
    summary: "Unity講習会の履修者が、ゲーム制作力をさらに高めるための全5回の講習会です。",
    outcome: "Unityを使ったゲーム制作について、基礎講習会の先の内容を学べる。",
    audience: "Unity講習会を履修した上で、ゲーム制作力をさらに向上させたい人",
    prerequisites: "Unity講習会を履修済みであること",
    preparation: "特になし",
    howToLearn: "公開されている講習会資料を、第1回から順に進めます。",
    team: "ゲーム系",
    contact: "",
    tags: ["Unity", "ゲーム制作"],
    creators: [],
    previousIds: [],
    occurrences: [
      { id: "unity26-1", title: "第1回", description: "各回の内容は資料を参照", date: "2026-07-14", time: "15:25〜17:05", mode: "offline", place: "S2-202", instructor: "YMAC", relation: "sequence", status: "held", knoqUrl: "https://knoq.trap.jp/events/d14559e1-39cd-41bb-aafb-8ab7deaa1f6c" },
      { id: "unity26-2", title: "第2回", description: "各回の内容は資料を参照", date: "2026-07-15", time: "13:30〜15:10", mode: "offline", place: "S2-201", instructor: "yn", relation: "sequence", status: "held", knoqUrl: "https://knoq.trap.jp/events/951fad0e-98f0-4c6f-b7b4-3f172c2038c3" },
      { id: "unity26-3", title: "第3回", description: "各回の内容は資料を参照", date: "2026-07-16", time: "17:15〜18:55", mode: "offline", place: "S2-201", instructor: "zoi_dayo", relation: "sequence", status: "held", knoqUrl: "https://knoq.trap.jp/events/dc08476f-15f6-4922-894f-9f5676f21573" },
      { id: "unity26-4", title: "第4回", description: "各回の内容は資料を参照", date: "2026-07-17", time: "17:15〜18:55", mode: "offline", place: "S2-201", instructor: "Haru_18", relation: "sequence", status: "held", knoqUrl: "https://knoq.trap.jp/events/a1c06d64-e669-4f1f-a4cc-c5c64fec2daf" },
      { id: "unity26-5", title: "第5回", description: "各回の内容は資料を参照", date: "2026-07-22", time: "13:30〜15:25", mode: "offline", place: "S2-201", instructor: "Mimi_year", relation: "sequence", status: "held", knoqUrl: "https://knoq.trap.jp/events/15156cba-42be-481b-9707-b749f59a985a" },
    ],
    resources: [
      { id: "unity26-material", type: "material", title: "真Unity講習会 資料", url: "https://unity-lecture.trap.show/shin-text/" },
      { id: "unity26-source", type: "source", title: "2026年度講習会一覧", url: "https://wiki.trap.jp/Event/lecture/26", note: "開催情報の出典" },
    ],
    sourceUrl: "https://wiki.trap.jp/Event/lecture/26",
    sourceLabel: "traP Wiki「2026年度講習会一覧」",
    revisions: [],
  },
];

export const seedWorkshops: Workshop[] = seedWorkshopRecords.map(normalizeWorkshop);

export const cloneSeedWorkshops = (): Workshop[] => JSON.parse(JSON.stringify(seedWorkshops));

export const makeBlankWorkshop = (): Workshop => ({
  id: `draft-${Date.now()}`,
  lineageId: `new-${Date.now()}`,
  title: "",
  year: getAcademicYear(),
  status: "draft",
  summary: "",
  outcome: "",
  audience: "",
  prerequisites: "",
  preparation: "",
  howToLearn: "",
  team: "",
  operators: [],
  targetTeams: [],
  isZeroToOne: false,
  previousTextRefs: [],
  prerequisiteRefs: [],
  recommendedRefs: [],
  contact: "",
  tags: [],
  creators: ["rurun"],
  previousIds: [],
  occurrences: [
    {
      id: `occurrence-${Date.now()}`,
      title: "第1回",
      description: "",
      date: "",
      time: "",
      mode: "undecided",
      place: "",
      instructor: "",
      relation: "single",
      status: "planned",
      knoqUrl: "",
    },
  ],
  resources: [],
  sourceUrl: "",
  sourceLabel: "",
  revisions: [],
});

export const inheritWorkshop = (source: Workshop): Workshop => {
  const next = makeBlankWorkshop();
  next.lineageId = source.lineageId;
  next.title = source.title.replace(/(?:19|20)\d{2}(?:年度)?\s*/u, "").trim();
  next.summary = source.summary;
  next.outcome = source.outcome;
  next.audience = source.audience;
  next.prerequisites = source.prerequisites;
  next.preparation = source.preparation;
  next.howToLearn = "";
  next.team = source.team;
  next.operators = [];
  next.targetTeams = [...source.targetTeams];
  next.isZeroToOne = source.isZeroToOne;
  next.prerequisiteRefs = source.prerequisiteRefs.map((reference) => ({ ...reference }));
  next.recommendedRefs = source.recommendedRefs.map((reference) => ({ ...reference }));
  next.contact = "";
  next.tags = [...source.tags];
  next.previousIds = [source.id];
  next.occurrences = source.occurrences.map((occurrence, index) => ({
    ...occurrence,
    id: `occurrence-${Date.now()}-${index}`,
    date: "",
    time: "",
    mode: "undecided",
    place: "",
    instructor: "",
    knoqUrl: "",
    status: "planned",
  }));
  return next;
};
