# Status

更新日: 2026-09-03
フェーズ: β版中心体験・内部レビュー反映完成 — `PLAN.md` B1〜B35を達成

## 現在地

記入済み詳細設計を正本に、αの画面へ機能追加する方式をやめ、講習会・開催・ロードマップのデータ境界、API、Vue UI、CSSをβとして再設計した。2026-09-02の明示依頼により基準版を指定GitHubリポジトリの`experimental/one-monthon-beta/`へ隔離し、PR #4を作成した。本人指定のtraQチャンネルを参照し、レビュー意見を一般化して反映している。本人の継続承認に基づき確認した最新投稿だけへ`:eyes:`を付ける運用とし、2026-09-03 02:38の報告まで確認済み。今回の未確認3件はCLIで取得し、最新1件への`:eyes:`だけを付与した。投稿、編集、その他のリアクション、設定変更は行っていない。Vault/Daily編集、デプロイ、新しい依存追加も行っていない。

既存αテーブルとローカルデータは削除せず、追加migrationでβテーブルを作る。βの講習会はSQLite/D1の64-bit連番INTEGER、開催は別の内部IDと人向け回番号を持つ。日時、教材、班、年度、対象者などは開催ごとに独立し、複製後は元開催と同期しない。

## 実装済み

- 発見: 公開開催を持つ講習会とロードマップを、キーワード・班・年度で検索。読み込み中、0件、失敗、再試行を表示。
- 詳細/教材: 1回開催は開催階層を隠して一画面表示し、本文の「教材」節を使う。複数回は同じページ内で切り替え、`/workshops/{id}#3`で第3回を開く。通常開催は既定としてラベルを出さず、同じ回の再放送だけを見出し右端で明示する。複数回の教材リンクは該当開催カード内の「教材はこちら」から開く。
- 登録/編集: 新規作成は講習会名・概要を「講習会を作成」で先に永続化し、保存済み通常編集画面で第1回以降の開催をカードごとに追加する。開催0件の中間状態は管理画面だけで表示し、公開開催を保存するまでは学習者向け一覧・詳細へ出さない。どちらも同じ`WorkshopInput`と保存APIを使用し、講習会/開催の全入力、公開/下書き、前後関係を保存。
- 複製: 再放送は同じ回、次回は次の回番号として全利用者入力をコピー。`kind`と`copiedFromOccurrenceId`を保持し、複製後の編集は独立。完了などのシステム記録はコピーしない。
- 完了/プロフィール: 講習会単位の自己申告完了をD1へ冪等保存・取消。公開講習会ごとのバッジを同じ記録から導出。
- ロードマップ: D1に保持した段階の順序から講習会名だけを直接並べ、完了数・済/次を完了記録から導出。段階名・説明は入力・API返却・表示をしない。現在地の円マーカーは左のaccent線から離し、全件完了した一覧行とbasiQ-ui Cardは既存成功色で緑表示する。
- UI: Vue 3を継続し、`BasiqThemeProvider`、`Button`、`Card`、`ChoiceGroup`、`ChoiceGroupItem`、`ToggleButton`を実コンポーネントとして使用。1,034行だった単一CSSは、5行のimport元と`base/layout/forms/pages`へ分割。
- UI再設計: Vaultの`assets/beta-design/`画像群を情報設計の参考にし、PCを薄灰の左ナビ＋白い広幅作業面、390pxを上部ブランド＋固定下部ナビへ変更。`/`に実データのホームを追加し、発見は縦フィルター＋講習会カード/ロードマップ一覧＋選択プレビュー、詳細・ロードマップ・学びの記録は主列＋右レールへ再構成した。
- 状態と密度: 青は現在地・主操作、緑は完了だけに限定。絞り込みを検索結果の直上へ移し、PCではキーワード・班・年度・操作を横一列にした。条件検索結果は実際の`BasiqCard`でPC 3列、1050px以下2列、760px以下1列とし、タイトル、概要、班、年度、開催数だけを載せた。カード本体の背景・境界・hoverは独自CSSで上書きせず、basiQ-ui標準のprops、slot、surface表現を使用する。画像にしかないカテゴリ、作者、共有、推薦、飾り統計は追加していない。
- ホーム/ナビ: 「学びの記録」を「プロフィール」へ改称し人物アイコンへ変更。「ロードマップから探す」の重複切替とホームの大きな登録パネルを削除した。B10で検索はホームへ、作成・管理は共通ナビの「運営向けページ」へ集約した。
- 共有講習会カード: `WorkshopSummaryCard`でホームと条件検索の表示・読み上げ順を統一。カード外観は`BasiqCard`標準のまま、名称左には汎用の教材アイコンではなく主担当班を`Web`、`Sys`、`アル`のように短縮表示する。班の正式名称はカード本文にも保持する。
- ホーム検索: ホームに実検索バーを置き、`/workshops?q=...`へ検索文脈を渡す。ホームは作成中を含む講習会を更新順でカード表示し、開催0件の未入力項目を「未定」、操作を「詳細を見る」として管理用previewで保存結果を確認・再編集できる。通常検索と学習者向け詳細は公開開催だけを維持する。学習者ナビはホーム、ロードマップ、プロフィールの3項目へ整理した。
- 運営向けページ: `/admin`へ講習会作成とロードマップ管理を集約。作成方法の二択をなくし、単一のbasiQ-uiボタンから講習会名・概要の先行作成画面を開く。PC左ナビ/モバイル下部ナビの運営導線は同ページを開く。
- プロフィール: バッジ、完了した講習会、ロードマップを下線型の3タブで表示。basiQ-uiにTabsがないためnativeのARIA tabをbasiQ tokenで最小実装し、選択/対応関係と左右矢印・Home・Endのキーボード移動を備える。バッジ詳細は「受講完了日」を表示し、講習会詳細への導線をカード中央に置く。
- ロードマップ管理: 閲覧用`/roadmaps/:id`と管理用`/admin/roadmaps/:id`を分離。タイトル、概要、対象、booleanの公開状態、各段階の講習会順を共通`RoadmapInput`で作成・編集し、削除できる。公開操作はbasiQ-uiの`ToggleButton`を使い、下書きは学習者向け一覧/詳細に出さない。既存の文字列`status`は追加migrationで`published INTEGER`へ変換し、互換列としてのみ残す。
- ロードマップ保存通知/一覧遷移: 公開状態を変更して保存すると、公開は既存の緑成功feedback、非公開は既存の赤danger feedbackで通知する。学習者向け一覧行は詳細URLを持つリンクとし、プレビュー内の導線を探さなくても行全体から該当詳細へ移動できる。
- ロードマップ共有: 詳細のbasiQ-ui「ロードマップを共有」から、段階ごとの講習会名と絶対URLをMarkdownで表示し、同じ画面でコピーできる。共有中は同じボタンを「共有画面を閉じる」に変更する。コピー成功はボタン内の「コピーしました」、失敗だけは既存error feedbackで通知する。
- 運営一覧: ロードマップの閲覧・編集をbasiQ-uiの`Button`に統一し、公開中は完了色、非公開中はbasiQ-uiのdanger tokenで表示。ページ名と重複する小見出し「運営」を削除した。
- 登録文言: 講習会名の例を「なろう講習会」とし、シリーズなら講習会名へシリーズ名を書くよう案内する。開催ではシリーズ名入力を置かず、「回番号（単発講習会なら1で）」「この回で学べること」「開催する組織・班」を明示し、年度は日時の年から自動設定する。
- 学びのつながり: 「先に学ぶ」「次に学ぶ」をそれぞれ複数選択でき、見出しへ選択件数を表示。実際のbasiQ-ui `ToggleButton`のon-stateと選択行を既存の明るい緑へ揃え、保存後も両側の複数関係を保持する。
- 保存/削除: 開催保存後に成功statusを表示。編集画面の保存ボタン横へbasiQ-ui danger toneの講習会削除を置き、開催・完了・ロードマップ配置への影響を確認してから実D1を削除する。教材欄と関係説明も内部レビュー指定文へ更新した。
- 開催単位削除: 各開催カードにbasiQ-ui danger outlineの「−」を置き、フォームから外して変更を保存するとD1から削除する。最後の1件は無効化し、単発は第1回だけにする案内を2行目へ表示する。削除後は残る回グループを1から連番へ振り直し、同じ回の再放送は同じ番号を保つ。
- カード整列: ホームの実basiQ-ui Cardをグリッド行高へ伸ばす共通レイアウト1規則だけを追加し、DAW操作講習会のように概要が短いカードも同じ行で枠・footer位置を揃えた。
- 読込失敗/再試行: 編集の初期読込が失敗した場合は編集情報・保存・削除を表示せず、失敗feedbackとbasiQ-ui「再試行」だけを表示。開催追加はaccent solidの「開催データを追加」へ変更した。
- 保存後の詳細確認: 「変更を保存」成功後は管理用詳細previewへ直接遷移し、成功status、保存済み本文、編集への戻りを同じ画面で確認できる。公開前ホームカードも「詳細を見る」でpreviewへつなぎ、公開前だけ完了操作を隠す。
- seed/fixture: 公開27講習会、下書き込み28講習会、5ロードマップ。単発、3回、7回、通常開催と再放送を同じ回に持つ講習会を含み、SysAd、Web、アルゴリズム、グラフィックス、ゲーム、サウンド、CTF、Kaggleなどの学習例を一般化した実データで確認できる。
- 追加カタログ保護: `0004_extended_beta_catalog`は既存ローカルIDと衝突しにくいfixture専用範囲へ17講習会・40開催・4ロードマップを一度だけ追加する。元のfixtureを先に投入し、追加migrationは再実行可能な小単位で適用するため、利用者が編集した既存ロードマップ段階へitemを混入させない。
- ロードマップ通知/経路線: 公開状態を変更して保存した場合は既存feedbackを更新後、画面先頭へ滑らかに戻す。学習順の縦線は既存basiQ tokenの境界色を使ったまま項目間の空白だけを解消した。
- seed再実行保護: `beta_seed_state` markerをmigrationで追加し、β fixtureは新規D1の初回だけ同一batchで投入する。既存βデータがあるD1はmarkerをbackfillし、利用者の編集・削除を再起動時に上書き・復活させない。
- traQ確認CLI: `app/scripts/traq-zenn-feedback.mjs`がBotトークンを環境変数またはmacOS Keychainから読み、Zennチャンネルで最後の`:eyes:`より後の投稿を時系列で出力する。未確認時だけ最新投稿へBot名義で`:eyes:`を付け、`--dry-run`、`--json`、`--quiet`、チャンネル/スタンプID指定、全件ページングに対応する。Chrome、WebSocket常駐、検索API、新規依存、永続cursorを使わない。
- Cron連携: Keychainのservice `codex.1-monthon.traq-bot-token`、account `1-monthon`から実行時に資格情報を取得する。既存10分heartbeat `zenn`はCLIを最初に実行し、`count=0`なら重い処理を行わず終了する指示へ更新済み。Cronプロンプトとリポジトリに秘密値は含まれない。

