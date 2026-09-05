# 1-Monthon 本番用統合コンテキスト

更新日: 2026-09-05
状態: P4で確定した本番機能・データ文脈。講習会編集の最新差分はP5以降で実装する。

## 正本と優先順位

1. 本人の最新の明示判断。
2. `LECTURE_SESSION_FLOW_SPEC.md`のLecture、Session、Resource、Relation、Flow仕様。
3. `BETA_CHANGE_AUDIT.md`の採用欄。
4. `BADGE_ALPHA_SPEC.md`の講習会バッジ仕様。
5. `PROJECT_BRIEF.md`の目的、中心体験、スコープ。
6. 過去資料は矛盾しない範囲の背景情報としてだけ使う。

βコード、βの画面、CSS、URL、DB、fixture、技術構成は正本ではない。画面上の知見は`BETA_SCREEN_DESIGN_REFERENCE.md`へ隔離する。

この文書と関連仕様にあるTypeScript・GraphQL風の型はドメイン契約を説明する擬似表現であり、実装技術の指定ではない。本番実装ではmainの技術構成、既存アーキテクチャ、命名規則、データアクセス、migration、テスト方式を技術上の正本とする。仕様上必要な意味と制約を保ちながら、物理schemaやコード構造はmainへ合わせる。

## プロダクトの目的

traP内で行われる講習会を一度きりの催しにせず、学習内容、対象者、前提、開催情報、Resource、運営手順、学ぶ順番、完了記録を次の人が探して再利用できる資産にする。

中心体験は、運営が講習会と開催を登録し、学習者が検索またはロードマップから発見し、Resourceで学習し、完了を自己申告し、プロフィール・バッジ・ロードマップ進捗へ同じ事実が反映される流れである。

## 利用者

- 学習者: 過去・今後のLectureを探し、SessionのResourceで学習または開催へ参加し、完了を記録する。
- 講習会運営: LectureとSessionを準備・登録し、Flowを使って運営知識を再利用する。
- 投稿者: Flowやロードマップを作成・公開する。同じ人が複数の立場を持てる。

## ドメインモデル

- Lectureは、ある学年度・期間に実施する一連の講習企画である。
- SessionはLectureを構成する各回・各編で、必ず1日で完結する。
- LectureはSessionを0件以上持つ。SeriesやEventなどの追加階層は作らない。
- 年度はLectureの`academicYearStart`と`academicYearEnd`で表し、Sessionの日付から導出しない。
- Sessionは自由な名前と明示的な`order`を持つ。名前、日時の重複を許容する。
- Sessionは`draft`または`published`。Lectureの公開可否はpublished Sessionが1件以上あるかで導出する。
- 講義資料`material`はLectureとSessionがそれぞれ最大1件持ち、`url`と任意の`title`を保持する。title未設定時のUI表示は「講義資料」とする。その他の`resources`は`title?`と`url`を持つ配列で、どちらも自動継承しない。
- 再放送は別Sessionとし、同じLecture・同じ`order`の通常Sessionを`replayOfSessionIds`で参照する。複製後の入力値は独立して編集する。
- LectureRelationは`prerequisite`、`previous_year`、`recommended_next`を片方向に保存する。
- 場所はオンライン・オフラインを構造化せず`location`へ自由記述する。
- knoQはSessionだけがイベントURLを保持し、同期しない。
- Sessionの講師は個人0〜1名、Lectureの運営担当は個人1名またはグループ1件とする。グループを選んだ時点の基本名を`groupName`へsnapshotとして保存する。既存データで名前を復元できない場合だけ未設定を許す。問い合わせ先は運営担当へ統合し、独立属性を持たない。
- 分野はマスター参照、対象者は自由記述、初心者向けは難易度と別のbooleanとする。
- soft deleteは設けず、初期リリースではLecture、Session、FlowClass、Flow、Roadmapの削除機能を実装しない。

完全な型は`LECTURE_SESSION_FLOW_SPEC.md`を参照する。

## Flow

