# LeQtures 講習会データスキーマ v1

この文書を、講習会1件の内容を収集・保存するときの正規仕様とする。公開状態、共同編集者、履歴、画面上の進捗は内容とは別に管理する。

## 1. データの単位

- `WorkshopContent` は「2026年度 Git講習会」のような、年度ごとの1講習会の内容を表す。
- 同じ講習会でも年度が違えば別レコードにする。
- 「第1回」「Web編」「同じ内容の別日程」は、すべて `OccurrenceRecord` という開催枠にする。
- 年度をまたぐ対応関係、前提、次のおすすめは、講習会どうしの参照として持つ。
- 資料や動画は、講習会全体または1つの開催枠に結びつける。
- 受講完了とバッジはユーザー側のデータであり、講習会レコードには含めない。

## 2. 正規型

```ts
type WorkshopContent = {
  schemaVersion: 1;

  // Step 1: 基本情報
  title: string;
  academicYear: number;
  description: string | null;
  organizerSource: OrganizerSource | null;
  organizers: TraqActorRef[] | null;
  audience: string | null;
  targetTeams: TrapTeam[] | null;
  isZeroToOne: boolean | null;
  workshopChannel: TraqChannelRef | null;
  relations: {
    previous: RelatedWorkshopRef[] | null;
    prerequisites: RelatedWorkshopRef[] | null;
    recommendations: RelatedWorkshopRef[] | null;
  };

  // Step 2・3
  occurrences: OccurrenceRecord[] | null;

  // Step 3・4
  resources: ResourceLink[] | null;

  // Step 6
  retrospectiveUrl: string | null;

  // 情報収集の根拠
  sources: SourceRef[];
};

// APIが返す識別・ライフサイクル。revisionのcontentJsonには入れない。
type WorkshopEnvelope = {
  id: string;
  lineageId: string | null;
  lifecycle: "draft" | "public" | "archived";
  archivedFrom: "draft" | "public" | null;
  version: number;
  etag: string;
  content: WorkshopContent;
};

// 編集画面専用。公開snapshotと講習会内容のrevisionには入れない。
type WorkshopEditorState = {
  owner: TraqUserRef | null;
  editors: TraqUserRef[];
  aclVersion: number;
  aclEtag: string;
  workflow: {
    setupRequested: boolean | null;
    version: number;
    etag: string;
  };
};

// 履歴一覧用のメタデータ。履歴本体はWorkshopContentのsnapshot。
type RevisionMeta = {
  id: string;
  sequence: number;
  at: string; // ISO 8601
  by: RevisionActorRef | null;
  summary: string | null;
  eventKind:
    | "create"
    | "save"
    | "publish"
    | "update"
    | "rollback"
    | "lineage"
    | "archive"
    | "restore"
    | "import";
};

type RevisionActorRef =
  | TraqUserRef
  | {
      kind: "service";
      name: string;
    };

type OccurrenceRecord = {
  id: string;
  title: string | null;
  description: string | null;
  instructors: TraqUserRef[] | null;
  mode: "online" | "offline" | "hybrid" | "undecided";

  date: string | null;       // YYYY-MM-DD
  startTime: string | null;  // HH:mm、JST
  endTime: string | null;    // HH:mm、JST

  onlineVenue: {
    platform: "qall" | "discord" | "other";
    value: string;
  } | null;
  offlineVenue: {
    value: string;
  } | null;

  knoqUrl: string | null;
  status: "unknown" | "planned" | "held" | "cancelled" | "postponed";

  // 表示上「順番に受ける回」か「同内容の別日程」かを区別するための値。
  // バッジの取得条件には使わない。
  relation: "single" | "sequence" | "alternative" | "rebroadcast" | "unknown";
};

type ResourceLink = {
  id: string;
  kind:
    | "material"
    | "exercise"
    | "liveStream"
    | "archiveVideo"
    | "repository";
  title: string;
  url: string | null;
  occurrenceId: string | null;
  note: string | null;
};

type OrganizerSource =
  | "アルゴリズム班"
  | "CTF班"
  | "ゲーム班"
  | "グラフィック班"
  | "Kaggle班"
  | "サウンド班"
  | "SysAd班"
  | "unders"
  | "個人・有志";

type TrapTeam = Exclude<OrganizerSource, "unders" | "個人・有志">;

type TraqActorRef = TraqUserRef | TraqGroupRef;

type TraqUserRef = {
  kind: "user";
  id: string | null;
  name: string;
};

type TraqGroupRef = {
  kind: "group";
  id: string | null;
  name: string;
};

type TraqChannelRef = {
  id: string | null;
  path: string;
};

type RelatedWorkshopRef =
  | {
      id: string;
      kind: "workshop";
      workshopId: string;
      titleSnapshot: string;
    }
  | {
      id: string;
      kind: "text";
      text: string;
    };

type SourceRef = {
  id: string;
  title: string;
  url: string;
  note: string | null;
  supports: SourceSupport[];
};

type SourceSupport = {
  entityType: "workshop" | "occurrence" | "resource";
  // workshopではnull、それ以外は正式ID。
  entityId: string | null;
  field: string;
};

// 以下は収集候補だけで使い、承認時に正式IDへ置き換える。
type ImportOccurrenceRecord = Omit<OccurrenceRecord, "id"> & {
  entityKey: string;
};

type ImportResourceLink = Omit<ResourceLink, "id" | "occurrenceId"> & {
  entityKey: string;
  occurrenceEntityKey: string | null;
};

type ImportRelatedWorkshopRef =
  | {
      entityKey: string;
      kind: "external";
      targetExternalWorkshopKey: string;
      title: string;
    }
  | {
      entityKey: string;
      kind: "text";
      text: string;
    };

type ImportSourceRef = Omit<SourceRef, "id" | "supports"> & {
  entityKey: string;
  supports: Array<{
    entityType: "workshop" | "occurrence" | "resource";
    entityKey: string | null;
    field: string;
  }>;
};

type WorkshopImportContent = Omit<
  WorkshopContent,
  "occurrences" | "resources" | "relations" | "sources"
> & {
  occurrences: ImportOccurrenceRecord[] | null;
  resources: ImportResourceLink[] | null;
  relations: {
    previous: ImportRelatedWorkshopRef[] | null;
    prerequisites: ImportRelatedWorkshopRef[] | null;
    recommendations: ImportRelatedWorkshopRef[] | null;
  };
  sources: ImportSourceRef[];
};
```

