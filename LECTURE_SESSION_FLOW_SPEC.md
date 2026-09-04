# 講習会・開催 データ構造仕様

## 1. 概要

本仕様では、講習会に関する情報を以下の2つのオブジェクトに分離して管理する。

- **講習会（Lecture）**
  - ある年度・期間に実施する一連の講習企画を表す。
  - 例: 「CTF講習会」
- **開催（Session）**
  - 講習会を構成する各回・各編を表す。
  - 例: 「第1回」「Web編」「OSINT編」

```text
Lecture
├── Session: Web編
├── Session: OSINT編
└── Session: Crypto編
```

開催は必ず1日で完結する。

---

## 2. Lecture

### 2.1 役割

Lecture は、講習会全体に共通する情報を保持する。

日時・場所・講師など、各開催ごとに異なる情報は Session 側で管理する。

Lecture 自体には公開状態を持たない。

**published な Session を1つ以上持つ Lecture のみ公開対象とする。**

### 2.2 データ構造

```ts
type Lecture = {
  id: string

  name: string
  description?: string

  // 学年度
  academicYearStart: number
  academicYearEnd: number

  // 分野
  fieldId?: string

  // 運営担当。個人またはグループのどちらか1件
  organizer?: Organizer

  // 対象者
  targetAudience?: string

  // その分野の初心者向け（0→1）かどうか
  isIntroductory: boolean

  // 関連 traQ チャンネル
  traqChannelId?: string

  // 講義資料は最大1件
  material?: Material

  // 講習会全体に関連するその他のリンク
  resources: Resource[]
}
```

---

## 3. 年度

講習会は基本的に単年度で完結することを想定する。

ただし、年度をまたいで継続する可能性を考慮し、開始年度と終了年度を保持する。

```ts
academicYearStart: number
academicYearEnd: number
```

### 例

2026年度のみ:

```json
{
  "academicYearStart": 2026,
  "academicYearEnd": 2026
}
```

2026年度から2027年度にまたがる場合:

```json
{
  "academicYearStart": 2026,
  "academicYearEnd": 2027
}
```

表示上は以下のように扱う。

```text
start == end → 2026年度
start != end → 2026–2027年度
```

年度は暦年ではなく学年度を表す。

例えば、2026年10月と2027年1月に開催があっても、どちらも2026年度内であれば、

```json
{
  "academicYearStart": 2026,
  "academicYearEnd": 2026
}
```

となる。

---

## 4. Session

### 4.1 役割

Session は、Lecture を構成する「第1回」「Web編」「OSINT編」などの各開催を表す。

開催は必ず1日で完結する。

Session は `draft` または `published` のどちらかの状態を持つ。

初期リリースでは、schemaとして有効なSessionをdraftからpublishedへ変更する際に、日時・場所・Resourceなどの追加必須条件を設けない。

### 4.2 データ構造

```ts
type Session = {
  id: string
  lectureId: string

  // 「第1回」「Web編」「OSINT編」など
  name: string
  description?: string

  // Lecture 内での表示順
  order: number

  // 開催日時
  date?: Date
  startTime?: string

  // 教室・Discord・Qallなどをまとめて自由記述
  location?: string

  // knoQ イベントへのURL
  knoqUrl?: string

  // 講師は個人0〜1名
  instructorId?: string

  // 講義資料は最大1件
  material?: Material

  // この開催に関連するその他のリンク
  resources: Resource[]

  // 再放送元となる Session
  replayOfSessionIds: string[]

  status: "draft" | "published"
}
```

---

## 5. Session の日時

開催は1日で完結するため、終了日時は保持しない。

```ts
date?: Date
startTime?: string
```

開始時刻のみ保持する。`startTime`は`date`がある場合だけ保存できる。

日時未定の状態で draft を作成できるよう、どちらも optional とする。

draftからpublishedへの変更に、日時・場所・Resourceなどの追加必須条件は設けない。

---

## 6. 場所

開催形式を表すフィールドは持たない。

オンライン・オフライン・ハイブリッドの区別もせず、すべて `location` の自由記述として扱う。

```ts
location?: string
```

例:

```text
西9号館 W935
```

```text
Discord #ctf-workshop / Qall
```

```text
西9号館 W935 + Discord #ctf-workshop
```

---

## 7. 再放送

再放送は別の Session として作成する。

