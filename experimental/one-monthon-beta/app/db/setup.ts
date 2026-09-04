import { getD1 } from './index';
import { localMigrations } from './migrations';

const DEMO_USER_ID = 'demo-learner';
const FIRST_BADGE_ID = 'first-completion';

const seedWorkshops = [
  {
    id: 'web-basics',
    title: 'Web開発入門',
    summary: 'ブラウザとサーバーの役割から、最初のWebアプリまでを体験します。',
    description:
      'HTTP、HTML、CSS、JavaScriptの役割を小さな実装を通して確かめます。Web開発をどこから始めればよいか迷っている人向けです。',
    category: 'プログラミング',
  },
  {
    id: 'typescript-basics',
    title: 'TypeScript基礎',
    summary: '型を味方につけて、読みやすく安全なコードを書く考え方を学びます。',
    description:
      '基本的な型、関数、オブジェクト、型の絞り込みを扱います。小さな演習を重ね、エラーを実装の手がかりにする感覚を身につけます。',
    category: 'プログラミング',
  },
  {
    id: 'vue-ui',
    title: 'Vueで作るUI',
    summary: 'コンポーネントと状態を組み合わせ、使いやすい画面を作ります。',
    description:
      'Vue 3のComposition APIを使い、入力、一覧、状態変化のある小さなUIを実装します。TypeScriptの基礎知識があると進めやすい内容です。',
    category: 'プログラミング',
  },
  {
    id: 'first-lightning-talk',
    title: 'はじめてのLT',
    summary: '5分で伝えるテーマの絞り方と、発表までの準備を一緒に進めます。',
    description:
      '話したいことを一つに絞り、短い構成へ落とし込み、練習するところまでを扱います。発表経験がなくても参加できます。',
    category: 'コミュニケーション',
  },
];

let setupPromise: Promise<void> | undefined;

export function ensureDatabase(): Promise<void> {
  if (!setupPromise) {
    setupPromise = initializeDatabase().catch((error) => {
      setupPromise = undefined;
      throw error;
    });
  }
  return setupPromise;
}

async function initializeDatabase(): Promise<void> {
  const d1 = getD1();
  await d1.prepare('PRAGMA foreign_keys = ON').run();
  await d1
    .prepare(
      `CREATE TABLE IF NOT EXISTS alpha_schema_migrations (
        id TEXT PRIMARY KEY NOT NULL,
        applied_at TEXT NOT NULL
      )`,
    )
    .run();
  const applied = await d1
    .prepare('SELECT id FROM alpha_schema_migrations')
    .all<{ id: string }>();
  const appliedIds = new Set(applied.results.map((row) => row.id));
  for (const migration of localMigrations) {
    if (appliedIds.has(migration.id)) continue;
    if (migration.id === '0004_extended_beta_catalog') {
      // The original seed owns occurrence IDs 1-17. Install it first on a fresh
      // D1 so catalog occurrences can use normal auto-increment IDs safely.
      await seedDatabase();
      // D1 limits the compound result used for a large batch. This catalog is
      // deliberately replay-safe, so apply it in bounded batches and write the
      // ledger only after every batch succeeds.
      const chunkSize = 1;
      for (let index = 0; index < migration.statements.length; index += chunkSize) {
        try {
          await d1.batch(
            migration.statements
              .slice(index, index + chunkSize)
              .map((statement) => d1.prepare(statement)),
          );
        } catch (error) {
          throw new Error(`Failed to apply ${migration.id} statements ${index + 1}-${Math.min(index + chunkSize, migration.statements.length)}`, { cause: error });
        }
      }
      await d1
        .prepare('INSERT INTO alpha_schema_migrations (id, applied_at) VALUES (?, ?)')
        .bind(migration.id, new Date().toISOString())
        .run();
      continue;
    }
    await d1.batch([
      ...migration.statements.map((statement) => d1.prepare(statement)),
      d1
        .prepare('INSERT INTO alpha_schema_migrations (id, applied_at) VALUES (?, ?)')
        .bind(migration.id, new Date().toISOString()),
    ]);
  }
  await seedDatabase();
  await d1.prepare('PRAGMA optimize').run();
}