## 3. 各項目の意味

### 講習会全体

| 項目 | 意味 | 収集上の注意 |
|---|---|---|
| `title` | 講習会名 | 収集時は出典の表記を使う。新規作成時だけサービスが仮名を生成できる |
| `academicYear` | 4月始まりの年度 | 暦年ではない |
| `description` | 扱う内容と講習会全体のゴール | 出典にないゴールを推測して補わない |
| `organizerSource` | 主導する班、unders、個人・有志 | traQグループとは別の固定分類 |
| `organizers` | 実際の運営メンバー | ユーザーとtraQグループを複数登録できる |
| `audience` | 想定する受講者 | 自由文 |
| `targetTeams` | 特に受講してほしい班 | 特定しない場合は空配列、未確認なら `null` |
| `isZeroToOne` | 0→1講習会か | 未確認は `null` |
| `workshopChannel` | 講習会のtraQチャンネル | UUIDと `#親/子` 形式のパスを併記する |
| `retrospectiveUrl` | 反省点・引き継ぎ事項を残したWiki/MD | 複数資料は `resources` を使い、ここは主となる1 URLだけにする |

### 関連する講習会

| 項目 | 意味 |
|---|---|
| `relations.previous` | 内容が対応する、最も直近の過年度講習会。通常1件だが分岐に備えて配列 |
| `relations.prerequisites` | 先に受けてほしい講習会 |
| `relations.recommendations` | 次に受けてほしい講習会 |

対応するレコードが確定している場合は `kind: "workshop"` を使い、選択時点の `titleSnapshot` も保存する。名前しか分からない場合は、誤ったIDへ結び付けず `kind: "text"` で原文を残す。

### 開催枠

| 項目 | 意味 | ルール |
|---|---|---|
| `title` | 「第1回」「Web編」など | 不明なら `null` |
| `description` | この開催枠で扱う内容とゴール | 自由文 |
| `instructors` | 講師 | 複数人可。traQユーザーのみ |
| `mode` | 開催形式 | ハイブリッドはオンライン・オフライン両方の場所を持つ |
| `date` | 開催日 | `YYYY-MM-DD` |
| `startTime` / `endTime` | 開始・終了時刻 | 別々に保存し、タイムゾーンは `Asia/Tokyo` 固定 |
| `onlineVenue` | Qall、Discord、その他の参加先 | Qall/Discordはチャンネル名、その他はURL等の自由文 |
| `offlineVenue` | 講義室または自由文 | 正式な講義室名が分かる場合はその表記を優先 |
| `knoqUrl` | 登録済みknoQイベント | 絶対URL |
| `status` | 開催枠の状態 | 新規作成は `planned`。収集元に根拠がなければ `unknown` とし、日付だけから推測しない |
| `relation` | 他の開催枠との関係 | 受講完了条件には使用しない |

### リンク

- `occurrenceId: null` は講習会全体で共通のリンク。
- `occurrenceId` に開催枠IDを入れると、その開催枠に対応するリンク。
- 資料・演習・配信・アーカイブ動画はそれぞれ複数登録できる。
- 「動画あり」検索は `archiveVideo`、「資料あり」検索は `material` または `exercise` で判定する。
- ソースコードへのリンクは `repository`、情報収集の根拠は `sources` に分ける。
- 入力途中は `url: null` を許す。公開snapshotにはURLが空のリンクを含めない。

