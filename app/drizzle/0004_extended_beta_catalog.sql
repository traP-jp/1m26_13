INSERT OR IGNORE INTO `beta_workshops` (`id`, `title`, `summary`, `created_at`, `updated_at`) VALUES
  (260012, 'ターミナル基礎', 'コマンドラインの基本操作を学び、開発や演習の準備を整えます。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260013, 'サウンド制作オリエンテーション', '楽曲制作の全体像と、以降の講習会で使う環境を確認します。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260014, 'DAW操作講習会', 'DAWの準備から編集、ミックス、書き出しまでを3回で体験します。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260015, '音楽理論講習会', '音程、コード、リズムを楽曲制作へ活かす基礎を3回で学びます。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260016, 'デジタルイラスト講習会', '描画ツールの基本から一枚のイラストを仕上げるまでを3回で進めます。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260017, 'Figma講習会', '共同編集できるデザインツールの基本操作を実習します。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260018, '3DCG講習会', '基本形状のモデリングから質感とライティングまでを2回で学びます。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260019, '動画編集講習会', '映像編集の基礎、編集操作、仕上げを3回の実習で学びます。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260020, 'ドット絵講習会', 'ドット絵の特徴を知り、小さな作品を制作します。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260021, 'ゲーム開発オリエンテーション', 'チームでゲームを企画し、制作して公開するまでの流れを学びます。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260022, 'CTFオリエンテーション', 'CTFの分野と学び方、安全な演習の進め方を確認します。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260023, 'Python基礎（機械学習）', '機械学習の演習に必要なPythonと配列処理の基礎を学びます。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260024, '機械学習講習会', '学習の全体像からニューラルネットワークの実装までを段階的に学びます。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260025, 'プロジェクトマネジメント基礎', 'プロジェクトを進めるための計画、合意、振り返りの考え方を学びます。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260026, 'ゲームシナリオ講習会', 'ゲーム体験を支える物語の構成と、シーンの組み立て方を学びます。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260027, 'アルゴリズム基礎講習会', '全探索、グラフ、数学、動的計画法を7回の演習で学びます。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260028, 'CTF分野別演習', 'Forensics、OSINT、Reversingの入口を分野ごとに演習します。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
--> statement-breakpoint
INSERT OR IGNORE INTO `beta_occurrences`
  (`workshop_id`, `sequence_number`, `kind`, `copied_from_occurrence_id`, `title`, `description`, `team`, `year`, `scheduled_at`, `location`, `instructor`, `audience`, `prerequisites`, `material_url`, `material_label`, `status`, `created_at`, `updated_at`) VALUES
  (260012, 1, 'standard', NULL, 'ターミナルの基本操作', 'ディレクトリ移動、ファイル操作、コマンドの調べ方を練習します。', 'SysAd班', 2026, NULL, '会場未定', '講習会運営', '開発やCTF、データ分析を始めたい人', 'PCの基本操作', 'https://ubuntu.com/tutorials/command-line-for-beginners', 'コマンドライン入門', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260013, 1, 'standard', NULL, '制作環境を整える', '楽曲制作の流れを知り、音を出せるところまで環境を準備します。', 'サウンド班', 2026, NULL, '会場未定', 'サウンド班講習会運営', 'サウンド制作に興味がある人', '特になし', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260014, 1, 'standard', NULL, '第1回 DAWの準備と録音', '画面構成、トラック、音源を確認し、短い素材を配置します。', 'サウンド班', 2026, NULL, '会場未定', 'サウンド班講習会運営', '初めてDAWを使う人', 'サウンド制作オリエンテーション', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260014, 2, 'standard', NULL, '第2回 編集とエフェクト', '素材を編集し、音量やエフェクトを使って聞こえ方を整えます。', 'サウンド班', 2026, NULL, '会場未定', 'サウンド班講習会運営', '第1回を終えた人', 'DAWの基本操作', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260014, 3, 'standard', NULL, '第3回 ミックスと書き出し', '複数トラックをまとめ、作品として再生できる形式へ書き出します。', 'サウンド班', 2026, NULL, '会場未定', 'サウンド班講習会運営', '第2回を終えた人', '編集とエフェクト', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260015, 1, 'standard', NULL, '第1回 音程とコード', '音程とコードの基本を、実際の音を聞きながら確認します。', 'サウンド班', 2026, NULL, '会場未定', 'サウンド班講習会運営', '音楽理論を制作へ活かしたい人', '特になし', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260015, 2, 'standard', NULL, '第2回 リズムと進行', 'リズムとコード進行を組み合わせ、短いまとまりを作ります。', 'サウンド班', 2026, NULL, '会場未定', 'サウンド班講習会運営', '第1回を終えた人', '音程とコード', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260015, 3, 'standard', NULL, '第3回 アレンジへの応用', '基礎理論を使い、楽曲の展開と音の重なりを整理します。', 'サウンド班', 2026, NULL, '会場未定', 'サウンド班講習会運営', '第2回を終えた人', 'リズムと進行', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260016, 1, 'standard', NULL, '第1回 ツールと制作手順', '描画ツールの基本操作と、ラフから仕上げまでの流れを体験します。', 'グラフィックス班', 2026, NULL, '会場未定', 'グラフィックス班講習会運営', 'デジタルイラストに興味がある人', '描画できる端末の準備', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260016, 2, 'standard', NULL, '第2回 顔と色の基礎', '形の捉え方と配色を練習し、キャラクターの顔を描きます。', 'グラフィックス班', 2026, NULL, '会場未定', 'グラフィックス班講習会運営', '第1回を終えた人', 'ツールの基本操作', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260016, 3, 'standard', NULL, '第3回 仕上げと講評', '複数の制作例から工夫を学び、自分の作品を仕上げます。', 'グラフィックス班', 2026, NULL, '会場未定', 'グラフィックス班講習会運営', '第2回を終えた人', '顔と色の基礎', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
--> statement-breakpoint
INSERT OR IGNORE INTO `beta_occurrences`
  (`workshop_id`, `sequence_number`, `kind`, `copied_from_occurrence_id`, `title`, `description`, `team`, `year`, `scheduled_at`, `location`, `instructor`, `audience`, `prerequisites`, `material_url`, `material_label`, `status`, `created_at`, `updated_at`) VALUES
  (260017, 1, 'standard', NULL, 'Figmaの共同編集', 'フレーム、図形、文字、コンポーネントを使って小さな画面を作ります。', 'グラフィックス班', 2026, NULL, 'オンライン', 'グラフィックス班講習会運営', 'ロゴや画面デザインに興味がある人', 'Figmaを利用できること', 'https://help.figma.com/hc/ja', 'Figmaヘルプ', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260018, 1, 'standard', NULL, '第1回 モデリング', '基本形状を組み合わせ、簡単な3Dモデルを作ります。', 'グラフィックス班', 2026, NULL, '会場未定', 'グラフィックス班講習会運営', '3DCGに興味がある人', 'Blenderのインストール', 'https://docs.blender.org/manual/ja/latest/modeling/index.html', 'Blenderモデリング', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260018, 2, 'standard', NULL, '第2回 質感とライティング', '質感、光、カメラを設定し、画像として書き出します。', 'グラフィックス班', 2026, NULL, '会場未定', 'グラフィックス班講習会運営', '第1回を終えた人', '基本的なモデリング', 'https://docs.blender.org/manual/ja/latest/render/index.html', 'Blenderレンダリング', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260019, 1, 'standard', NULL, '第1回 映像編集の基礎', '動画の構成、画面サイズ、音声など編集前に必要な基礎を学びます。', 'グラフィックス班', 2026, NULL, '会場未定', 'グラフィックス班講習会運営', '動画を作ってみたい人', '編集用PCの準備', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260019, 2, 'standard', NULL, '第2回 カットとテロップ', '素材を並べ、カット、テロップ、音声を使って一本の動画にします。', 'グラフィックス班', 2026, NULL, '会場未定', 'グラフィックス班講習会運営', '第1回を終えた人', '映像編集の基礎', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260019, 3, 'standard', NULL, '第3回 色と書き出し', '色や音量を整え、用途に合う形式で動画を書き出します。', 'グラフィックス班', 2026, NULL, '会場未定', 'グラフィックス班講習会運営', '第2回を終えた人', 'カットとテロップ', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260020, 1, 'standard', NULL, 'ドット絵を作る', '限られた色と解像度で形を表し、小さな作品を制作します。', 'グラフィックス班', 2026, NULL, '会場未定', 'グラフィックス班講習会運営', 'ドット絵に興味がある人', '制作アプリの準備', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260021, 1, 'standard', NULL, 'ゲーム開発の流れ', '企画、役割分担、試作、テスト、公開までの流れを整理します。', 'ゲーム班', 2026, NULL, '会場未定', 'ゲーム班講習会運営', 'チームでゲームを作ってみたい人', '特になし', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260022, 1, 'standard', NULL, 'CTFの分野と学び方', '競技の形式、代表的な分野、演習環境の安全な扱い方を確認します。', 'CTF班', 2026, NULL, '会場未定', 'CTF班講習会運営', 'セキュリティやCTFに興味がある人', 'プログラミング基礎の受講を推奨', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260023, 1, 'standard', NULL, 'Pythonと配列処理', '基本文法と配列処理を使い、機械学習演習の準備をします。', 'Kaggle班', 2026, NULL, 'オンライン', 'Kaggle班講習会運営', '機械学習を始めたい人', 'ブラウザで演習環境を使えること', 'https://docs.python.org/ja/3/tutorial/', 'Pythonチュートリアル', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260024, 1, 'standard', NULL, '第1回 機械学習の全体像', 'データ、モデル、学習、評価の関係を小さな例で確認します。', 'Kaggle班', 2026, NULL, '会場未定', 'Kaggle班講習会運営', '機械学習に初めて触れる人', 'Pythonの基本文法', 'https://pytorch.org/tutorials/beginner/basics/intro.html', 'PyTorch基礎', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260024, 2, 'standard', NULL, '第2回 勾配降下法', '誤差を小さくする更新の考え方を、図と簡単な計算で学びます。', 'Kaggle班', 2026, NULL, '会場未定', 'Kaggle班講習会運営', '第1回を終えた人', '機械学習の全体像', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260024, 3, 'standard', NULL, '第3回 ニューラルネットワーク', '層と活性化関数を組み合わせる基本構造を学びます。', 'Kaggle班', 2026, NULL, '会場未定', 'Kaggle班講習会運営', '第2回を終えた人', '勾配降下法', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
--> statement-breakpoint
INSERT OR IGNORE INTO `beta_occurrences`
  (`workshop_id`, `sequence_number`, `kind`, `copied_from_occurrence_id`, `title`, `description`, `team`, `year`, `scheduled_at`, `location`, `instructor`, `audience`, `prerequisites`, `material_url`, `material_label`, `status`, `created_at`, `updated_at`) VALUES
  (260024, 4, 'standard', NULL, '第4回 誤差逆伝播法', '出力側の誤差を各層へ伝える考え方を確認します。', 'Kaggle班', 2026, NULL, '会場未定', 'Kaggle班講習会運営', '第3回を終えた人', 'ニューラルネットワークの構造', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260024, 5, 'standard', NULL, '第5回 モデルの実装と訓練', '小さなモデルを実装し、学習曲線を見ながら改善します。', 'Kaggle班', 2026, NULL, '会場未定', 'Kaggle班講習会運営', '第4回を終えた人', '誤差逆伝播法', 'https://pytorch.org/tutorials/beginner/basics/optimization_tutorial.html', '最適化チュートリアル', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260024, 6, 'standard', NULL, '第6回 演習キックオフ', '学んだ手法を使う演習課題を確認し、評価方法を決めます。', 'Kaggle班', 2026, NULL, '会場未定', 'Kaggle班講習会運営', '第5回を終えた人', 'モデルの訓練', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260024, 7, 'standard', NULL, '第7回 結果の振り返り', '演習結果を比較し、改善できた点と次に試すことを整理します。', 'Kaggle班', 2026, NULL, '会場未定', 'Kaggle班講習会運営', '演習へ参加した人', '演習キックオフ', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260025, 1, 'standard', NULL, 'プロジェクトを進める基本', '目的、成果物、役割、リスク、振り返りを一つの流れで整理します。', 'ゲーム班', 2026, NULL, '会場未定', '講習会運営', 'プロジェクトへ関わる人', '特になし', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260026, 1, 'standard', NULL, 'ゲームシナリオの構成', 'プレイヤー体験から逆算し、登場人物と出来事の流れを組み立てます。', 'ゲーム班', 2026, NULL, '会場未定', 'ゲーム班講習会運営', 'ゲームシナリオを書いてみたい人', '特になし', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260027, 1, 'standard', NULL, '第1回 演習環境', '問題を解くための環境と、提出までの流れを確認します。', 'アルゴリズム班', 2026, NULL, '会場未定', 'アルゴリズム班講習会運営', '競技プログラミングに興味がある人', 'いずれかの言語の基本文法', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260027, 2, 'standard', NULL, '第2回 全探索', '小さな範囲を漏れなく調べる考え方を演習します。', 'アルゴリズム班', 2026, NULL, '会場未定', 'アルゴリズム班講習会運営', '第1回を終えた人', 'ループと配列', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260027, 3, 'standard', NULL, '第3回 計算量と基本アルゴリズム', '処理量の見積もりと、典型的な探索・整列を学びます。', 'アルゴリズム班', 2026, NULL, '会場未定', 'アルゴリズム班講習会運営', '第2回を終えた人', '全探索', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
--> statement-breakpoint
INSERT OR IGNORE INTO `beta_occurrences`
  (`workshop_id`, `sequence_number`, `kind`, `copied_from_occurrence_id`, `title`, `description`, `team`, `year`, `scheduled_at`, `location`, `instructor`, `audience`, `prerequisites`, `material_url`, `material_label`, `status`, `created_at`, `updated_at`) VALUES
  (260027, 4, 'standard', NULL, '第4回 グラフ', '頂点と辺で関係を表し、基本的な探索を実装します。', 'アルゴリズム班', 2026, NULL, '会場未定', 'アルゴリズム班講習会運営', '第3回を終えた人', '基本アルゴリズム', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260027, 5, 'standard', NULL, '第5回 数学の道具', '整数、余り、組合せなど問題で使う数学の道具を整理します。', 'アルゴリズム班', 2026, NULL, '会場未定', 'アルゴリズム班講習会運営', '第4回を終えた人', 'グラフ探索', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260027, 6, 'standard', NULL, '第6回 数学の応用', '数え上げや確率を小さな問題へ適用します。', 'アルゴリズム班', 2026, NULL, '会場未定', 'アルゴリズム班講習会運営', '第5回を終えた人', '数学の基礎', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260027, 7, 'standard', NULL, '第7回 動的計画法', '部分問題の結果を再利用し、重複計算を減らす方法を学びます。', 'アルゴリズム班', 2026, NULL, '会場未定', 'アルゴリズム班講習会運営', '第6回を終えた人', '計算量の考え方', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260028, 1, 'standard', NULL, '第1回 Forensics', 'ファイルや記録から手がかりを集める基本的な流れを演習します。', 'CTF班', 2026, NULL, '会場未定', 'CTF班講習会運営', 'CTFオリエンテーションを終えた人', 'PCの基本操作', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260028, 2, 'standard', NULL, '第2回 OSINT', '公開情報を整理し、根拠を確認しながら答えへ近づく方法を演習します。', 'CTF班', 2026, NULL, '会場未定', 'CTF班講習会運営', '第1回を終えた人', '調査結果の記録方法', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (260028, 3, 'standard', NULL, '第3回 Reversing', '小さなプログラムの動きを観察し、処理の流れを読み解きます。', 'CTF班', 2026, NULL, '会場未定', 'CTF班講習会運営', '第2回を終えた人', 'プログラミング基礎', NULL, '教材未登録', 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
--> statement-breakpoint
INSERT OR IGNORE INTO `beta_workshop_relations` (`prerequisite_id`, `successor_id`, `created_at`) VALUES
  (260012, 260023, CURRENT_TIMESTAMP),
  (260013, 260014, CURRENT_TIMESTAMP),
  (260013, 260015, CURRENT_TIMESTAMP),
  (260022, 260028, CURRENT_TIMESTAMP),
  (260023, 260024, CURRENT_TIMESTAMP);
--> statement-breakpoint
INSERT OR IGNORE INTO `beta_roadmaps` (`id`, `title`, `summary`, `audience`, `published`, `status`, `created_at`, `updated_at`) VALUES
  (270002, 'グラフィックス制作の入口', '平面デザインからイラスト、3DCG、動画まで興味に合わせて進みます。', 'グラフィックス制作を始めたい人', 1, 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (270003, 'サウンド制作の入口', '制作環境を整えてから、DAW操作と音楽理論へ進みます。', 'サウンド制作を始めたい人', 1, 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (270004, '機械学習の入口', 'ターミナルとPythonを準備し、機械学習の講義と演習へ進みます。', '機械学習を初めて学ぶ人', 1, 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (270005, 'CTFの入口', '基礎操作とオリエンテーションを終え、分野別演習へ進みます。', 'CTFを始めたい人', 1, 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
--> statement-breakpoint
INSERT OR IGNORE INTO `beta_roadmap_stages` (`id`, `roadmap_id`, `position`, `title`, `description`) VALUES
  (280003, 270002, 1, '', ''),
  (280004, 270002, 2, '', ''),
  (280005, 270003, 1, '', ''),
  (280006, 270003, 2, '', ''),
  (280007, 270004, 1, '', ''),
  (280008, 270004, 2, '', ''),
  (280009, 270005, 1, '', ''),
  (280010, 270005, 2, '', '');
--> statement-breakpoint
INSERT OR IGNORE INTO `beta_roadmap_items` (`stage_id`, `workshop_id`, `position`, `note`) VALUES
  (280003, 260017, 1, ''),
  (280003, 260016, 2, ''),
  (280004, 260018, 1, ''),
  (280004, 260019, 2, ''),
  (280004, 260020, 3, ''),
  (280005, 260013, 1, ''),
  (280006, 260014, 1, ''),
  (280006, 260015, 2, ''),
  (280007, 260012, 1, ''),
  (280007, 260023, 2, ''),
  (280008, 260024, 1, ''),
  (280009, 260012, 1, ''),
  (280009, 260022, 2, ''),
  (280010, 260028, 1, '');