- 従来「ウィザード」と呼んだ案内資産をFlowと呼び、Stock上の再利用原本`FlowClass`と、Lecture / Sessionへ適用した`Flow`の2段で管理する。
- `FlowClass`は`id`、`type`、`text`を持つ。`type`は`lecture_pre`、`session_main`、`lecture_post`のいずれかで、特定の対象は参照しない。
- 適用時に`FlowClass.id`とその時点の`text`を、新しいFlowの`flowClassId`と`text`へコピーする。後からFlowClassを更新しても既存Flowは変化しない。
- Flowは`flowClassId`、`targetId`、コピーした`text`、`formatVersion`、`currentPage`を持つ。Lectureは事前・事後を各1件、Sessionはメインを1件、常に持ち、不一致、対象なし、同じ対象属性への複数Flowを許可しない。
- 参照後の`FlowClass.type`は変更しない。typeを変える場合は別のFlowClassを作る。
- 初期リリースでは`FlowVersion`を設けない。Stock上で版履歴、差分、特定版の再利用が必要になった時点で`FlowClassVersion`を追加する。
- Flowは講習会作成画面の別名ではなく、複数のFlowClassから選んで対象へ適用・実行する案内資産である。
- `formatVersion`は初期値1とし、FlowClassからFlowへコピーする。各ページは`# `で始まり、正確な`---`行で区切る。`{{ path }}`は単一属性入力、`{{ edit path }}`は配列・複合属性モーダル、`[[ path ]]`は値展開、`- [ ]` / `- [x]`はFlow.text自身へ状態を持つチェック、`copy` fenceはコピー可能文、通常fenceはコード表示とする。
- Lectureの事前・事後では許可された`lecture.*`、Sessionのメインでは許可された`session.*`を更新できる。Flow固有回答、タスク安定key、完了状態、条件分岐、ループ、include、任意式、API呼出は扱わない。
- Flowは`---`ごとに1ページを表示する。チェックはbackendの専用操作が現在本文を解析して該当markerだけを更新し、frontendからFlow全文を送らない。ページ位置は保存するが、完了後の読み取り専用化は設けない。
- 使用FlowClassを変更すると、対象属性は維持し、同じFlowの`flowClassId`、`text`、`formatVersion`、チェック状態、ページ位置を現在のFlowClassから作り直す。
- FlowClassは`listed`でStock掲載を制御する。適用済みFlowは掲載状態と無関係に再開でき、FlowClassを物理削除しない。

## 発見

- 学習者の最も目立つ入口は検索とする。
- キーワードはLecture名と説明を部分一致検索する。
- 学年度と分野を絞り込み候補とする。旧「班」絞り込みは新モデルの運営グループまたは分野へ意味を分解する。
- Lectureとロードマップは発見の二本柱である。一つの検索結果へ統合するか、明確な別入口にするかは画面設計で比較する。
- 非公開Lectureを学習者の検索・ホーム・ロードマップへ表示しない。
- Session単独の学習者URLは設けない。Lecture詳細は通常Sessionだけで回を構成し、単発なら`/lectures/<lectureId>`、複数回ならタブ名と同じ`/lectures/<lectureId>#第N回`とする。再放送しかない`order`は回数へ含めない。
- 0件、該当多数、失敗時から条件変更または別の探し方へ進める必要がある。

## Lecture・Sessionの登録と閲覧