元となる Session は配列で保持する。

```ts
replayOfSessionIds: string[]
```

`replayOfSessionIds`が1件以上あるSessionは再放送または総集編として扱う。初期実装では、元Sessionと同じLectureを要求する。複製は入力値を作る操作であり、複製しただけでは再放送属性にならない。利用者が`replayOfSessionIds`を設定した結果から再放送・総集編を導出する。

Session追加時は、空のdraftを作るか既存Sessionの属性を複製するかを選び、同時に`session_main`のFlowClassを選ぶ。複製時も元Flowの本文、チェック状態、ページ位置はコピーしない。元Flowが参照するFlowClassの現在の本文から新しいFlowを作る。

学習者向けのSession単独URLは設けない。Lecture詳細は通常Sessionだけで回を構成し、単発なら`/lectures/<lectureId>`、複数回ならタブ表示と同じ`/lectures/<lectureId>#第N回`とする。再放送Sessionは学習者向けLecture詳細へ表示しない。複数回のfragmentは直接表示、再読込、ブラウザの戻る・進むで同期し、旧`#N`は新形式へ置換する。単発のfragmentは除去する。Session内部IDはAPIと運営編集だけで使う。

例:

```text
総集編
  replayOf:
    - 第1回
    - 第2回
    - 第3回
```

---

## 8. Material と Resource

講義で中心的に使う資料を`Material`、Wiki、アンケート、GitHubリポジトリなどのその他の関連リンクを`Resource`として分ける。LectureとSessionはそれぞれMaterialを最大1件、Resourceを複数件持てる。

```ts
type Material = {
  url: string
  title?: string
}

type Resource = {
  title?: string
  url: string
}
```

Materialのtitleは任意で、未設定時のUI表示は「講義資料」とする。LectureとSessionのMaterial / Resourceは独立して扱い、自動継承は行わない。既存ResourceのtitleからMaterialを推測して自動移行しない。

### 例

```json
{
  "material": {
    "title": "当日スライド",
    "url": "https://example.com/slides"
  },
  "resources": [
    {
      "title": "Wiki",
      "url": "https://example.com/wiki"
    },
    {
      "title": "受講後アンケート",
      "url": "https://example.com/survey"
    }
  ]
}
```

---

## 9. knoQ

knoQ は外部サービスとして扱い、IDではなくイベントURLのみ保持する。

```ts
knoqUrl?: string
```

knoQ との同期処理は行わない。

---

## 10. 講師・運営担当

### 講師

講師は Session 単位で保持する。

講師は個人のみを対象とし、Sessionごとに0〜1名を`instructorId`へ保持する。

### 運営

Lecture全体の運営担当は、個人1名またはグループ1件のどちらかとする。

```ts
type Organizer =
  | { kind: "user", id: string }
  | { kind: "group", id: string, groupName?: string }
```

グループを指定した場合は、選択時点の基本名を`groupName`へsnapshotとして保存する。後からdirectoryのグループ名が変化しても過去イベントの表示名は自動更新しない。問い合わせ先は運営担当へ統合し、独立属性を持たない。講師と運営担当は役割が異なるため別フィールドとする。

---

## 11. 分野

講習会の分野はマスターデータとして管理し、Lecture から参照する。

```ts
fieldId?: string
```

自由入力にはせず、検索・絞り込み時の表記揺れを防ぐ。

---

## 12. 対象者・初心者向けフラグ

対象者は自由記述とする。

```ts
targetAudience?: string
```

例:

```text
Linuxの基本操作を知っている人
```

また、「その分野を初めて学ぶ人向けの0→1講習かどうか」を boolean で保持する。

```ts
isIntroductory: boolean
```

これは難易度とは別の概念として扱う。

---

## 13. LectureRelation

Lecture 同士の関係は手入力で管理する。

Series のような上位オブジェクトは作らない。

### 13.1 データ構造

```ts
type LectureRelation = {
  fromLectureId: string
  toLectureId: string

  type:
    | "prerequisite"
    | "previous_year"
    | "recommended_next"
}
```

### 13.2 関係の意味

#### prerequisite

この Lecture を受講する前提となる Lecture。

```text
Webセキュリティ講習会
  prerequisite → Web基礎講習会
```

#### previous_year

前年度版・過去年度版に相当する Lecture。