## 最終検証

- 2026-09-03 ロードマップ編集/作成の補助操作整理後:
  - `npm run check`: 成功。TypeScript、ESLint、ドメイン12/12、traQ CLI 8/8、隔離D1 API統合1/1、Vinext build全5段階。fail/skip/todo 0。
  - 02:41の追加フィードバック1件をpush後のCLIで確認し、最新投稿だけに`:eyes:`を付与。キャンセルの幅と重複管理ラベルを修正した。
  - Chrome PC（1414px）: 作成/編集のキャンセル110.55px・保存62px、同じ高さで右端配置。390px: キャンセル105.59px・保存60px。編集だけ削除を上の行へ折り返し、キャンセル・保存は同じ行を維持した。
  - 作成/編集とも「ロードマップ管理」0件、横あふれ0。Enter/クリックのキャンセルで`/admin`へ戻り、console warning/error 0件。確認用D1以外の利用者データは変更していない。

- 2026-09-03 共有開閉・経路線・複数開催表記の整理後:
  - `npm run check`: 最終ソースで成功。TypeScript、ESLint、ドメイン12/12、traQ CLI 8/8、隔離D1 API統合1/1、Vinext build全5段階。fail/skip/todo 0。
  - Chrome PC（1414px）/390×844: 共有欄の開閉に合わせた文言と`aria-expanded`、Enterで閉じた後のフォーカス維持・パネル0件を確認。
  - 隔離D1でGitとWeb講習会の完了を実UIから保存し、未完了→一部完了→全件完了を表示。PC/390pxのスクリーンショットで完了→次、完了→完了の灰色線がマーカー間で連続することを確認。
  - ホームで「1回完結」「全2回」「全3回」「全7回」、再放送を含むカードとUnityの検索結果を確認。ホーム・検索・ロードマップは横あふれ0、console warning/error 0件。
  - OSダーク設定でも固定ライトテーマの派生色が白ベースで解決されることを確認。既存tokenの定義位置のみ変更し、新規外観CSS・依存・API・migrationは追加していない。
  - 通常の`app/.wrangler/`は変更せず、Chrome確認には`/private/tmp/one-monthon-b34.6xmVzl`の一時D1を使用した。