- 物理モデル上LectureはSession 0件も表現できるが、通常の新規作成は講習会名、事前FlowClass、第1回FlowClass、事後FlowClassを必須とし、Lecture、第1回draft Session、3件のFlowを同じtransactionで作る。
- schemaとして有効なdraft Sessionは、日時・場所・Resourceなどの追加必須条件なしでpublishedへ変更できる。
- 入力経路にかかわらず同じLecture・Sessionを編集する。
- Sessionの予定・終了・進行中は別状態として保存せず、必要なら日時から算出する。
- 通常Sessionは既定として扱い、再放送などの例外だけ関係を明示する。
- 同一画面の同一Resource導線を重複させない。ResourceがLectureとSessionのどちらに属するかを保つ。
- 読込失敗時は未取得フォームを編集可能にせず再試行を提示する。
- 保存後に保存内容と公開状態を確認でき、編集へ戻れるようにする。
- 編集タブは`講習会`、順序付きの`第N回`、開催追加`+`、`事後`、`一覧編集`、その他操作`…`とする。各対象タブの中身は対応Flowそのものとする。
- `+`は空のSessionまたは既存Session複製を選ぶ開催追加モーダルとし、開催FlowClassも選択する。複製時の新Flowは元Flowの状態をコピーせず、元Flowが参照するFlowClassの現在本文から作る。
- 開催順は専用ハンドルのドラッグ操作、上下ボタン、日時順補助操作で並べ、swapを表示した後に明示保存する。通常の属性自動保存とは別の複合操作として扱う。
- 一覧編集はPCで属性ごとの横レーンにSession名付き小カードを並べ、モバイルでは同じ属性単位で縦積みする。配列・複合値は要約から中央モーダルを開く。
- 公開変更はFlowと一覧編集の両方から行える。推奨項目の未設定を確認モーダルで警告するが、schemaとして有効なら公開を妨げない。最後のpublished Sessionをdraftへ戻す場合はLectureが学習者向け画面から非表示になる影響も警告する。
- `…`は使用Flow変更、開催順変更、変更履歴を開く。変更履歴は閲覧・コピーのみで、復旧操作は初期版に含めない。一覧編集から保存済みLecture / Session現在値をJSONで書き出せるが、JSON入力は設けない。

## 完了・バッジ・プロフィール

- 完了はSession単位の本人による自己申告で、参加と自習を同じ完了として扱う。
- Lecture詳細の各回から通常Sessionの完了を記録できる。`replayOfSessionIds`が1件以上ある再放送Sessionには完了操作を置かず、完了記録を作らない。
- 完了前の確認画面は必須にせず、本人が取り消せる。取消履歴は保持しない。
- 運営による一括完了と外部情報連携は初期範囲に含めない。
- 同じ利用者・同じSessionの有効な完了は1件にまとめる。年度が異なるLectureに属するSessionは別の完了として扱う。
- Lecture相当の完了は、その時点でpublishedな通常Sessionを1件以上持ち、そのすべてを完了した状態とする。後から通常Sessionを追加・公開すれば未完了へ戻り、すべてを完了すると再び完了する。バッジとロードマップ項目はこの条件から導出し、別状態として保存しない。
- 講習会バッジは`BADGE_ALPHA_SPEC.md`のソリッド幾何学紋章を採用する。図形は`badge-alpha-v1:${lectureName}`から決定論的に生成し、同名Lectureは年度や内部IDが異なっても同じ図形にする。
- バッジ詳細ではLecture名と対応Lectureへの導線を示す。獲得日は必要な通常Sessionの完了日時のうち最後の日時とする。
- プロフィールは本人と他の部員へ同じ初期情報を表示し、記録ごとの公開範囲は設けない。
- 完了数は表示できる。順位と学習時間は表示しない。
- プロフィールはバッジ、完了した開催、ロードマップの3タブとし、ARIA対応と左右矢印・Home・End操作を備える。

## ロードマップ

- Lectureと特定の通常Sessionを混在できる一次元の順序リストとして、目標に沿った一本道の学び方を示す。Stage、段階名、段階説明、項目メモは持たない。
- Itemは安定ID、`targetType`（`lecture`または`session`）、`targetId`を持つ。同じ対象を一つのRoadmapへ重複配置しない。分岐、選択肢、「N件中M件」の条件は初期リリースに含めない。
- 専用の完了状態を保存しない。Lecture Itemはpublishedな通常Session全件の完了、Session ItemはそのSessionの完了から導出し、先頭から最初の未完了Itemを現在地とする。
- 再放送Sessionは選択・保存の対象外とする。公開Roadmapは1件以上のItemを持ち、Lecture Itemにはpublishedな通常Sessionが1件以上、Session Itemにはpublishedな通常Sessionを要求する。
- 公開・下書きを区別し、下書きを学習者へ表示しない。公開後の編集は同じRoadmapへ即時反映し、進捗は現在の並びと完了記録から再計算する。初期リリースではRoadmap版を持たない。
- Roadmap自体の削除機能は設けない。編集画面では順序リストからItemを外せる。

