# Status

更新日: 2026-09-05
フェーズ: P9 講習会編集の実装と統合QAを完了。

## 現在地

β版のコード、D1、URL、CSSを土台にせず、`traP-jp/1m26_13`のmainを基点として
リポジトリ直下へ本番を新規構築した。mainのGo/OpenAPI/Vue/MariaDB/NeoShowcase構成に、
本人指定のEcho v4を組み合わせている。

`PRODUCTION_CONTEXT.md`、`LECTURE_SESSION_FLOW_SPEC.md`、`FLOW_FORMAT_ANALYSIS.md`、
`BADGE_ALPHA_SPEC.md`の決定済み仕様を実装した。βは`BETA_CHANGE_AUDIT.md`の採否と
`BETA_SCREEN_DESIGN_REFERENCE.md`の画面検討材料だけを参照し、実行時依存はない。

`references/ui-canonical/screens.json`の固定commitを視覚的正本として、本番のAPI、router、認証、永続化、入力、エラー処理を保ったまま表示層を再統合している。共通シェルは正本の248pxサイドバー、82pxブランド領域、50pxナビ行、運営カード、58pxモバイルヘッダーへ合わせた。
ホーム／探索は正本のフィルター、件数見出し、3列カードを維持し、ロードマップ一覧も同じカード構造とレスポンシブ列へ統一した。390×844と1440×900の両方で横overflowがないことを実寸計測した。
Lecture詳細は正本の最大1160px、左右40px余白、本文＋310px補助欄の配置へ合わせた。モバイルでは左右16px、補助欄と本文を縦に並べる。Session詳細はLectureへ統合し、学習者向け表示は通常Sessionだけを`order`順の回として扱う。
Roadmap詳細は正本の42px左右余白、進捗＋現在地、学習順＋318px共有欄へ合わせ、完了済み項目間の接続線とメタ情報の区切りも復元した。390×844では進捗、現在地、学習順、共有欄の順に縦積みする。
Profileは固定commit内で欠落していたprototype pathを同commitの実画面とCSSで補い、学習統計、独立した3タブ、2列バッジ一覧＋詳細欄、完了Session一覧、Roadmap進捗一覧を復元した。badge alphaの決定論的SVGは一覧と詳細の両方で使う。
運営ホームは正本の最大1160px、最近編集した講習会の4列一覧、検索付きRoadmap管理へ合わせた。モバイルでは左右16pxと一覧の縦積みを適用し、公開・下書きの表記も統一した。

## 講習会編集の実装済み仕様

- Lecture事前、各Sessionメイン、Lecture事後は対象ごとにFlowを必ず1件持つ。講習会作成は講習会名と3種類のFlowClassを受け、Lecture、第1回draft Session、3件のFlowを同じtransactionで作る。
- 編集タブは`講習会`、`第N回`、`+`、`事後`、`一覧編集`、`…`とする。対象タブにはFlowそのものを表示し、`+`はSession追加、`…`はFlow変更・開催順・履歴を扱う。
- Flow固有answers、tasks、status、完了、完了後read-only、task安定keyを廃止する。チェックはFlow.text内、ページ位置はcurrentPageを正本とし、backendのチェック専用操作で該当markerだけを更新する。
- Lecture / Session属性は入力停止・blurまたは複合値モーダル確定時に自動保存する。revision不一致で拒否せず後勝ちで保存し、同属性競合はresponseにだけ示してtoastを出す。FlowClass Stock編集とRoadmap編集は現行の明示保存・競合409を維持する。
- localStorageは未送信属性差分だけを7日間保持する。server値がbaseValueから変化済みなら自動適用せず、確認・コピー・破棄だけを提示する。
- Lecture運営担当は個人または1グループ、Session講師は個人0〜1名とする。問い合わせ先を運営担当へ統合する。Materialは`{url,title?}`で対象ごとに最大1件、その他のResourcesは複数とする。
- 公開前の推奨項目警告、最後のpublished Sessionをdraftへ戻す影響警告、属性レーン型一覧編集、開催順の明示保存、分類した履歴の閲覧・コピー、保存済み現在値のJSON書き出しを実装対象とする。
- `LECTURE_SESSION_FLOW_SPEC.md`のOpenAPI契約と、旧列をdropしないadditive migrationを実装した。