- 2026-09-03 追加カタログ・ロードマップ操作フィードバック反映後:
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト12/12、traQ CLIテスト8/8、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。
  - API統合テスト: 新規D1で公開27件、下書き込み28件、5ロードマップを確認。サウンド3回、機械学習7回、グラフィックス5講習会のロードマップをタイトルから解決し、固定表示IDへ依存せず実データを検証した。
  - 既存ローカルD1: 適用前バックアップを`/private/tmp/one-monthon-d1-before-catalog-cleanup.sqlite`へ作成。試行中に追加した行だけを一度除去して元の件数・段階item・migration ledger・外部キー整合性を確認後、最終migrationを適用した。既存段階9/10のitemは各1件のまま、`PRAGMA foreign_key_check`は0件。
  - Chrome PC（1414px）: 5項目のグラフィックスロードマップで連続する縦線と横あふれ0を目視。公開→非公開、非公開→公開の両保存で操作前に下端へ移動し、成功後`scrollY = 0`とstatusを確認。最終状態は公開へ復元した。
  - Chrome PC/390×844: `/workshops`、`/roadmaps/270002`、`/workshops/3#1`、`/admin/roadmaps/1`で横あふれ0。複数開催本文の教材リンク2件と`#1`を確認。console warning/error 0件。
  - 参照添付から個人名、正確な日程・場所、内部URLを成果物へ転載していない。新規依存、basiQ-ui外観上書き、Vault/Daily変更、デプロイなし。