```text
2026年度 CTF講習会
  previous_year → 2025年度 CTF講習会
```

年度が連続していることはシステム側では保証せず、管理者が手入力する。

#### recommended_next

この Lecture を受講した後におすすめする Lecture。

```text
Web基礎講習会
  recommended_next → Webセキュリティ講習会
```

関係は片方向のみ保存する。

---

## 14. 公開状態

### Lecture

Lecture 自体には status を持たない。

公開状態は Session から導出する。

```text
published な Session が1つ以上ある
  → Lecture は公開対象

published な Session が0件
  → Lecture は非公開
```

### Session

Session は以下の二状態のみを持つ。

```ts
status: "draft" | "published"
```

`scheduled`、`completed`、`ongoing` などの状態は持たない。

必要な場合は日時から判定する。

公開変更時は推奨項目の未設定を確認モーダルで警告するが、schemaとして有効なSessionの公開を妨げない。最後のpublished Sessionをdraftへ戻す場合は、Lectureが学習者向け画面から非表示になる影響も警告する。

---

## 15. 削除

`deletedAt` などの soft delete 用フィールドは持たない。

初期リリースではLecture、Session、FlowClass、Flow、Roadmapの削除、アーカイブ、取り下げを実装しない。誤作成したSessionはdraftのまま別用途へ再利用し、その他の誤りも編集またはdraftへの変更で訂正する。利用停止・アーカイブが必要になった場合は、改めて設計する。

---

## 16. 制約・方針

- Lecture は Session を0件持つことができる。
- Session の名前は自由入力とする。
- Session 名の重複を許可する。
- Lecture 名の重複を許可する。
- Session の日時重複を許可する。
- Session の表示順は `order` で明示する。
- Session の開催は必ず1日で完結する。
- 開催形式は構造化しない。
- オンライン情報も `location` に含める。
- 再放送は新しい Session として扱う。
- Series / Event などの追加階層は作らない。

---

## 17. オブジェクト関係

```text
┌────────────────────┐
│      Lecture       │
│────────────────────│
│ name               │
│ description        │
│ academicYearStart  │
│ academicYearEnd    │
│ fieldId            │
│ organizer          │
│ targetAudience     │
│ isIntroductory     │
│ traqChannelId      │
│ material           │
│ resources          │
└─────────┬──────────┘
          │ 1
          │
          │ N
┌─────────▼──────────┐
│      Session       │
│────────────────────│
│ name               │
│ description        │
│ order              │
│ date               │
│ startTime          │
│ location           │
│ knoqUrl            │
│ instructor         │
│ material           │
│ resources          │
│ replayOf[]         │
│ status             │
└────────────────────┘

Lecture ── N:M ── Lecture
      LectureRelation
```

---

## 18. 全体データ型

```ts
type Material = {
  title?: string
  url: string
}

type Resource = {
  title?: string
  url: string
}

type Organizer =
  | { kind: "user", id: string }
  | { kind: "group", id: string, groupName?: string }

type Lecture = {
  id: string

  name: string
  description?: string

  academicYearStart: number
  academicYearEnd: number

  fieldId?: string

  organizer?: Organizer

  targetAudience?: string
  isIntroductory: boolean

  traqChannelId?: string

  material?: Material
  resources: Resource[]
}

type Session = {
  id: string
  lectureId: string

  name: string
  description?: string

  order: number

  date?: Date
  startTime?: string

  location?: string

  knoqUrl?: string

  instructorId?: string

  material?: Material
  resources: Resource[]

  replayOfSessionIds: string[]

  status: "draft" | "published"
}

type LectureRelation = {
  fromLectureId: string
  toLectureId: string

  type:
    | "prerequisite"
    | "previous_year"
    | "recommended_next"
}
```

---

## 19. 設計方針まとめ

```text
Lecture
= 何を・誰向けに・どの年度に行う講習会なのか

Session
= その講習会のうち、どの回を・いつ・どこで・誰が実施するのか
```

モデルは以下の2階層を基本とする。

```text
Lecture
└── Session
```

年度ごとの Lecture を束ねる Series や、Session の下に実開催を表す Event は設けない。

必要な関係は LectureRelation と `replayOfSessionIds` を用いて明示的に表現する。

---

## 20. Flow

