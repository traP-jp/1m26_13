# Status

更新日: 2026-09-04
フェーズ: 固定commitの確定画面設計を本番表示層へ再統合中。

## 現在地

β版のコード、D1、URL、CSSを土台にせず、`traP-jp/1m26_13`のmainを基点として
リポジトリ直下へ本番を新規構築した。mainのGo/OpenAPI/Vue/MariaDB/NeoShowcase構成に、
本人指定のEcho v4を組み合わせている。

`PRODUCTION_CONTEXT.md`、`LECTURE_SESSION_FLOW_SPEC.md`、`FLOW_FORMAT_ANALYSIS.md`、
`BADGE_ALPHA_SPEC.md`の決定済み仕様を実装した。βは`BETA_CHANGE_AUDIT.md`の採否と
`BETA_SCREEN_DESIGN_REFERENCE.md`の画面検討材料だけを参照し、実行時依存はない。

`references/ui-canonical/screens.json`の固定commitを視覚的正本として、本番のAPI、router、認証、永続化、入力、エラー処理を保ったまま表示層を再統合している。共通シェルは正本の248pxサイドバー、82pxブランド領域、50pxナビ行、運営カード、58pxモバイルヘッダーへ合わせた。
ホーム／探索は正本のフィルター、件数見出し、3列カードを維持し、ロードマップ一覧も同じカード構造とレスポンシブ列へ統一した。390×844と1440×900の両方で横overflowがないことを実寸計測した。
Lecture／Session詳細は正本の最大1160px、左右40px余白、本文＋310px補助欄の配置へ合わせた。モバイルでは左右16px、補助欄と本文を縦に並べ、通常Sessionの完了操作と再放送の非表示条件を維持している。
Roadmap詳細は正本の42px左右余白、進捗＋現在地、学習順＋318px共有欄へ合わせ、完了済み項目間の接続線とメタ情報の区切りも復元した。390×844では進捗、現在地、学習順、共有欄の順に縦積みする。
Profileは固定commit内で欠落していたprototype pathを同commitの実画面とCSSで補い、学習統計、独立した3タブ、2列バッジ一覧＋詳細欄、完了Session一覧、Roadmap進捗一覧を復元した。badge alphaの決定論的SVGは一覧と詳細の両方で使う。
運営ホームは正本の最大1160px、最近編集した講習会の4列一覧、検索付きRoadmap管理へ合わせた。モバイルでは左右16pxと一覧の縦積みを適用し、公開・下書きの表記も統一した。

## 実装済み

- Go 1.26.4 + Echo v4 + oapi-codegen strict server。OpenAPIをGo/TypeScript双方の正本にした。
- MariaDB migration、UUID、revision楽観ロック、属性単位の更新イベント。
- NeoShowcase `X-Forwarded-User`認証、開発用`DEV_USER`、traQ User/Groupのbackend cache。
- Lecture/Sessionの登録・編集・公開、Resource、講師、運営、問い合わせ、分野、関係。
- 公開Lectureのキーワード・年度・分野検索。検索条件はURL queryへ保持する。
- 再放送を別Sessionとして保持し、通常検索・Lecture内選択・完了操作から除外。publishedな直接URLだけ表示する。
- Session単位の自己申告完了。公開中の通常Session全件からLecture完了、badge alpha、Roadmap進捗を導出する。
- StockのFlowClassと適用時スナップショットFlow。`lecture_pre`、`session_main`、`lecture_post`、formatVersion 1、安定task key、途中保存・再開・完了を実装した。
- 段階名・説明と順序付きLectureを持つ一本道Roadmap。公開条件、次のLecture、進捗を実装した。
- プロフィールのbadge、完了Session、Roadmapの3タブ。矢印/Home/End操作に対応した。
- `badge-alpha-v1:${lectureId}`による決定論的なソリッド幾何学SVGとモーション低減。
- Lecture、Session、FlowClass、Flow、Roadmapの削除API・画面は実装していない。
- BasiQ UI beta.3のCard、Tabs、FormField、Input、Textarea、Switch、Checkboxを使い、確定した画面設計を全導線へ反映した。
- デスクトップは固定サイドバー、モバイルは上部ヘッダーと下部ナビゲーションを共通化した。画面設計の削除操作だけは、確定済み製品仕様に従って除外した。
- 講習会編集を仕様基準で再構成した。Lecture属性、構造化Resource・Relation、順序付きSession、複数元Sessionによる再放送、内容複製、`lecture_pre → session_main → lecture_post`の対象対応、Sessionから導出する公開状態、保存後確認、競合案内、初期読込失敗時の編集保護を一画面で扱う。
- 講習会編集の横タブをFlow単位へ修正した。事前Flow、各SessionのメインFlow、事後Flowを1 Flow 1タブで並べ、未適用時は同じ位置でFlowClassを選べる。開催追加とLecture設定は補助タブとして分離した。
- 各FlowタブへFlow Rendererを直接埋め込み、本文、入力、task、copy/code、ページ進捗、途中保存、完了をタブ内で操作できるようにした。Flow適用後も別画面へ遷移せず、そのタブで開始する。Session編集と複製は設定タブへ集約した。

## 最終検証

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
- Lecture編集を正本の30px上余白、横幅1160px、横タブ、中央800pxの実行領域へ合わせた。各タブは引き続き1 Flowに対応し、適用済みFlowはタブ内runner、未適用枠は同じ位置のFlowClass選択を表示する。1440×900と390×844の両方で横overflow 0、開催タブへ切替後も別画面へ遷移しないことを確認した。
- Roadmap編集は確定仕様の段階付き一本道を保ったまま、正本の最大1060pxと28/36/72pxのページ余白へ合わせた。タブレットは左右24px、390px幅では左右14pxと固定保存バーを適用し、1440×900と390×844で横overflow 0を確認した。
- 正本8画面の再統合完了後、frontendのAPI型生成check、formatter、全lint、Vue型検査、Vitest 6/6、Vite buildとbackend全Go testを再実行して成功した。運営ホーム、Lecture編集、Roadmap編集は1440×900と390×844で横overflow 0、console warning/error 0件を確認した。
- 追加目視レビューに従い、ホームの講習会カードから初心者ラベルを除去した。通常Sessionだけを数え、`1回完結`／`全N回`／`開催準備中`、運営班、年度の順で正本どおり表示する。
- Lecture／Session詳細の390px表示は本文を先、学習状況・開催情報の補助欄を後にした。実ブラウザの要素位置で本文上端が補助欄上端より前で、横overflow 0、console warning/error 0件を確認した。
- Lecture／Session詳細の完了操作は画面全体を再読込せず、対象SessionとLecture集計だけを局所更新する。390×844の実ブラウザで完了・取消を往復し、URL、選択回、scrollYが前後で同一、DB状態も初期値へ戻ることを確認した。

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

正本インデックス8画面の本番表示層への再統合は完了した。ローカル確認環境を維持し、最終のfrontend/backend回帰と作業ツリー確認を行う。