- 2026-09-03 教材導線・Markdownコピー結果の整理後:
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト12/12、traQ CLIテスト8/8、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。
  - Chrome PC（1414px）/390×844: 複数開催の教材ボタン2件が実basiQ-ui neutral outlineとなり、背景透明、灰色枠`rgb(135, 149, 163)`、カード右端との差17px、横あふれ0を確認。
  - Chrome PC/390×844: Markdownコピーを実操作し、ボタン文言が「Markdownをコピー」から「コピーしました」へ変わり、成功feedbackは0件。コピー後はneutral outline、横あふれ0、console warning/error 0件。
  - 新規CSS、依存、API、D1変更なし。既存basiQ-ui `Button`と既存`section-heading`レイアウトだけを再利用した。

- 2026-09-03 ロードマップ共有・開催内教材・seed再実行保護反映後:
  - `npm install`: 成功。既存lockfileどおり`up to date`。追加依存・lockfile変更なし。空D1からの初回migration/fixtureは下記API統合テストで確認した。
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト12/12、traQ CLIテスト8/8、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。
  - API統合テスト: 初回fixture、講習会/開催/完了の中心導線に加え、seed講習会を削除してサーバーを再起動しても404と一覧非表示が維持されることを確認。
  - 既存ローカルD1: `0003_beta_seed_state.sql`を非破壊適用し、既存βデータをmarkerへbackfill。再起動後も`/workshops/3#1`を読み込め、01:06に報告された`seedDatabase`の外部キー制約エラーが再発しないことを確認。
  - Chrome PC（1414px）/390×844: `/roadmaps/1`で共有Markdownとコピー成功status、`/workshops/3#1`で各開催カード内の教材リンクと再放送ラベル右寄せを確認。390pxで横あふれなし、console warning/error 0件。
  - 新規依存、独自UI部品、外観CSSの追加なし。既存basiQ-ui `Button`/`Card`、feedback、レイアウト規則だけを再利用した。

- 2026-09-03 traQフィードバック確認CLI追加後:
  - `npm run test:feedback`: 成功。モックtraQ APIで差分投稿の時系列出力と最新1件へのスタンプ、最新確認済み時のPOST 0件、dry-run、チャンネルパス/eyes解決、`X-TRAQ-MORE`ページング、エラー時のトークン非露出、Keychainフォールバック、quiet出力を8/8確認、fail/skip/todo 0。
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト12/12、CLIテスト8/8、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。最初の実行はサンドボックスの127.0.0.1待受制限だけで失敗し、権限付き再実行で全ゲート成功。
  - `npm run feedback:check -- --help`: 成功。環境変数とdry-run/JSON/ID指定の利用方法を確認。実トークンは投入せず、traQの読取・`:eyes:`付与を含む外部API呼出は行っていない。
  - 新規依存、migration、D1変更、UI/CSS変更なし。既存の未コミットUI変更には触れていない。
  - macOS KeychainへBotトークンを保存し、`npm run feedback:check -- --dry-run --quiet`で実APIへの読取と資格情報取得が成功。投稿内容の出力と`:eyes:`付与は行っていない。既存heartbeat `zenn`をChrome先行からCLI先行へ更新し、10分間隔と対象スレッドは維持した。
  - Keychain対応後の`npm run check`は静的検査、ドメイン12/12、CLI 8/8まで成功し、稼働中の利用者dev serverとの二重起動防止でAPI段階だけ停止した。サーバーを止めず、同じソースの`/private/tmp`隔離コピーで`npm run test:api` 1/1を成功させ、元作業場所で`npm run build`全5段階も成功。確認用コピーは削除済み。

- 2026-09-03 ロードマップ保存通知・一覧直接遷移反映後:
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト12/12、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。最初のAPI実行はサンドボックスのローカル待受制限、次の実行は確認用dev serverとの多重起動を検出したため、同サーバーを停止して権限付きで再実行し全ゲート成功。確認後は`http://localhost:3000`へ再起動した。
  - Chrome PC（1414px）: ロードマップ一覧行が`/roadmaps/1`を持つリンクであることと、行全体のクリックから「Web開発の入口」詳細へ遷移することを確認。編集画面で公開→非公開の赤通知、非公開→公開の緑通知を確認し、最終状態は公開へ戻した。
  - Chrome 390×844: 一覧リンクと編集画面の両方で`innerWidth === scrollWidth === 390`。非公開/公開の保存通知を実操作で確認した。
  - Chrome console: warning/error 0件。新規依存、migration、独自部品、外観CSSの追加なし。既存のfeedback状態と一覧リンク用レイアウトだけを再利用した。