従来「ウィザード」と呼んでいた、講習会の準備・実施・振り返りを案内する情報は **Flow** と呼ぶ。再利用する原本を `FlowClass`、Lecture / Sessionへ適用した作業実体を `Flow` とする2段構成で管理する。

### 20.1 FlowClass

`FlowClass`はStockに置く再利用可能な原本であり、特定のLectureまたはSessionを参照しない。

```ts
type FlowType =
  | "lecture_pre"   // 講習会に関する事前フロー
  | "session_main" // 各開催に関するメインフロー
  | "lecture_post" // 講習会に関する事後フロー

type FlowClass = {
  id: string
  name: string
  type: FlowType
  text: string
  formatVersion: 1
  listed: boolean
  revision: number
}
```

### 20.2 Flow

`Flow`は、Stockから選んだ`FlowClass`を具体的なLectureまたはSessionへ適用した作業実体である。

```ts
type Flow = {
  id: string
  flowClassId: string
  targetId: string
  text: string
  formatVersion: 1
  currentPage: number
  revision: number
}
```

作成時には、選択した`FlowClass.id`を`flowClassId`へ保存し、その時点の`FlowClass.text`を`Flow.text`へコピーする。作成後に`FlowClass.text`を変更しても、既存の`Flow.text`へ自動反映しない。適用済み内容はFlow自身が保持するスナップショットであり、過去内容の保持だけを目的とした`FlowVersion`は初期リリースでは設けない。

`targetId`が指す対象種別は`FlowClass.type`から決まる。

- `lecture_pre`と`lecture_post`: 1件のLectureを参照する。
- `session_main`: 1件のSessionを参照する。
- 対象なし、属性と対象種別の不一致は許可しない。
- Lectureは`lecture_pre`と`lecture_post`を各1件、Sessionは`session_main`を1件、常に持つ。同じ対象属性へ複数Flowを適用しない。

`FlowClass.type`は分類ではなく対象制約でもある。1件以上のFlowから参照された`FlowClass.type`は変更できない。別のtypeとして扱いたい場合は新しいFlowClassを作成する。これにより、既存Flowへtypeを重複保存せず、適用時の対象整合性を維持する。

```text
Stock
└── FlowClass
    ├── id
    ├── type
    └── text

Lecture / Session
└── Flow
    ├── flowClassId
    ├── targetId
    ├── copied text
    ├── text内のチェック状態
    └── currentPage
```

将来、Stock上で版履歴、差分表示、特定版の再利用が必要になった場合に`FlowClassVersion`を追加する。初期文法、チェック更新、自動保存、途中再開は`FLOW_FORMAT_ANALYSIS.md`を正本とする。

Flowは物理削除しない。Flow固有の回答、タスク状態、`active` / `completed` / `cancelled`、完了後の読み取り専用化は設けない。チェックは`Flow.text`を、ページ位置は`currentPage`を更新する。

講習会作成時には講習会名、`lecture_pre`、第1回用`session_main`、`lecture_post`のFlowClassを必須選択し、Lecture、第1回draft Session、3件のFlowを同じtransactionで作る。第1回の初期名は「第1回」、`order`は0とする。

使用FlowClassの変更ではLecture / Session属性を維持し、同じFlowの`flowClassId`、`text`、`formatVersion`、チェック状態、`currentPage`を新しいFlowClassの現在値と先頭ページへ置き換える。FlowClass自身の更新は既存Flowへ伝播しない。

---

## 21. Session完了

受講完了はLectureではなくSession単位で、本人が自己申告する。

```ts
type SessionCompletion = {
  userId: string
  sessionId: string
  lectureId: string
  roundNumber: number
  completedAt: Date
}
```

- 同じ利用者とSessionの組には有効な完了を1件だけ持つ。
- 完了の追加・取消は本人だけが行う。
- `replayOfSessionIds`が1件以上ある再放送Sessionには完了操作を置かず、完了記録を作らない。
- Lecture単位の進捗、ロードマップ項目の完了、講習会バッジ獲得はSessionCompletionから導出する。publishedな通常Sessionを1件以上持ち、その全件を完了したときLecture相当を完了とする。

---

## 22. 属性更新イベント

全員編集で上書き前の内容と編集者を失わないよう、現在値とは別に属性ごとの更新イベントを保存する。

