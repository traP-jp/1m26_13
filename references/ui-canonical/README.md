# Production UI canonical references

更新日: 2026-09-04

このディレクトリは、`feat/production-app` の表示層を実装・修正するときに使う視覚設計の正本インデックスである。

## 適用ルール

- 下表の固定コミットにある静的UIのDOM構造、情報階層、余白、幅、配色、タイポグラフィ、レスポンシブ挙動を、対応するproduction画面の視覚的な正本とする。
- `BETA_SCREEN_DESIGN_REFERENCE.md`や文章仕様は機能・意味の補足であり、下表の画面が存在する範囲では視覚判断を上書きしない。
- productionのAPI、router、認証、永続化、フォーム状態、エラー処理は維持する。静的UIのダミーデータや疑似保存処理は移植しない。
- basiQ-UIの採用自体を完了条件にしない。静的UI固有のCSSとレイアウトをproductionへ移植し、basiQ-UI部品は見た目とアクセシビリティを崩さない範囲で再利用する。
- 共通シェルを最初に合わせた後、各画面を個別に合わせる。
- 1440×900と390×844で、同一の代表データを表示して静的UIとproductionを比較する。主要な配置、密度、余白、文字階層、カード寸法、ナビゲーションが目視で一致するまで完了扱いにしない。
- 機能仕様と静的UIが衝突する場合は、機能仕様を維持したまま静的UIの視覚言語で追加要素を配置し、判断を`DECISIONS.md`へ記録する。

## 明示的な例外

- プロフィールは静的UIを正本とする。ただし、プロフィール見出しの横にある「完了した講習会」「完了した開催」「ロードマップ内の完了」の3つの数値サマリーだけは、現在のproduction版の構造と実データ表示を維持する。
- バッジ生成は`badge-generator.ts`のアルゴリズムをそのまま移植する。

## 正本マップ

固定コミットの内容は、作業ツリーの存否に依存せず `git show <commit>:<path>` で参照できる。

| 画面 | 固定コミット | 静的UIの正本 | production側の主な対応先 |
| --- | --- | --- | --- |
| 共通シェル＋ホーム | `5d4eda48e4544c9371d58cf339ecddf6358d7970` | `app/preview/` | `frontend/src/App.vue`, `frontend/src/styles/index.css`, `frontend/src/views/HomeView.vue` |
| 講習会・ロードマップ探索 | `26861270595877592a2175818fe45a7a557303e5` | `app/prototypes/discovery/` | `frontend/src/views/HomeView.vue`, `frontend/src/views/RoadmapListView.vue` |
| 講習会詳細 | `137afbd494e4e688108e6714c67605678fadc26f` | `app/prototypes/workshop-detail/` | `frontend/src/views/LectureDetailView.vue`, `frontend/src/views/SessionDetailView.vue` |
| ロードマップ詳細 | `76417a981918012dee5fc559089fd4e83e656a6d` | `app/prototypes/roadmap-detail/` | `frontend/src/views/RoadmapDetailView.vue` |
| プロフィール（見出し横の数値サマリーのみproduction維持） | `574c7ec5925345ada1c67094f502f16a3a5901ab` | `app/prototypes/profile/` | `frontend/src/views/ProfileView.vue`, `frontend/src/components/BadgeAlpha.vue` |
| 運営向けトップ | `9959bfc802d068839d5160dd43f3c852f81b5ad1` | `app/prototypes/admin-home/` | `frontend/src/views/AdminView.vue` |
| 講習会作成・編集 | `33246806db2947ddf9467c904eba824b8f6abc56` | `app/prototypes/workshop-editor/` | `frontend/src/views/LectureEditorView.vue`, `frontend/src/components/FlowInlineRunner.vue` |
| ロードマップ作成・編集 | `939b4207ff711463d16fc31c99814c2d321567b4` | `app/prototypes/roadmap-editor/` | `frontend/src/views/RoadmapEditorView.vue` |

## 実装順

1. 共通シェル、フォント、トークン、ページ幅、PC/モバイルナビゲーション。
2. ホーム／探索。
3. 講習会詳細と開催詳細。
4. ロードマップ詳細。
5. プロフィール。
6. 運営向けトップ。
7. 講習会作成・編集。
8. ロードマップ作成・編集。

画面ごとに、既存機能の回帰確認、デスクトップとモバイルの視覚比較、frontend検証、コミットを完了してから次へ進む。