## 4. 収集ルール

1. `title`、`academicYear`、1件以上の `sources` を最低限そろえる。これらを確認できないものは、自動投入せず保留する。
2. 出典にない内容を推測しない。不明な単一値は `null` にする。
3. 複数値では、未確認を `null`、確認した結果「なし」を `[]` として区別する。
4. traQのユーザー・グループ・チャンネルは可能な限りAPIでUUIDを解決する。解決できない場合は `id: null` のまま名前・パスを残す。
5. 日時はJSTへ正規化する。「9–10限」のように時刻へ確実に変換できない表記は、推測せず `startTime` と `endTime` を `null` にし、`sources.note` に原文を残す。
6. 収集payloadの `sources.supports` には、その出典で確認した項目を構造化して入れる。例は `{ entityType: "workshop", entityKey: null, field: "title" }`、`{ entityType: "occurrence", entityKey: "occ_123", field: "date" }` とする。承認後は `entityKey` を正式な `entityId` に置き換える。
7. Wiki、MD、knoQ、traQは読み取り専用で参照し、投稿・編集・リアクションなどの書き込みは行わない。

## 5. 保存しない派生データ

次は入力済みデータから毎回生成し、講習会レコードへ保存しない。

- 庶務への依頼文
- knoQ本文
- `#event/workshop` の告知文
- 講習会チャンネルの告知文
- 開催枠ごとの直前リマインド
- 入力率・次に埋める項目
- 検索用インデックスは正規レコードには含めない。公開snapshotから再構築できる投影として、別テーブルへ保存してよい。

独立した「受講方法」欄も設けない。参加先、knoQ、配信・動画、資料から受講に必要な情報を構成する。

## 6. 公開範囲

- 下書きの間は、作成者と共同編集者だけがレコードを閲覧できる。
- 公開後は、入力された基本情報、運営メンバー、対象、チャンネル、開催枠、場所、配信、knoQ、資料、関連講習会、振り返り、情報源、編集履歴を講習会ページに表示する。
- `WorkshopEditorState.workflow.setupRequested` と、そこから生成する庶務依頼文は編集画面だけに表示する。
- 生成したknoQ本文・告知文・リマインドも編集画面だけに表示する。

## 7. 収集用テンプレート

収集器が送るのは `WorkshopImportContent` と出典だけである。LeQturesが管理する講習会ID、系列ID、公開状態、owner、共同編集者、workflow、revisionは送らない。開催枠、資料、関連、出典の `entityKey` はその講習会候補内だけで一意な一時キーとし、承認時にサーバーが正式IDへ置き換える。別候補との関連は `kind: "external"` と `targetExternalWorkshopKey` で表し、LeQtures内部IDを収集器に推測させない。

```json
{
  "schemaVersion": 1,
  "title": "",
  "academicYear": 2026,
  "description": null,
  "organizerSource": null,
  "organizers": null,
  "audience": null,
  "targetTeams": null,
  "isZeroToOne": null,
  "workshopChannel": null,
  "relations": {
    "previous": null,
    "prerequisites": null,
    "recommendations": null
  },
  "occurrences": null,
  "resources": null,
  "retrospectiveUrl": null,
  "sources": []
}
```

取込APIはこのallowlist以外のトップレベル項目を `422` で拒否する。収集器のservice tokenには候補の投入だけを許し、承認、既存講習会の更新、公開は許可しない。

承認時、`external` 関係の対象がすでに承認済みなら正式IDと新しいrelation IDを発行して `kind: "workshop"` へ解決する。未解決なら表示名を新しいrelation ID付きの `kind: "text"` として残し、後続候補の承認後にreviewerへ再解決候補を提示する。開催枠・資料・出典と、出典が参照する `entityKey` も同じ時点で正式IDへ置き換える。

## 8. 実装への対応

既存デモの旧フィールドは、v1へ移行するときに次のように扱う。

| 旧フィールド | v1 |
|---|---|
| `year` | `academicYear` |
| `summary` | `description` |
| `team` | `organizerSource` |
| `operators` | `organizers` |
| `reflectionUrl` | `retrospectiveUrl` |
| `resources[].type = material` | `resources[].kind = material` |
| `resources[].type = practice` | `resources[].kind = exercise` |
| `resources[].type = video` | `resources[].kind = archiveVideo` |
| `sourceUrl` / `sourceLabel` | `sources[]` |

`outcome`、`prerequisites`、`preparation`、`howToLearn`、`contact`、`tags` はv1の新規入力項目にはしない。既存レコードでは情報を失わないよう移行時に説明、関連講習会、チャンネル、資料、または出典注記へ振り分ける。
