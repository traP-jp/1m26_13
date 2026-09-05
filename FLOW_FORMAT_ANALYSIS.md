# Flow text文法・Flow形式

更新日: 2026-09-05
状態: P4で確定した次期実装仕様。現行実装は移行前である。

## 保存する概念

1. `FlowClass.text`: Stockで編集する再利用原本。
2. `Flow.text`: Lecture / Sessionへの適用時にコピーした対象専用本文。FlowClass更新後も自動では変えない。
3. `Flow.currentPage`: `---`で区切ったページのうち、現在表示している位置。

チェック状態は別オブジェクトへ複製せず、`Flow.text`内の`- [ ]` / `- [x]`を正本とする。Flow固有の`answers`、`tasks`、`status`は持たない。Parserの解析結果`FlowDocument`は`text + formatVersion`から再生成し、DBへ重複保存しない。

`FlowClassVersion`は置かないが、Parser互換性のためFlowClassとFlowに`formatVersion: 1`を持たせる。

## formatVersion 1

各ページは`# `で始め、ページ間を改行を含む正確な`---`行で区切る。

| 記法 | 意味 |
|---|---|
| `# 見出し` | ページ見出し。各ページに1件必須 |
| `---` | ページ区切り |
| `{{ lecture.name }}` | 1行全体を単一値の対象属性入力にする |
| `{{ edit lecture.resources }}` | 配列・複合属性を一覧編集と共通の中央モーダルで開く |
| `[[ lecture.name ]]` | 対象の現在値を表示・copy blockへ展開する |
| `- [ ] 作業` / `- [x] 作業` | Flow.text自身へ状態を保持するチェック項目 |
| ```` ```copy ```` | 値を展開し、コピー操作を付ける文章 |
| 通常のcode fence | 展開せずそのまま表示するコード |

通常の行は段落として扱う。条件分岐、ループ、include、任意式評価、API呼出、HTML実行は扱わない。本文はVueのテキストとして表示し、HTMLとして挿入しない。

````md
# 講習会を企画する

講習会名を入力してください。

{{ lecture.name }}

教材と関連リンクを編集してください。

{{ edit lecture.resources }}

- [ ] 講習会の目的を確認する

---

# 告知を準備する

```copy
[[ lecture.name ]]を開催します。
```
````

## pathと対象制約

- `lecture_pre` / `lecture_post`は、許可された`lecture.*`属性を更新できる。
- `session_main`は、許可された`session.*`属性を更新できる。Lecture属性は値展開で参照できる。
- 単一値は`{{ path }}`、配列・複合値は`{{ edit path }}`で編集する。後者は一覧編集と同じ入力・検証・保存処理を使う。
- typeに合わない対象path、未知のpath、見出しのないページ、構文として不正な編集行はFlowClass保存時とFlow適用時に拒否する。
- `answer.*`名前空間とタスク安定keyは定義しない。

## 適用と実行状態

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

- `lecture_pre` / `lecture_post`はLecture、`session_main`はSessionだけへ適用できる。
- Lectureは`lecture_pre`と`lecture_post`を各1件、Sessionは`session_main`を1件、常に持つ。1対象・1属性へ複数Flowを適用しない。
- `FlowClass.text`の更新は既存Flowへ伝播しない。
- 使用FlowClassを変更するときは対象のLecture / Session属性を維持し、同じFlowの`flowClassId`、`text`、`formatVersion`、チェック状態、`currentPage`を新しいFlowClassの現在値と先頭ページへ置き換える。
- ページ移動は`currentPage`だけを保存する。Flowの完了状態、読み取り専用化、リセット、取消は設けない。

## チェック専用更新

frontendはFlow全文を送信しない。チェック操作は`flowId`、0始まりの`pageIndex`、そのページ内で0始まりの`checkboxIndex`、変更後の`checked`だけを送る。backendはtransaction内で現在の`Flow.text`を読み、同じParserで対象位置を解決し、その1件のmarkerだけを`- [ ]`または`- [x]`へ変更する。

対象位置が現本文に存在しない場合は409ではなく400として再読込を促し、別の行へ推測適用しない。成功時は更新後Flowを返す。チェック変更は`Flow.text`の属性更新イベントとして記録し、履歴画面ではLecture / Sessionデータ変更とは別の「Flow操作」に分類する。

## Lecture / Session対象属性の自動保存

- 単一属性は入力停止またはblurで保存する。現在値更新と属性イベント追加は同じtransactionで行う。
- requestは編集開始時の`baseValue`と変更後の`value`を送る。現在値が`baseValue`から変化していても後勝ちで保存し、responseの一時値`overwroteConcurrentChange`をtrueにする。競合フラグは永続化しない。
- 配列・複合値は中央モーダルで編集し、確定時に属性全体を1件の値として保存する。イベントも配列・複合値全体のbefore / afterを1件とする。
- localStorageには未送信の属性差分だけをリアルタイムに保存し、7日で失効させる。保存成功後は該当差分を削除する。
- 復元時のserver値が差分の`baseValue`と同じなら自動復元できる。server値が変化済みなら自動適用せず、内容確認、クリップボードへのコピー、破棄だけを提示する。

## 更新イベント

Lecture、Session、FlowClass、Flow、Roadmapは現在行と属性単位の更新イベントを同じtransactionで保存する。Flowでは`flowClassId`、`text`、`formatVersion`、`currentPage`の変更を記録する。現在行を正本とし、イベント再生を必須にするevent sourcingは採用しない。

変更履歴は閲覧とコピーだけを提供し、履歴からの復旧操作は初期版に含めない。FlowClass Stock編集とRoadmap編集は今回の講習会編集UIスコープ外であり、現行の明示保存、`expectedRevision`、競合409を維持する。

## 将来の拡張条件

Stock側の版履歴、差分、特定版の再利用が必要になった時点で`FlowClassVersion`を追加する。入力型、条件分岐、includeを追加する場合は`formatVersion`を上げ、既存version 1のParserを残す。
