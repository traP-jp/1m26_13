# ロードマップ作成・編集（見た目確認用）

本番アプリから独立した、見た目確認専用の静的プロトタイプです。固定モックデータだけを使い、API、D1、認証、ルーター、`sessionStorage`には接続しません。

```sh
cd app
npm exec vite -- --config prototypes/roadmap-editor/vite.config.ts
```

静的ビルド:

```sh
cd app
npm exec vite -- --config prototypes/roadmap-editor/vite.config.ts build
```

画面上の入力はメモリ内だけで変化します。ロードマップは講習会の順序付きリストとして扱い、追加、単一選択による変更、左端のグリップによるドラッグ並べ替え、講習会ごとのコメント入力、削除を試せます。保存、ロードマップ削除、ナビゲーションは意図的に未接続です。