## 実装済み

- Go 1.26.4 + Echo v4 + oapi-codegen strict server。OpenAPIをGo/TypeScript双方の正本にした。
- MariaDB migration。Lecture / SessionはAUTO_INCREMENT BIGINT、その他のentityはUUIDを使い、Lecture / Session属性の後勝ち自動保存と属性単位の更新イベントを記録する。
- NeoShowcase `X-Forwarded-User`認証、開発用`DEV_USER`、traQ User/Groupのbackend cache。
- Lecture/Sessionの登録・編集・公開、Resource、講師、運営、問い合わせ、分野、関係。
- 公開Lectureのキーワード・年度・分野検索。検索条件はURL queryへ保持する。
- 再放送を別Sessionとして保持し、API、DB、運営編集、作成機能で管理する。学習者向けLecture詳細の回数、タブ、本文には再放送を含めず、完了操作も置かない。
- Session単位の自己申告完了。公開中の通常Session全件からLecture完了、badge alpha、Roadmap進捗を導出する。
- StockのFlowClassと適用時スナップショットFlow。`lecture_pre`、`session_main`、`lecture_post`、formatVersion 1、本文内チェック、currentPageを実装した。
- 段階名・説明と順序付きLectureを持つ一本道Roadmap。公開条件、次のLecture、進捗を実装した。
- プロフィールのbadge、完了Session、Roadmapの3タブ。矢印/Home/End操作に対応した。
- `badge-alpha-v1:${lectureName}`による決定論的なソリッド幾何学SVGとモーション低減。同名Lectureは年度や内部IDが異なっても同じ図形になる。
- Lecture、Session、FlowClass、Flow、Roadmapの削除API・画面は実装していない。
- BasiQ UI beta.3のCard、Tabs、FormField、Input、Textarea、Switch、Checkboxを使い、確定した画面設計を全導線へ反映した。
- デスクトップは固定サイドバー、モバイルは上部ヘッダーと下部ナビゲーションを共通化した。画面設計の削除操作だけは、確定済み製品仕様に従って除外した。
- 講習会編集を仕様基準で再構成した。Lecture属性、構造化Resource・Relation、順序付きSession、複数元Sessionによる再放送、内容複製、`lecture_pre → session_main → lecture_post`の対象対応、Sessionから導出する公開状態、自動保存、競合案内、未送信差分の復元を一画面で扱う。
- 講習会編集は`講習会`、各`第N回`、`+`、`事後`、`一覧編集`、`…`の横タブで構成する。講習会・開催・事後の各タブは対応するFlowと1対1であり、タブ内容はFlow本文、対象属性入力、本文内チェック、現在ページ、前後移動だけを表示する。
- `+`は空作成または複製によるSession追加、`一覧編集`は属性レーン、`…`はFlow変更、開催順、履歴、JSON書き出しを扱う。削除操作は置かない。

## 最終検証

