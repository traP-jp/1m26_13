# 運営向けトップ UI prototype

運営向けトップだけを確認する、固定モックデータの静的プロトタイプです。

- 本番のVue island、ルーター、API、D1、認証、保存処理には接続しません。
- `basiq-ui@0.1.0-beta.3` の `BasiqThemeProvider`、`BasiqButton`、`BasiqFormField`、`BasiqInput`、`BasiqTabs` を使います。
- 最近編集した講習会を更新順で最初に置き、作成は見出し横の小さなボタン、ロードマップ管理はその下へまとめます。
- 検索と公開状態タブは、その場の固定配列だけを絞り込みます。
- 作成・閲覧・編集ボタンは画面遷移を行いません。

`app` ディレクトリで次を実行すると確認できます。

```sh
./node_modules/.bin/vite --config prototypes/admin-home/vite.config.ts
```