- 2026-09-03 開催再採番・ロードマップ進捗表現反映後:
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト12/12、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。
  - Chrome PC: 3回開催から第1回を「−」で削除すると見出し・回番号が即座に`1, 2`となり、保存後の管理用詳細と編集再読込でも`1, 2`を保持。既存内部IDと各開催内容は保持した。
  - Chrome PC: ロードマップ2講習会を実UIで完了し、一覧行と実basiQ-ui Card背景が`rgb(237, 247, 241)`、左境界が`rgb(36, 115, 74)`になることを確認。1件を未完了へ戻した詳細では円マーカーが左accent線から12px離れ、完了行は緑のまま表示された。
  - Chrome 390×844: ロードマップ詳細と全件完了一覧を確認し、`clientWidth === scrollWidth === 390`、console warning/error 0件。確認用HTMLと隔離D1だけを使用し、確認用HTMLは削除済み。通常の`app/.wrangler/`は変更していない。
  - 新規依存・migration・basiQ-ui代替部品なし。色は既存成功色とbasiQ-ui Card背景token、配置は既存ロードマップ行のレイアウト規則だけを更新した。

- 2026-09-02 保存後の詳細確認導線反映後:
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト11/11、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。
  - Chrome PC: 公開前開催を「変更を保存」し、`/workshops/4?manage=1&saved=1`へ遷移。詳細見出し・本文、「開催データを保存しました。」status、「編集」を確認し、公開前の「受講し終わった」は0件。
  - Chrome PC: ホームの同講習会カードが「詳細を見る」と`/workshops/4?manage=1`を持ち、「編集を続ける」が0件であることを確認。
  - Chrome 390×844: 同じ保存後詳細previewで見出し、成功status、編集、開催情報を表示し、`clientWidth === scrollWidth === 390`、console warning/error 0件。
  - 新規CSS・依存・migrationなし。通常の`app/.wrangler/`は変更していない。

- 2026-09-02 編集読込失敗・開催追加操作整理後:
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト11/11、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。
  - Chrome PC: 存在しない講習会の管理URLで「読み込めませんでした」「講習会が見つかりません。」「再試行」だけを表示し、講習会名入力・開催・保存・削除が0件であることを確認。再試行後も同じ安全な失敗状態を維持。
  - Chrome PC/390×844: 正常編集画面で「開催データを追加」をaccent solidで表示し、旧「＋」は0件。390pxでは文言を1行に保ち、失敗画面・正常画面とも`clientWidth === scrollWidth === 390`、console warning/error 0件。
  - 新規依存・migrationなし。basiQ-ui外観は変更せず、追加ボタンの折返しを防ぐレイアウトCSS 1規則だけを追加。通常の`app/.wrangler/`は変更していない。

- 2026-09-02 開催単位削除・カード高さ統一後:
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト11/11、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。複製した開催を入力から除外して保存し、削除後は元開催1件だけが残ることを確認。
  - Chrome PC: 3開催の第3回を「−」で除外し、「変更を保存」後と再読込後も第1・2回だけを表示。1開催だけの講習会では「−」が表示されたまま無効で、titleに「開催は1件以上必要です」を保持。
  - Chrome PC: ホーム先頭9カードの外枠とbasiQ-ui Cardがすべて192pxで一致し、短い概要を含む同じ行の枠とfooter位置を目視確認。
  - Chrome 390×844: 2行の開催案内と各「−」を表示し、`clientWidth === scrollWidth === 390`。console warning/error 0件。
  - 新規依存・migrationなし。独自外観は追加せず、Cardの高さを揃える共通レイアウトCSS 1規則だけを追加。通常の`app/.wrangler/`は変更していない。

- 2026-09-02 開催保存フィードバック・講習会削除・文言整理後:
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト11/11、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。APIで講習会削除204、削除後の管理詳細404、ホーム非表示を確認。
  - Chrome PC: 下書き開催を実保存し、「開催データを保存しました。」のstatusを確認。「教材の説明文」と指定された関係説明を確認し、削除ボタンはbasiQ-ui danger toneの赤（`rgb(242, 100, 81)`）で保存ボタンの隣に表示。
  - Chrome 390×844: 同じ編集画面を実Chrome内の390px表示領域で描画し、赤い削除と青い保存を固定操作領域に並べ、モバイルナビを含めて横あふれなしを目視確認。console warning/error 0件。
  - 新規CSS・依存・migrationなし。確認用の一時D1だけを使用し、通常の`app/.wrangler/`は変更していない。

- 2026-09-02 学びのつながりの複数選択明示後:
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト11/11、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。両側へ2件ずつ指定できるドメインケースと、2件+1件を保存・再起動後に復元するAPIケースを追加。
  - Chrome PC: 「先に学ぶ」2件と「次に学ぶ」1件を同時選択し、見出し件数、明るい緑の背景（`rgb(237, 247, 241)`）と文字（`rgb(36, 115, 74)`）、保存・再読込後の3件保持を確認。
  - Chrome 390×844: 同じ保存済み編集画面を実Chrome内の390px表示領域で描画し、モバイルナビ・固定保存操作を含む横あふれなしと、2件+1件のpressed状態を確認。console warning/error 0件。
  - 新規CSSセレクタ・依存・migrationなし。通常の`app/.wrangler/`は変更していない。