- 空DBのMariaDB 11.8とEchoを`127.0.0.1:8082`で起動し、講習会作成から第1回draft Sessionと3 Flowが原子的に作られることを確認した。講習会、各開催、事後の横タブは常に対応Flowを内容として表示し、同一画面でチェック、属性自動保存、ページ移動が永続化される。
- 実ブラウザで講習会作成、開催追加、一覧編集、公開警告、開催順保存、データ／Flow履歴、FlowClass変更、Flow内属性入力を一巡した。タブは`講習会`、`第1回`、`+`、`事後`、`一覧編集`、`…`の順で、削除操作はない。
- 390px幅でdocumentの横overflowがないことを実測した。タブ列だけは内部で横スクロールし、Basiq Tabsのtab／tabpanel対応を維持する。
- frontendはOpenAPI生成差分、formatter、oxlint、ESLint、stylelint、Vue型検査、Vitest 24件、Vite production buildが成功した。backendはgofmt差分0、OpenAPI生成、go vet、全Go test、全package buildが成功した。
- Lecture / Sessionの連番化後、隔離した空のMariaDB 11.8へmigrationを適用し、Lecture ID `1`→`2`、Session ID `1`→`2`の自動採番、通常開催と再放送の同一order、公開Lectureへの両Session返却、再放送完了拒否をAPIスモークで確認した。バックエンド再起動後もmigration成功とデータ保持を確認した。
- Lecture詳細を通常Sessionだけで構成し、再放送と再放送しかない`order`を回数、タブ、カード、件数表示から除外した。複数回のfragmentはタブ名と同じ`#第N回`とし、旧`#N`とfragmentなしから正規URLへ置換する。単発はfragmentなしを維持する。
- Lecture 3を実ブラウザで確認し、旧`#2`が`#第2回`のpercent-encoded URLへ正規化され、タブ2件、通常カード1件、「再放送」0件、「この回で学べること」、bookアイコン付き教材ボタンを表示した。ArrowLeftで第1回へ切り替わり、URLとtabpanel本文も同期した。
- Lecture 1は通常＋再放送が同じ`order`でも単発扱いとなり、タブ・tablist・tabpanel 0件、fragmentなし、通常カード1件、「再放送」0件、横overflow 0を確認した。
- 390×844相当の同一origin iframeでLecture 3を確認し、viewport 390px、横overflow 0、対象者・前提知識が学習状況と今回の開催より前に並ぶことを要素位置で確認した。プロフィールの完了した開催リンクも`#第N回`へ統一した。
- 通常開催中心への変更後、frontendのAPI生成型check、formatter、oxlint、ESLint、stylelint、Vue型検査、Vitest 9/9、Vite production buildを再実行して成功した。
- 複数回Lectureの回本文を`LectureRoundDetail`へ抽出し、選択中のBasiqTabs tabpanel内へ対応roundの開催カード、講習会情報、学習状況を配置した。単発Lectureはtablist / tab / tabpanelを描画せず同じ本文を直接表示する。
- BasiqTabsの既定focus gutterはこの画面のtabpanelだけで相殺し、1280px実測でtabs root・tabpanel・本文gridの左右端と幅が一致、タブ直下24px、白背景、padding 0を確認した。390pxでも本文先行の縦積み、横overflow 0、console warning/error 0件だった。
- 学習者向け`/sessions/1`は404へ解決する。講習会編集はLecture / Sessionの連番が衝突する場合もFlow IDで重複排除し、横タブ1つにFlow 1つ、その内容にFlow本文・進捗・入力・task・完了操作が直接表示されることを実ブラウザで確認した。
- badge alphaのseedをLecture名へ変更し、同名なら同じSVG、異なる名前なら異なるSVGになるテストを追加した。固定済みの生成アルゴリズムは変更していない。

