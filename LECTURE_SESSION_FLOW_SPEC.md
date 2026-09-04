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

  // 運営
  organizerGroupIds: string[]
  organizerUserIds: string[]

  // 問い合わせ先
  contactGroupIds: string[]
  contactUserIds: string[]

  // 対象者
  targetAudience?: string

  // その分野の初心者向け（0→1）かどうか
  isIntroductory: boolean

  // 関連 traQ チャンネル
  traqChannelId?: string

  // 講習会全体に関連するリンク
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

  // 講師
  instructorIds: string[]

  // この開催に関連するリンク
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

`replayOfSessionIds`が1件以上あるSessionは再放送として扱う。初期実装では、元Sessionと同じLecture・同じ`order`を要求し、各Lecture・各`order`の通常Sessionは1件だけにする。再放送はLecture詳細の同じ回タブ内へ通常Sessionと並べて表示するが、受講完了操作は置かない。

学習者向けのSession単独URLは設けない。Lecture詳細は`/lectures/<lectureId>#<round>`とし、fragmentの回番号を直接表示、再読込、ブラウザの戻る・進むで同期する。Session内部IDはAPIと運営編集だけで使う。

例:

```text
総集編
  replayOf:
    - 第1回
    - 第2回
    - 第3回
```

---

## 8. Resource

講義資料、Wiki、アンケート、GitHub リポジトリなどの関連リンクを統一して Resource として扱う。

現時点では種類は持たない。

```ts
type Resource = {
  title?: string
  url: string
}
```

### 例

```json
[
  {
    "title": "講義資料",
    "url": "https://example.com/slides"
  },
  {
    "title": "Wiki",
    "url": "https://example.com/wiki"
  },
  {
    "title": "受講後アンケート",
    "url": "https://example.com/survey"
  }
]
```

Resource は Lecture と Session の両方が持てる。

Lecture の Resource と Session の Resource は独立して扱い、自動継承は行わない。

---

## 9. knoQ

knoQ は外部サービスとして扱い、IDではなくイベントURLのみ保持する。

```ts
knoqUrl?: string
```

knoQ との同期処理は行わない。

---

## 10. 講師・運営・問い合わせ先

### 講師

講師は Session 単位で保持する。

```ts
instructorIds: string[]
```

講師は個人のみを対象とする。

### 運営

Lecture 全体の運営者として、グループと個人をそれぞれ保持する。

```ts
organizerGroupIds: string[]
organizerUserIds: string[]
```

### 問い合わせ先

問い合わせ先もグループと個人の両方を指定できる。

```ts
contactGroupIds: string[]
contactUserIds: string[]
```

講師と運営者は役割が異なるため、別フィールドとして管理する。

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

---

## 15. 削除

`deletedAt` などの soft delete 用フィールドは持たない。

初期リリースではLecture、Session、FlowClass、Flow、Roadmapの削除機能を実装しない。誤りは編集またはdraftへの変更で訂正する。利用停止・アーカイブが必要になった場合は、削除とは別の状態として改めて設計する。

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
│ organizers         │
│ contacts           │
│ targetAudience     │
│ isIntroductory     │
│ traqChannelId      │
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
│ instructors        │
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
type Resource = {
  title?: string
  url: string
}

type Lecture = {
  id: string

  name: string
  description?: string

  academicYearStart: number
  academicYearEnd: number

  fieldId?: string

  organizerGroupIds: string[]
  organizerUserIds: string[]

  contactGroupIds: string[]
  contactUserIds: string[]

  targetAudience?: string
  isIntroductory: boolean

  traqChannelId?: string

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

  instructorIds: string[]

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

`Flow`は、利用者がStockから`FlowClass`を選び、具体的なLectureまたはSessionへ適用した時点で作成する。

```ts
type Flow = {
  id: string
  flowClassId: string
  targetId: string
  text: string
  formatVersion: 1
  answers: Record<string, string>
  tasks: Record<string, boolean>
  currentPage: number
  status: "active" | "completed" | "cancelled"
  revision: number
}
```

作成時には、選択した`FlowClass.id`を`flowClassId`へ保存し、その時点の`FlowClass.text`を`Flow.text`へコピーする。作成後に`FlowClass.text`を変更しても、既存の`Flow.text`へ自動反映しない。適用済み内容はFlow自身が保持するスナップショットであり、過去内容の保持だけを目的とした`FlowVersion`は初期リリースでは設けない。

`targetId`が指す対象種別は`FlowClass.type`から決まる。

- `lecture_pre`と`lecture_post`: 1件のLectureを参照する。
- `session_main`: 1件のSessionを参照する。
- 対象なし、属性と対象種別の不一致は許可しない。

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
    └── 回答・進捗
```

将来、Stock上で版履歴、差分表示、特定版の再利用が必要になった場合に`FlowClassVersion`を追加する。初期文法、回答・進捗、保存、途中再開、完了条件は`FLOW_FORMAT_ANALYSIS.md`を正本とする。

Flowは物理削除しない。途中のFlowは`active`、完了操作後は`completed`とし、完了後は読み取り専用にする。`cancelled`は将来の中断表示に使える予約状態で、初期画面からは変更しない。

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
- 一度の保存で複数属性を変更した場合、属性ごとにイベントを作り、同じ`changeSetId`で束ねる。
- 現在値の更新とイベント追加は同じtransactionで行う。片方だけの成功を許可しない。
- 値は型を保てるJSONとして保存する。ResourceやID配列は初期リリースでは属性全体のbefore/afterを1イベントへ記録する。
- Flowの回答、チェック、現在位置、状態はFlow自身の属性更新イベントとして記録する。FlowからLecture / Session属性を変更した場合は、対象エンティティ側の属性更新イベントとして記録する。