- 2026-09-02 開催入力簡略化・作成中ホーム表示後:
  - `npm run check:static`: 成功。TypeScript、ESLint、ドメインテスト10/10、fail/skip/todo 0。
  - `npm run test:api`: 成功。隔離D1 API統合テスト1/1、fail/skip/todo 0。通常検索は公開10件、ホーム取得は下書き込み11件。新規講習会の開催0件状態がホーム取得に加わり、公開検索・学習者詳細では非表示のままであることを確認。
  - Chrome PC（1280×900）: 新規一時D1で「講習会を作成」後にホーム12件へ増え、作成直後カードが更新順の先頭で班・年度・開催を「未定」、操作を「編集を続ける」と表示。カードから編集へ戻り、シリーズ名入力0件、「この回で学べること」を確認。下書き開催の班と2028年日時を保存後、ホーム先頭でグラフィックス班・2028年度・1回完結へ更新された。
  - Chrome 390×844: 同じ更新済みカードを先頭で確認し、`scrollWidth === innerWidth === 390`、console warning/error 0件。新規CSS・依存・migrationなし。通常の`app/.wrangler/`は変更していない。

- 2026-09-02 バッジ詳細の文言・配置整理後:
  - `npm run check:static`: 成功。TypeScript、ESLint、ドメインテスト10/10、fail/skip/todo 0。
  - Chrome PC（1280×900）/390×844: 隔離D1で講習会完了を実記録し、プロフィールのバッジ詳細に「受講完了日」が表示され、「獲得日」が0件であることを確認。「講習会の詳細を見る」の中心とfooterの中心差は両幅で0px、横あふれなし、console warning/error 0件。
  - 新規CSSは追加せず、既存の中央揃え共通レイアウトを再利用。通常の`app/.wrangler/`は変更していない。

- 2026-09-02 講習会先行作成・年度自動設定・seed拡充後:
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト10/10、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。講習会先行作成時だけ開催0件を受理し、通常更新では開催必須を維持する。
  - API統合テストで公開10件、グラフィックス班・ゲーム班、Unity全3回、開催0件の先行作成、学習者向け404、管理読取、開催追加後の公開・再起動後永続化を確認。最初の一括実行はブラウザQA用dev serverとの多重起動検出でAPI段階が停止したため、確認用serverだけを終了して同じコマンドを再実行し、全ゲート成功。
  - Chrome PC（1280×900）: 一時D1のホームで公開10件を3列カード表示し、Unity講習会を3開催として確認。新規画面は指定説明、placeholder「例: なろう講習会」、「講習会を作成」1ボタンで「次へ」0件。作成後に保存済み講習会と第1回開催カードを表示し、開催保存まで実操作した。
  - Chrome 390×844: ホームと新規/編集、`/workshops/5#3`を確認。Unity講習会第三回が展開され、全画面で`scrollWidth === innerWidth === 390`。年度入力0件、開催する組織・班ラベル、各回カード見出しを確認。日時`2027-03-15T13:00`の保存結果を隔離D1で`year = 2027`として確認。
  - Chrome console: 対象の一時サーバーでwarning/error 0件。追加CSS・依存・migrationなし。通常の`app/.wrangler/`とVault/Dailyは変更していない。

- 2026-09-02 プロフィール切替のタブ化後:
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト9/9、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。
  - Chrome PC/390×844: `/users/demo-learner`で3切替が塗りボタンでなく下線型タブとして表示され、クリック、左右矢印/Home/End、tabpanel対応、フォーカス、横あふれなし、console warning/error 0件を確認。

- 2026-09-02 回番号・シリーズ任意性の明示後:
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト9/9、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。
  - Chrome PC/390×844: `/admin/workshops/new`の開催入力で「回番号（単発講習会なら1で）」「シリーズ名（あれば）」を確認。横あふれなし、console warning/error 0件。

- 2026-09-02 講習会・シリーズ入力文言整理後:
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト9/9、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。
  - Chrome PC/390×844: `/admin/workshops/new`で指定説明文、講習会名placeholder「例: なろう講習会第六回」、シリーズ名placeholder「例: なろう講習会」を確認。旧「開催名（任意）」と旧例示は0件、横あふれなし、console warning/error 0件。

- 2026-09-02 ロードマップ管理一覧の操作整理後:
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト9/9、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。
  - Chrome PC/390×844: `/admin`で「閲覧」「編集」が実際のbasiQ-uiボタンになり、「公開中」が緑、非公開fixtureがない通常画面ではAPI型とDOM条件を確認。小見出し「運営」は0件、横あふれなし、console warning/error 0件。

- 2026-09-02 ロードマップ段階表示・公開状態整理後:
  - `npm run check:static`: 成功。TypeScript、ESLint、ドメインテスト9/9、fail/skip/todo 0。
  - `npm run test:api`: 成功。隔離した新規D1で`0002_roadmap_published_boolean`を適用し、booleanの下書き作成、公開更新、学習者向け表示、削除まで1/1成功、fail/skip/todo 0。
  - `npm run build`: 成功。Vinextのclient/server/RSC/client/SSR全5段階と全ルートを生成。
  - Chrome PC（1414px幅）: `/roadmaps/1`に段階名「道具に慣れる」「Webを作る」がなく、講習会2件が直接並ぶこと、`scrollWidth === innerWidth === 1414`を確認。
  - Chrome 390×844: 同じ講習会順と進捗を目視し、`scrollWidth === innerWidth === 390`。管理フォームは段階名入力0件、段階説明入力0件、公開トグルを公開→下書き→公開と操作でき、保存せず元状態へ戻した。
  - Chrome console: warning/error 0件。既存試用D1は追加migrationのみで起動し、既存講習会・完了記録を削除していない。