- frontend: API型生成check、oxfmt、oxlint、ESLint、stylelint、Vue型検査、Vitest 6/6、Vite build成功。
- backend: gofmt差分0、go vet、全Go test、全package build成功。
- MariaDB/Echoスモーク: 空DBへのmigrationと再起動、認証、Lecture/通常Session/再放送、再放送完了拒否、通常Session完了、FlowClass更新後のFlow本文保持、Flow一覧・完了、Roadmap作成直後の100%進捗、profile badge、Lecture/Flow属性履歴を成功。
- 実ブラウザ: ホーム検索、Lecture詳細、通常Session、再放送直接URL、プロフィールbadge、Roadmap編集、完了Flowを確認。
- 390×844: ホームとRoadmap編集で`documentElement.scrollWidth === innerWidth === 390`。console warning/error 0件。
- プロフィールtabは右矢印で選択、focus、tabpanelが同時に切り替わることを確認。
- 画面設計反映後のfrontendで、API型生成check、oxfmt、oxlint、ESLint、stylelint、Vue型検査、Vitest 6/6、Vite buildを再実行して成功。
- 講習会編集の再実装後もfrontend全ゲートを再実行して成功。実ブラウザで2タブ、Flowの対象対応、Session追加、再放送として複製、`?session=`からの対象編集、404時の入力欄非表示と再試行、console warning/error 0件を確認した。
- Flow単位タブへの修正後、frontendのVue型検査、ESLint、stylelint、Vitest 6/6、Vite buildとbackend全Go testを再実行して成功。実ブラウザで「全般・各開催・事後」の横タブ、Flow IDとの1対1表示、未適用Flowの選択欄、開催タブ内のSession編集を確認した。
- Flowのタブ内実行化後、実ブラウザで完了済み事前Flowの本文・入力・task・完了状態と、未適用の事後Flow選択面を確認した。
- Lecture編集を正本の30px上余白、横幅1160px、横タブ、中央800pxの実行領域へ合わせた。各タブは1 Flowに対応し、タブ内runnerだけを表示する。Flow追加はモーダルで対象とFlowClassを選択し、適用後は同じ画面の新しいFlowタブで開始する。開催追加は設定タブへ分離した。1440×900と390×844の両方で横overflow 0、Flowタブ切替後も別画面へ遷移しないことを確認した。
- Roadmap編集は確定仕様の段階付き一本道を保ったまま、正本の最大1060pxと28/36/72pxのページ余白へ合わせた。タブレットは左右24px、390px幅では左右14pxと固定保存バーを適用し、1440×900と390×844で横overflow 0を確認した。
- 正本8画面の再統合完了後、frontendのAPI型生成check、formatter、全lint、Vue型検査、Vitest 6/6、Vite buildとbackend全Go testを再実行して成功した。運営ホーム、Lecture編集、Roadmap編集は1440×900と390×844で横overflow 0、console warning/error 0件を確認した。
- 追加目視レビューに従い、ホームの講習会カードから初心者ラベルを除去した。通常Sessionだけを数え、`1回完結`／`全N回`／`開催準備中`、運営班、年度の順で正本どおり表示する。
- Lecture／Session詳細の390px表示は本文を先、学習状況・開催情報の補助欄を後にした。実ブラウザの要素位置で本文上端が補助欄上端より前で、横overflow 0、console warning/error 0件を確認した。
- Lecture／Session詳細の完了操作は画面全体を再読込せず、対象SessionとLecture集計だけを局所更新する。390×844の実ブラウザで完了・取消を往復し、URL、選択回、scrollYが前後で同一、DB状態も初期値へ戻ることを確認した。
- badge alphaは固定commit `574c7ec5`の生成器へ置き換え、PRNG呼び出し順、8配色、5ベゼル、5中間層、6コアを正本と一致させた。seedは`badge-alpha-v1:${lectureId}`のまま維持し、SVG文字列へユーザー入力を含めない。
- Profileは最新正本の72pxアバター、2列バッジ一覧＋288px詳細欄、選択表示、モバイル1列へ合わせた。完了した講習会・開催・Roadmap内完了の3指標は明示指定どおり実データの横並びでヘッダーに残し、完了Session／Roadmapタブも維持した。4件の代表バッジで1440×900と390×844を確認し、全バッジが異なる正本SVG、横overflow 0、console warning/error 0件だった。
- Flow追加は横タブ末尾の`＋ Flowを追加`からモーダルを開き、対象の3属性に一致する未適用FlowClassだけを選べる形へ変更した。非破壊のAPIモックを使い、1440×900と390×844の実ブラウザで、モーダル表示、適用後の同一URL、新しいFlowタブの選択、Flow本文の開始、横overflow 0、console warning/error 0件を確認した。Session追加は設定タブの開催一覧から独立して開く。
- ホームの講習会・RoadmapカードとRoadmap一覧カードは、hover時の影と上方向への移動を削除し、枠色だけが変わるフラットな表示へ統一した。1440×900の実ブラウザで両画面を実際にhoverし、`box-shadow: none`、`transform: none`、カード上端不変を確認した。focus-visibleでは2pxのaccent outlineを維持し、console warning/errorは0件だった。

## 再現手順

- 開発・検証: `README.md`
- API結合: `scripts/smoke-api.sh`
- 内部試用: `INTERNAL_TRIAL.md`

## 既知の制限

- 実在する複数の内部利用者による試用は未実施。手順と記録様式までは準備済み。
- archive、利用停止、履歴保持期間、退部後のUser/Group表示は初期範囲外。
- FlowClassVersionとRoadmap公開版は持たない。必要になった時点で追加する。
- Relation循環の業務上の妥当性までは検証しない。自己参照と同じ型の重複は拒否する。
- 検索は最大200件の単純部分一致で、全文検索・表記正規化・ページングは未実装。
- 本番デプロイと実traQ tokenの投入は行っていない。

## 次のチェックポイント

実在する複数の内部利用者で試用し、Flow文面と属性レーンの使い勝手を記録する。実装上のP5〜P9は完了しており、内部試用から具体的な修正が出るまでは追加実装を行わない。
