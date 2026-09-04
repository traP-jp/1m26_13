# Flow text文法・Flow形式

更新日: 2026-09-04
状態: 初期リリースの確定仕様。リポジトリ直下へ実装済み。

## 保存する三つの概念

1. `FlowClass.text`: Stockで編集する再利用原本。
2. `Flow.text`: Lecture / Sessionへの適用時にコピーした本文。FlowClass更新後も変えない。
3. Flow実行状態: `answers`、`tasks`、`currentPage`、`status`。適用済みFlowに保存する。

Parserの解析結果`FlowDocument`は`text + formatVersion`から再生成し、DBへ重複保存しない。
`FlowClassVersion`は置かないが、Parser互換性のためFlowClassとFlowに`formatVersion: 1`を持たせる。

## formatVersion 1

各ページは`# `で始め、ページ間を改行を含む正確な`---`行で区切る。

| 記法 | 意味 |
|---|---|
| `# 見出し` | ページ見出し。各ページに1件必須 |
| `---` | ページ区切り |
| `{{ lecture.name }}` | 1行全体を対象属性またはFlow回答の入力欄にする |
| `[[ lecture.name ]]` | 現在値を表示・copy blockへ展開する |
| `- [ ]{#confirm-purpose} 作業` | 安定keyを持つチェックタスク |
| ```` ```copy ```` | 値を展開し、コピー操作を付ける文章 |
| 通常のcode fence | 展開せずそのまま表示するコード |

通常の行は段落として扱う。条件分岐、ループ、include、任意式評価、API呼出、HTML実行は扱わない。
本文はVueのテキストとして表示し、HTMLとして挿入しない。

````md
# 講習会を企画する

講習会名を入力してください。

{{ lecture.name }}

- [ ]{#confirm-purpose} 講習会の目的を確認する

---

# 告知を準備する

```copy
[[ lecture.name ]]を開催します。
```

{{ answer.announcement_note }}
````

## keyと対象制約

- `lecture_pre` / `lecture_post`は`lecture.name`、`lecture.description`、`lecture.targetAudience`を更新できる。
- `session_main`は`session.name`、`session.description`、`session.date`、`session.startTime`、`session.location`を更新できる。Lecture名は表示用に参照できる。
- `answer.*`はFlow固有の文字列回答としてFlowへ保存する。
- タスクkeyと回答keyは文書内で一意にする。タスクkeyは位置から生成せず、本文へ明示する。
- typeに合わない対象path、未知のpath、重複key、見出しのないページは保存時に拒否する。

## 適用と実行状態

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

- `lecture_pre` / `lecture_post`はLecture、`session_main`はSessionだけへ適用できる。
- 同じFlowClassと同じ対象の組み合わせは1件にし、既存Flowを対象画面から再開する。
- ページ移動で対象属性、Flow回答、タスク、現在ページを明示保存する。
- 対象属性の正本はLecture / Sessionであり、Flowへ複製しない。更新は通常編集と同じ楽観ロックと属性イベントを通す。
- 最終ページで文書内の全タスクが完了したときだけ、明示操作で`completed`にできる。
- 完了済みFlowは読み取り専用にする。物理削除とリセットは提供しない。
- FlowClassの`listed=false`は新規適用候補から隠すだけで、適用済みFlowの再開には影響しない。

## 更新イベント

Lecture、Session、FlowClass、Flow、Roadmapは現在行と属性単位の更新イベントを同じtransactionで保存する。
Flowでは`answers`、`tasks`、`currentPage`、`status`を属性として記録する。現在行を正本とし、イベント再生を必須にするevent sourcingは採用しない。

## 将来の拡張条件

Stock側の版履歴、差分、特定版の再利用が必要になった時点で`FlowClassVersion`を追加する。
入力型、条件分岐、includeを追加する場合は`formatVersion`を上げ、既存version 1のParserを残す。