## 品質要件

- 通常、読込中、0件、失敗、再試行、保存中、保存失敗、保存成功、下書き、公開を設計・検証する。
- 属性自動保存の待機中・成功・失敗、後勝ち競合警告、localStorage差分の自動復元・確認・コピー・破棄も設計・検証する。未送信差分だけを保持し、7日で失効させる。
- 状態を重複保存しない。取消や変更が関連表示へ一貫して反映される。
- 操作と状態を文言・構造で区別し、色だけへ依存しない。
- タブや開閉UIには対応するARIA状態とキーボード操作を備える。
- PCとスマートフォン幅で主要導線、フォーカス、読み上げ順、横あふれを確認する。
- 画面ごとに人間が設計を確認した後に実装する。
- 不明確な設計を補助説明文の追加だけで隠さない。

## 初期権限

- 認証済みのtraP部員は全員、Lecture、Session、FlowClass、Flow、Roadmapを作成・編集できる。
- 公開・下書きの変更も同じ利用者へ許可する。画面だけでなくAPIにも同じ規則を適用する。
- 完了記録の追加・取消は本人だけが行える。
- 閲覧と編集はいずれもNeoShowcaseの部員認証を前提とし、バックエンドが`X-Forwarded-User`を受け取る。ローカルだけ`DEV_USER`を使える。更新イベントの`actorId`にはtraQ directoryの不変User IDを保存する。

## 編集履歴

- Lecture、Session、FlowClass、Flow、Roadmapの変更は、属性ごとの`AttributeUpdateEvent`として記録する。
- イベントは対象、属性path、変更前後のJSON値、編集者、時刻、同じ保存操作を束ねるchangeSetを持つ。
- 現在値と更新イベントを同じtransactionで保存し、現在値を正本とする。イベントログを正本にするevent sourcingは採用しない。
- Flowの`flowClassId`、`text`内チェック、`formatVersion`、`currentPage`をFlow属性の更新イベントとして保存する。FlowからLecture / Sessionを変更した場合は、対象側にも通常編集と同じ属性イベントを保存する。履歴表示ではLecture / Sessionデータ変更とFlow操作を分ける。

## 実装技術

- Go 1.26.4、Echo v4、oapi-codegen strict server
- Vue 3.5、Vue Router、Pinia、openapi-fetch、BasiQ UI
- MariaDB 11.8系、埋め込みmigration、`NS_MARIADB_*`接続設定
- Lecture / SessionはMariaDBのAUTO_INCREMENT BIGINTを内部IDとして使い、APIでは10進文字列で表す。その他のentityはUUIDを使う
- Lecture / Session属性は内部revisionを増加させるが、不一致を409で拒否しない。requestの`baseValue`と現在値を比較し、後勝ちで保存したうえで競合をresponseだけに示す。FlowClass Stock編集とRoadmap編集は現行の明示保存、`expectedRevision`、競合409を維持する。
- 検索条件はURL queryへ保持し、複数キーワードはAND、年度はLectureの開始・終了年度との重なりで判定する

## 本番へ持ち込まないもの

- βのソースコード、DB、URL構造、コンポーネント、CSS、fixture。
- βで固定したVinext・D1・Fontsource・npm構成と、β固有のVue／BasiQ UIコンポーネント実装。
- 回番号中心のSessionモデル、年度の日時導出、単一の再放送元ID。
- 最後のSession削除禁止、Lecture削除時の完了記録cascade削除。
- βで固定したカード列数、ナビ位置、色、線、ボタン外観、教材位置、タブ数。
- βのFlow物理削除API・画面。
- traQ確認CLI、eyes、Keychain、Cron。

## 初期リリース後に再検討する判断

- Roadmap達成バッジ、FlowClassVersion、公開後の版履歴。
- 主要コンテンツのアーカイブ、参照切れの整理、履歴保持期間。
- 退部後のUser/Group表示と運営担当の引き継ぎ。
- バッジの書き出し・共有と外部サービス連携。