```ts
type AttributeUpdateEvent = {
  id: string
  entityType: "lecture" | "session" | "flow_class" | "flow" | "roadmap"
  entityId: string
  attributePath: string
  previousValue: JsonValue
  nextValue: JsonValue
  actorId: string
  occurredAt: Date
  changeSetId: string
}
```

- 現在値の正本は各entityであり、イベント再生だけで現在状態を作るevent sourcingにはしない。
- 単一属性は入力停止またはblurで自動保存し、属性ごとにイベントを作る。配列・複合値はモーダル確定時に全体を1属性として保存する。
- 現在値の更新とイベント追加は同じtransactionで行う。片方だけの成功を許可しない。
- 値は型を保てるJSONとして保存する。ResourceやID配列は初期リリースでは属性全体のbefore/afterを1イベントへ記録する。
- Flowの`flowClassId`、`text`内チェック、`formatVersion`、`currentPage`はFlow自身の属性更新イベントとして記録する。FlowからLecture / Session属性を変更した場合は、対象エンティティ側の属性更新イベントとして記録する。
- 同じ属性を他者が先に変更していても後勝ちで保存する。requestの`baseValue`とtransaction内の現在値が異なる場合はresponseで一時的な競合警告を返すが、競合フラグは永続化しない。
- 履歴画面の既定はLecture / Sessionデータ変更とし、チェックと使用FlowClass変更は「Flow操作」へ分ける。初期版の履歴は閲覧・コピーだけで、復旧操作を持たない。

---

## 23. 講習会編集

対象単位の横タブを`講習会`、順序付きの`第1回`、`第2回`…、開催追加`+`、`事後`、`一覧編集`、その他操作`…`の順に置く。`講習会`は`lecture_pre`、各`第N回`はそのSessionの`session_main`、`事後`は`lecture_post`のFlowそのものを表示する。モバイルでは対象タブを横スクロールできるようにする。

`+`は開催追加モーダルを開く。空のdraft作成または既存Sessionの複製と、使用する`session_main` FlowClassを選ぶ。`…`は使用Flow変更、開催順変更、変更履歴を開く。

一覧編集はPCで属性ごとのアコーディオン内にSession名付き小カードを横並びのレーンとして配置し、外周罫線で巨大な表に見せない。モバイルでは同じ属性単位のままSessionを縦に積む。配列・複合値は要約と中央モーダルで編集し、確定時に配列全体を1イベントとして保存する。

開催順変更はPCとモバイルの両方で専用ハンドルのドラッグ操作、上下ボタン、swapアニメーションを備え、明示保存する。「日時順に並べる」は保存前の補助操作とする。

単一属性の未送信差分だけをlocalStorageへリアルタイムに保存し、7日で失効させる。server値が差分の`baseValue`と同じなら自動復元し、変化済みなら自動適用せず、確認、コピー、破棄を提示する。

公開状態はFlowと一覧編集の双方から変更できる。確認モーダルはLectureの説明・対象者・運営担当と、対象Sessionの日時・場所・講師・materialが未設定なら推奨項目として警告するが、公開を妨げない。最後のpublished Sessionをdraftへ戻す場合はLectureが学習者向け画面から非表示になることも警告する。

一覧編集から保存済みのLecture / Session現在値をJSONとして書き出せる。localStorageの未送信差分、Flow本文、履歴は含めず、JSON入力は実装しない。

---

## 24. OpenAPI契約

```ts
type LectureCreate = {
  name: string
  lecturePreFlowClassId: string
  sessionMainFlowClassId: string
  lecturePostFlowClassId: string
}

type LectureWorkspace = {
  lecture: Lecture // sessionsを含む
  flows: Flow[]
}

type AttributePatch = {
  attributePath: string
  baseValue?: JsonValue
  nextValue: JsonValue
}

type AttributePatchResult<T> = {
  entity: T
  conflictDetected: boolean
}

type SessionCreate = {
  mode: "empty" | "duplicate"
  sourceSessionId?: string
  flowClassId: string
  replayOfSessionIds?: string[]
}

type SessionCreateResult = {
  workspace: LectureWorkspace
  session: Session
  flow: Flow
}

type LectureExport = {
  schemaVersion: 1
  lecture: Lecture // sessionsを含む
}
```