- 2026-09-02 講習会詳細の重複整理後:
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト9/9、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。
  - Chrome PC（1280×900）: 再放送fixtureの第1回で通常開催ラベル0件、再放送ラベル1件、学習状況カード内の教材リンク0件、本文の教材リンク2件を確認。
  - Chrome 390×844: 同じ表示件数を保ち、`innerWidth === scrollWidth === 390`。通常回はタイトルから始まり、再放送だけに例外ラベルが付くことを目視確認。
  - Chrome console: warning/error 0件。教材・開催データ、複製元、URLフラグメントには変更なし。

- 2026-09-02 追加内部レビュー反映後:
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト9/9、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。最初のAPIテストは表示用dev serverとの多重起動を検出して停止し、同サーバーを一時停止して再実行後に全ゲート成功、確認用サーバーを`http://localhost:3000`へ再起動した。
  - Chrome PC（1280×900）: プロフィールに3タブを内容幅で表示し、重複説明がないことを確認。右矢印、End、Homeで選択タブ、フォーカス、対応tabpanelが一緒に切り替わることを確認。
  - Chrome PC: `/admin`の講習会作成操作が1ボタンだけで、通常フォームの選択肢がないことを確認。ボタンから`/admin/workshops/new`の3段階ウィザードへ遷移した。
  - 旧`/admin/workshops/new?mode=form`への直接アクセスも案内付き3段階表示となり、入力方法リンクが現れないことを確認。
  - Chrome 390×844: プロフィールの3タブを幅114pxずつ同時表示。`innerWidth === scrollWidth === 390`。運営向けページも講習会作成1ボタン、横あふれなしを目視確認。
  - Chrome console: warning/error 0件。basiQ-uiボタンの外観は上書きせず、タブのPC/モバイル配置だけ既存レイアウトCSSで切り替えた。

- 2026-09-02 内部レビュー反映後:
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト9/9、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。
  - API統合テスト: ロードマップの下書き作成、管理一覧/詳細、公開への編集、学習者向け詳細への反映、削除後404までを隔離D1で確認。通常の`.wrangler`試用データは変更していない。
  - Chrome PC: ホーム検索バーから`/workshops?q=Git`の1件結果へ遷移。学習者ナビに検索専用項目がなく、ホームに公開5件が全件表示されることを確認。
  - Chrome PC: `/admin`から案内付き/通常講習会作成、ロードマップ新規作成、公開中ロードマップの閲覧/編集へ到達。既存ロードマップの段階、選択講習会、公開状態、削除導線を確認。
  - Chrome 390×844: 運営ページとロードマップ編集で`scrollWidth === innerWidth === 390`、モバイル下部ナビ4項目、保存操作の固定表示を確認。console warning/error 0件。

- 2026-09-02 ホーム/ナビ整理後:
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト7/7、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。APIテストのため確認用dev serverを一時停止し、完了後に`http://localhost:3000`で再起動した。
  - 実ブラウザ PC（1280×900）: ホームの公開講習会4件と条件検索5件を3列の共有カードで表示し、班マーク`Web`/`アル`/`Sys`、プロフィール表記、大型登録パネルの削除を目視確認。
  - `/workshops?view=roadmaps`直リンクで見出し・document titleがともに「ロードマップ」、条件検索面に探し方タブが0件であることを確認。
  - 実ブラウザ 390×844: ホーム/検索を1列カードで表示し、プロフィール画面と人物アイコンを確認。ホーム、検索、プロフィールはいずれも`scrollWidth === innerWidth === 390`。
  - ブラウザconsole: warning/error 0件。読み込み失敗を示す`role=alert`も0件。

- 2026-09-02 条件検索カード化後:
  - `npm run check`: 成功。TypeScript、ESLint、ドメインテスト7/7、隔離D1 API統合テスト1/1、Vinext build全5段階、fail/skip/todo 0。
  - 絞り込み横配置後も`npm run check:static`と`npm run build`が成功。
  - 実ブラウザ PC（1280×720）: 5件を幅309pxの3列カードで表示。1000px幅では幅332pxの2列へ切り替わり、console error 0件。
  - 実ブラウザ PC（1280×720）: 絞り込み4要素を結果直上の1行に配置。フォーム下端275px、結果上端311pxで順序と間隔を確認。
  - 実ブラウザ 390×844: 絞り込みは折りたたみ内の1列、カードは358px幅の1列。`scrollWidth === clientWidth === 390`、console error 0件。
  - キーワード`Git`で1件へ絞り込み、カード全体から`/workshops/1`へ遷移し、戻ると`?q=Git`と1件表示が復元されることを確認。

