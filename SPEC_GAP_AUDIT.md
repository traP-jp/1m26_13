# 本番仕様 Grilling 監査

更新日: 2026-09-04
状態: 初期リリースを不可逆にし得るP0/P1判断を解決し、リポジトリ直下へ反映済み。

## 解決したP0

| 項目 | 決定 |
|---|---|
| Flow | FlowClassと適用時スナップショットFlowの2段。formatVersion 1、安定task key、明示保存、対象画面から再開、全task完了で完了。同じ原本を同じ対象へ1回だけ適用する。 |
| 完了 | Session単位で保存。publishedな通常Sessionを1件以上持ち、その全件完了でLecture、バッジ、Roadmap項目を完了と導出する。 |
| 公開 | draft昇格に日時・場所・Resourceの追加必須条件なし。startTimeだけの保存は拒否。通常公開Sessionが0件ならLectureは一般導線から消える。 |
| Roadmap | Stageの安定ID、名前、説明、順序付きItemを持つ一本道。公開時は空Stage、重複Lecture、非公開Lectureを拒否する。進捗は現在の構成から再計算する。 |
| 認証・権限 | NeoShowcaseの部員認証を前提に全APIを保護し、全認証済み部員が編集可能。完了操作は現在の認証Userだけへ保存する。 |
| 削除 | Lecture、Session、FlowClass、Flow、Roadmapの削除APIと画面を設けない。Session完了取消だけは本人の記録操作として扱う。 |

## 解決したP1

- Lecture / Sessionの内部IDはAUTO_INCREMENT BIGINT、API表現は10進文字列とした。その他のentityはUUIDを維持し、バッジseedは`badge-alpha-v1:${lectureName}`へ固定した。
- FlowはLecture用FKとSession用FKを別カラムに持ち、FlowClass typeに応じて片方だけを設定する。
- 再放送元は同じLectureの通常Sessionだけに限定し、自己参照、重複、replayからreplayを拒否する。
- Sessionの`order`重複は許容し、同順位はIDで安定化する。日付は日付文字列として保持し、表示時刻は利用者環境へ委ねる。
- ResourceとknoQはHTTP(S) URLをAPI schemaで検証し、外部リンクは`noopener noreferrer`を付ける。自由文はHTMLとして挿入しない。
- 編集は明示保存と整数revisionの楽観ロックを使う。競合時は409を返し、現在行と属性イベントを同じtransactionで保存する。
- 検索は空白区切りの複数語AND、年度範囲の重なり、分野一致、更新日時順とし、最大200件とする。
- 検索とRoadmapは別入口、プロフィールはバッジ・完了した開催・Roadmapの3タブにした。
- FlowClassの`listed=false`はStockの新規適用候補から外す。適用済みFlowは残して再開できる。

## 実データ投入前の不可逆性への対処

- Lecture/Session IDを再採番しないため、完了、関係、Roadmap、Flow、バッジ外観を追跡できる。
- 完了事実をSession粒度で保持し、集約規則を変更しても元の学習記録から再計算できる。
- 更新前後、actor、時刻、changeSetを属性単位で残し、履歴なしの上書きを避ける。
- Flow本文とformatVersionを適用時にコピーし、Stockの更新から過去の実行を隔離する。
- 主要entityを物理削除しないため、参照と履歴を失わない。
- 学習者向けSession単独URLは設けず、再放送はLecture詳細の同じ回タブ内へ通常Sessionと並べる。

## 意図的に初期範囲外へ送るもの

- FlowClassVersion、Roadmap公開版、公開承認フロー。
- アーカイブ、利用停止、履歴保持期間と消去方針。
- 退部後のUser/Group表示、運営担当の引き継ぎ。
- Relation循環の高度な意味検証と自動推奨。
- バッジPNG/SVG書き出し、外部共有、Roadmap達成バッジ。
- 検索の表記正規化、全文検索、ページング。

これらは元情報を失わない現在のschemaから追加できる。初期価値循環の成立に必要な判断ではない。