`SessionCreate.sourceSessionId`は`mode="duplicate"`のときだけ必須とする。属性PATCHの`attributePath`は任意のJSON Pointerではなく、APIが公開する1階層の属性名allowlistとする。`JsonValue`でも各pathの実際の型をhandlerで検証し、未知pathや型不一致は400にする。

- `POST /lectures`: `LectureCreate`として`name`、`lecturePreFlowClassId`、`sessionMainFlowClassId`、`lecturePostFlowClassId`を受け、Lecture、第1回draft Session、3件のFlowを原子的に作成する。responseはそれらを含む`LectureWorkspace`とする。
- `PATCH /lectures/{lectureId}/attributes`、`PATCH /sessions/{sessionId}/attributes`: `AttributePatch { attributePath, baseValue?, nextValue }`を受け、更新後entityと`conflictDetected`を返す。許可pathと値型は対象ごとのallowlistで検証する。revision不一致の409拒否は行わない。
- `POST /lectures/{lectureId}/sessions`: `SessionCreate`を受け、draft SessionとメインFlowを同じtransactionで作り、`SessionCreateResult`を返す。
- `PUT /lectures/{lectureId}/session-order`: `{ sessionIds: SessionId[] }`を受け、明示保存する。対象Lectureの全Sessionを重複なく1回ずつ含め、並び全体を1属性イベントとして記録する。
- `PUT /flows/{flowId}/flow-class`: `{ flowClassId: string }`を受ける。同じFlowTypeだけを許可し、対象属性を変えずFlow snapshotとページ位置を置換して更新後Flowを返す。
- `PATCH /flows/{flowId}/checks`: `{ pageIndex, checkboxIndex, checked, expectedText? }`を受け、backendが現在textを解析して該当markerだけを更新し、更新後Flowを返す。`expectedText`が現本文と異なる場合は別位置へ推測適用しない。
- `PATCH /flows/{flowId}/page`: `{ currentPage: integer >= 0 }`を受け、存在するページ範囲だけを許可して更新後Flowを返す。
- `GET /lectures/{lectureId}/history?category=data|flow`: Lectureと各Sessionの履歴を分類して返す。
- `GET /lectures/{lectureId}/export`: 保存済みLecture（`sessions`を含む）現在値を`LectureExport`の`application/json`で返す。

既存のFlow一般作成API、Flow全文更新API、Flow status filter、`FlowStatus`、`answers`、`tasks`、`status`、Lecture / Session全体Writeの`expectedRevision`、revision競合409は次期契約から除く。FlowClass Stock編集とRoadmap編集は今回の講習会編集UIスコープ外であり、現行の明示保存、`expectedRevision`、競合409を維持する。内部`revision`は更新世代と診断のためresponseへ残す。

---

## 25. 追加migration方針

既存データを破壊しない`002`系列のadditive migrationを追加する。`002_editor_model.sql`でLectureへ`material`と単一organizer用のkind / id / group_name、Sessionへ`material`と単一instructor_idを追加する。旧配列は先頭のgroup、なければ先頭のuserをorganizerへ、先頭のinstructorを単一講師へbackfillする。migrationだけでgroup名を解決できない既存行はgroup_name未設定を許し、次にdirectoryから選択・保存した時点でsnapshotする。旧organizer/contact/instructor JSON列はdropせず、新コードからの書込みを止める。既存ResourceをtitleからMaterialへ推測移行せず、そのままResourceとして保持する。

Flowの`answers`、`tasks`、`status`列もdropせず、新コードから参照・更新しない。`text`、`format_version`、`current_page`、`revision`は継続利用する。`002_editor_model.sql`でFlowClassから`flow_type`をbackfillし、`003_flow_target_constraints.sql`でFlowTypeと対象の組へ一意indexを追加して、各slotを最大1件に制約する。exactly-oneは新規作成以降の不変条件とする。DBの一意indexだけでは必須存在を表せないため、新規作成transactionとworkspace読取時のdomain検証でLectureの事前・事後、Sessionのメインが各1件あることを保証する。既存に重複または欠落Flowがある場合は移行preflightで対象とslotを列挙し、任意のFlowClassを自動選択したり黙って削除したりせず、人間がtype一致FlowClassを明示割当してから移行する。

作成transactionではLecture、Session、Flowのいずれかが失敗した場合に全体をrollbackする。属性更新では現在値のrow lock、`baseValue`比較、現在値更新、revision増加、属性イベント追加を同じtransactionで行う。
