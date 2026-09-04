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

開始時刻のみ保持する。

日時未定の状態で draft を作成できるよう、どちらも optional とする。

published にする際には、必要に応じてアプリケーション側で日時の入力を必須にする。

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

これにより、1つの Session の再放送だけでなく、複数の Session をまとめた再放送・総集編なども表現できる。

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

削除機能が必要になった場合に改めて設計する。

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

従来「ウィザード」と呼んでいた、講習会の準備・実施・振り返りを案内する情報は **Flow** と呼ぶ。

Flow は独立した管理対象とし、用途と対象によって次の3属性へ分類する。

```ts
type FlowCategory =
  | "lecture_pre"   // 講習会に関する事前フロー
  | "session_main" // 各開催に関するメインフロー
  | "lecture_post" // 講習会に関する事後フロー

type Flow = {
  id: string
  name: string
  description?: string
  category: FlowCategory
  lectureId?: string
  sessionId?: string
}
```

`lecture_pre` と `lecture_post` は1件の Lecture を参照し、`session_main` は1件の Session を参照する。1件の Flow が Lecture と Session の両方を参照すること、または対象を持たないことは許可しない。

```text
Lecture
├── Flow: 事前
├── Session
│   └── Flow: メイン
└── Flow: 事後
```

分類は表示名ではなく構造化された属性として保存し、管理画面で作成・一覧確認・更新・削除できるようにする。