export async function seedDatabase(): Promise<void> {
  const d1 = getD1();
  const now = new Date().toISOString();
  const betaSeeded = await d1
    .prepare('SELECT id FROM beta_seed_state WHERE id = ?')
    .bind('beta-v1')
    .first<{ id: string }>();
  const statements: D1PreparedStatement[] = [
    d1
      .prepare('INSERT OR IGNORE INTO users (id, display_name, created_at) VALUES (?, ?, ?)')
      .bind(DEMO_USER_ID, 'まなび手さん', now),
    d1
      .prepare(
        'INSERT OR IGNORE INTO badges (id, name, description, required_completion_count) VALUES (?, ?, ?, ?)',
      )
      .bind(FIRST_BADGE_ID, 'はじめの一歩', '最初の講習会を完了した証です。', 1),
  ];

  for (const workshop of seedWorkshops) {
    statements.push(
      d1
        .prepare(
          `INSERT OR IGNORE INTO workshops
           (id, title, summary, description, category, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          workshop.id,
          workshop.title,
          workshop.summary,
          workshop.description,
          workshop.category,
          now,
          now,
        ),
    );
  }

  statements.push(
    d1
      .prepare(
        `INSERT OR IGNORE INTO workshop_relations
         (prerequisite_id, successor_id, created_at) VALUES (?, ?, ?)`,
      )
      .bind('web-basics', 'typescript-basics', now),
    d1
      .prepare(
        `INSERT OR IGNORE INTO workshop_relations
         (prerequisite_id, successor_id, created_at) VALUES (?, ?, ?)`,
      )
      .bind('typescript-basics', 'vue-ui', now),
  );

  if (!betaSeeded) {
    const betaWorkshops = [
    [1, 'はじめてのGit', 'Gitの基本操作を、手元で試しながら身につける1回完結の講習会です。'],
    [2, 'Webエンジニアになろう', 'Web開発の入口からUI実装までを順に学ぶ複数回講習会です。'],
    [3, 'プログラミング基礎講習会', 'プログラムの読み書きを基礎から練習します。再放送の教材も残しています。'],
    [4, '次年度ネットワーク講習会', '運営が準備中の下書きです。'],
    [5, 'Unity講習会', 'ゲーム制作の基本を、3回の講習会で順に学びます。'],
    [6, 'Blender入門', '3Dモデルを作り、画像として書き出すまでを体験します。'],
    [7, 'Live2D入門', 'イラストを動かすためのパーツ分けと基本操作を学びます。'],
    [8, 'DTM入門', '短い楽曲を題材に、打ち込みとミックスの基本を学びます。'],
    [9, 'CTF入門', '問題演習を通して、セキュリティの基礎的な考え方を学びます。'],
    [10, '競技プログラミング入門', '典型的な問題を解きながら、アルゴリズムの考え方に触れます。'],
    [11, 'デザイン基礎', '情報の優先度と余白を整理し、伝わる画面を組み立てます。'],
  ] as const;
  for (const workshop of betaWorkshops) {
    statements.push(
      d1.prepare(
        `INSERT OR IGNORE INTO beta_workshops (id, title, summary, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).bind(workshop[0], workshop[1], workshop[2], now, now),
    );
  }

  const occurrences = [
    [1, 1, 1, 'standard', null, null, 'リポジトリを作り、変更を記録して共有するまでを演習します。', 'SysAd班', 2026, '2026-04-18T05:00:00.000Z', '部室', 'Git講習会運営', 'Gitを初めて使う人', 'PCでターミナルを開けること', 'https://git-scm.com/book/ja/v2', '教材を開く', 'published'],
    [2, 2, 1, 'standard', null, '第1回 Webのしくみ', 'ブラウザ、HTTP、サーバーの関係を小さな実験で確かめます。', 'Webエンジニア班', 2026, '2026-05-10T04:00:00.000Z', '講義室A', 'Web講習会運営', 'Web開発を始めたい人', '特になし', 'https://developer.mozilla.org/ja/docs/Learn_web_development', '第1回教材', 'published'],
    [3, 2, 2, 'standard', null, '第2回 HTMLとCSS', '意味のあるHTMLと、読みやすいCSSで1ページを組み立てます。', 'Webエンジニア班', 2026, '2026-05-17T04:00:00.000Z', '講義室A', 'Web講習会運営', '第1回を終えた人', 'Webの基本用語', 'https://developer.mozilla.org/ja/docs/Learn_web_development/Core/Structuring_content', '第2回教材', 'published'],
    [4, 2, 3, 'standard', null, '第3回 VueでUIを作る', 'Vueの状態とコンポーネントを使い、小さな画面を実装します。', 'Webエンジニア班', 2026, '2026-05-24T04:00:00.000Z', '講義室A', 'Web講習会運営', 'HTMLとCSSを書いたことがある人', '第2回の内容', 'https://ja.vuejs.org/guide/introduction.html', '第3回教材', 'published'],
    [5, 3, 1, 'standard', null, '第1回 変数と制御構文', '変数、条件分岐、繰り返しを演習します。', 'アルゴリズム班', 2026, '2026-04-12T04:00:00.000Z', '部室', '基礎講習会運営', 'プログラミング未経験者', '特になし', 'https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide', '第1回教材', 'published'],
    [6, 3, 2, 'standard', null, '第2回 関数とデータ', '関数へ処理を分け、配列とオブジェクトを扱います。', 'アルゴリズム班', 2026, '2026-04-19T04:00:00.000Z', '部室', '基礎講習会運営', '第1回を終えた人', '変数と制御構文', 'https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Functions', '第2回教材', 'published'],
    [7, 3, 1, 'rebroadcast', 5, '第1回 再放送', '第1回と同じ内容を別日程で扱った再放送です。', 'アルゴリズム班', 2026, '2026-04-15T09:00:00.000Z', 'オンライン', '基礎講習会運営', 'プログラミング未経験者', '特になし', 'https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide', '再放送教材', 'published'],
    [8, 4, 1, 'standard', null, null, 'ネットワークの基礎を扱う予定です。', 'SysAd班', 2027, null, '', '', '新入生', '特になし', null, '教材未登録', 'draft'],
    [9, 5, 1, 'standard', null, 'Unity講習会第一回', 'Unityの画面構成とゲームオブジェクトの扱い方を学びます。', 'ゲーム班', 2026, '2026-06-06T04:00:00.000Z', '部室', 'ゲーム班講習会運営', 'ゲーム制作を始めたい人', '特になし', null, '教材未登録', 'published'],
    [10, 5, 2, 'standard', null, 'Unity講習会第二回', 'スクリプトを使って、入力に応じて動く仕組みを作ります。', 'ゲーム班', 2026, '2026-06-13T04:00:00.000Z', '部室', 'ゲーム班講習会運営', '第一回を終えた人', 'Unity講習会第一回', null, '教材未登録', 'published'],
    [11, 5, 3, 'standard', null, 'Unity講習会第三回', '小さなゲームを完成させ、実行できる形式で書き出します。', 'ゲーム班', 2026, '2026-06-20T04:00:00.000Z', '部室', 'ゲーム班講習会運営', '第二回を終えた人', 'Unity講習会第二回', null, '教材未登録', 'published'],
    [12, 6, 1, 'standard', null, null, '基本形状から3Dモデルを作り、光とカメラを設定します。', 'グラフィックス班', 2026, '2026-05-30T04:00:00.000Z', '部室', 'グラフィックス班講習会運営', '3D制作に興味がある人', '特になし', null, '教材未登録', 'published'],
    [13, 7, 1, 'standard', null, null, 'パーツ分けしたイラストへ動きを設定します。', 'グラフィックス班', 2026, '2026-06-27T04:00:00.000Z', '部室', 'グラフィックス班講習会運営', 'イラストを動かしてみたい人', '画像編集の基本操作', null, '教材未登録', 'published'],
    [14, 8, 1, 'standard', null, null, 'リズムとメロディーを打ち込み、短い楽曲へまとめます。', 'サウンド班', 2026, '2026-07-04T04:00:00.000Z', '部室', 'サウンド班講習会運営', '楽曲制作を始めたい人', '特になし', null, '教材未登録', 'published'],
    [15, 9, 1, 'standard', null, null, 'Webと暗号の初歩的な問題を、安全な演習環境で解きます。', 'SysAd班', 2026, '2026-07-11T04:00:00.000Z', '部室', 'SysAd班講習会運営', 'セキュリティに興味がある人', 'PCの基本操作', null, '教材未登録', 'published'],
    [16, 10, 1, 'standard', null, null, '入力、条件分岐、繰り返しを使って典型問題を解きます。', 'アルゴリズム班', 2026, '2026-07-18T04:00:00.000Z', '部室', 'アルゴリズム班講習会運営', '競技プログラミングを始めたい人', 'いずれかの言語の基本文法', null, '教材未登録', 'published'],
    [17, 11, 1, 'standard', null, null, '文字、色、余白の役割を整理し、読みやすい画面を作ります。', 'デザイン班', 2026, '2026-07-25T04:00:00.000Z', '部室', 'デザイン班講習会運営', '画面設計に興味がある人', '特になし', null, '教材未登録', 'published'],
  ] as const;
  for (const occurrence of occurrences) {
    statements.push(d1.prepare(
      `INSERT OR IGNORE INTO beta_occurrences
       (id, workshop_id, sequence_number, kind, copied_from_occurrence_id, title, description,
        team, year, scheduled_at, location, instructor, audience, prerequisites,
        material_url, material_label, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(...occurrence, now, now));
  }

  statements.push(
    d1.prepare(
      `INSERT OR IGNORE INTO beta_workshop_relations
       (prerequisite_id, successor_id, created_at) VALUES (1, 2, ?)`,
    ).bind(now),
    d1.prepare(
      `INSERT OR IGNORE INTO beta_workshop_relations
       (prerequisite_id, successor_id, created_at) VALUES (3, 2, ?)`,
    ).bind(now),
    d1.prepare(
      `INSERT OR IGNORE INTO beta_roadmaps
       (id, title, summary, audience, published, status, created_at, updated_at)
       VALUES (1, 'Web開発の入口', '基礎操作からWeb UIまで、過去教材を使って順に学びます。', 'Web開発を始めたい人', 1, 'published', ?, ?)`,
    ).bind(now, now),
    d1.prepare(
      `INSERT OR IGNORE INTO beta_roadmap_stages
       (id, roadmap_id, position, title, description) VALUES (1, 1, 1, '', '')`,
    ),
    d1.prepare(
      `INSERT OR IGNORE INTO beta_roadmap_stages
       (id, roadmap_id, position, title, description) VALUES (2, 1, 2, '', '')`,
    ),
    d1.prepare(
      `INSERT OR IGNORE INTO beta_roadmap_items
       (stage_id, workshop_id, position, note) VALUES (1, 1, 1, '変更を安全に残す準備をします。')`,
    ),
    d1.prepare(
      `INSERT OR IGNORE INTO beta_roadmap_items
       (stage_id, workshop_id, position, note) VALUES (2, 2, 1, '各回を順番に進めます。')`,
    ),
  );

    statements.push(
      d1.prepare('INSERT INTO beta_seed_state (id, seeded_at) VALUES (?, ?)').bind('beta-v1', now),
    );
  }

  await d1.batch(statements);
}

export const databaseConstants = {
  demoUserId: DEMO_USER_ID,
  firstBadgeId: FIRST_BADGE_ID,
} as const;