- 2026-09-02 UI再設計後の個別ゲート:
  - `npm run check:static`: 成功。TypeScript、ESLint、ドメインテスト7/7、fail/skip/todo 0。
  - `npm run test:api`: 成功。隔離D1 API統合テスト1/1、fail/skip/todo 0。表示用dev serverを一時停止し、終了後に同じ`http://localhost:3000`で再起動した。
  - `npm run build`: 成功。Vinextの全5段階と全ルートを生成。
- `npm install`: 成功、lockfileどおり`up to date`。
- `npm run check`: 成功。
  - TypeScript: 成功。
  - ESLint: 成功。
  - ドメインテスト: 7/7成功、fail/skip/todo 0。
  - API統合テスト: 1/1成功、fail/skip/todo 0。隔離した空D1でmigration/seed、単発/複数回/再放送/下書き、入力拒否、循環保存の原子性、登録、再起動後の永続化、検索、全項目複製と独立編集、完了の並行冪等性、プロフィール/バッジ、ロードマップ進捗、取消、404を確認。
  - production build: Vinextのclient/server/RSC/client/SSR全5段階と全ルートが成功。
- 実ブラウザ PC（1440×1000）:
  - seedだけの隔離D1で一覧、登録、詳細、完了、プロフィール、ロードマップを一巡。
  - `#3`直アクセスと回切替後の`#2`、1回開催の回見出し0件、同じ第1回の通常/再放送2開催を確認。
  - 通常フォームと案内付きの両方で登録し、再読込後の公開詳細を確認。
  - 次回複製後にコピー元と異なるタイトル/場所へ編集し、元と同期しないことを確認。
  - 循環関係で保存を失敗させ、エラー表示と入力保持を確認。
- UI再設計後は`/`、条件検索、ロードマップ検索、1回詳細、複数回/再放送`#3`、ロードマップ、学びの記録、登録を新規ブラウザタブで再巡回し、全画面で見出し表示と横あふれなしを確認。検索0件と存在しない講習会の404・再試行も確認した。
- 実ブラウザ 390×844:
  - 一覧、1回詳細、複数回/再放送、通常フォーム、0件、404失敗を確認。全確認画面で`scrollWidth === 390`。
  - 空の必須フォーム送信で先頭必須入力へフォーカスし、`2px solid`のフォーカス表示を確認。
- UI再設計後も主要5画面を正確な390px幅で再確認し、すべて`scrollWidth <= clientWidth`。絞り込みdetailsの開閉、プロフィール3タブ、ロードマップ検索タブ、回番号フラグメントを操作した。
- ブラウザconsole: 既存記録のChrome確認に加え、UI再設計後は新規in-app browserタブで全主要導線、0件、404を巡回しerror 0件。Chrome拡張が`html`へ追加する既知属性だけはルートの`suppressHydrationWarning`で抑制。
- QA画像:
  - `app/qa/beta-desktop-workshops.jpg`
  - `app/qa/beta-mobile-rebroadcast.jpg`
  - `app/qa/beta-mobile-rebroadcast-entry.jpg`
  - `app/qa/redesign-final-desktop.jpg`
  - `app/qa/redesign-final-mobile.jpg`

## 既知の問題・未実装範囲

- 認証、権限、複数ユーザー、個人データ方針は未実装。固定`demo-learner`だけを使う。
- 参加者、出欠、開催履歴、監査ログ、講習会のアーカイブ/復元、教材ファイル配信、共同編集、自動推薦、ランキング、外部連携は今回のβ中心体験外。
- 既存αテーブルは保持するが、α行をβモデルへ自動変換しない。取り込み規則を確定するまでは、誤変換より原本保持を優先する。
- 日時未定の公開は許容する。公開権限や承認フローは認証方針と合わせて今後決める。
- 開発専用`drizzle-kit`の既知の推移依存問題は前回監査から継続。今回依存追加はなく、本番依存へは持ち込まない。
- 通常の`app/.wrangler/`には以前のブラウザQAで作成したβ講習会と完了記録が残る。今回のUI再設計確認はその利用者所有データを読み取り、API統合テストだけを別の一時D1で行った。既存試用データは削除していない。

## 再開地点

1. [INTERNAL_TRIAL.md](./INTERNAL_TRIAL.md)で少人数の内部試用を行い、今回の左ナビ、比較行、右レール、390px下部ナビが実運用に合うかを`feedback/`へ記録する。
2. 権限とαデータ取り込み規則を決めた後、公開承認・監査・一括移行を別チェックポイントにする。
3. 具体的な運用上の詰まりが得られるまでは、広い未接続機能を追加しない。

## ブロッカー

- なし。

## 参照

- 再現手順: `README.md`
- 実行計画: `PLAN.md`
- 判断理由とsuperseded関係: `DECISIONS.md`
- 内部試用: `INTERNAL_TRIAL.md`
