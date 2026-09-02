# 1-Monthon β

過去の講習会と教材を資産として残し、運営の登録から、学習者の発見・受講完了・バッジ・ロードマップ進捗までをローカルで一巡できるβ版です。画面はVue 3と実際の`basiQ-ui`コンポーネント、APIはVinext、永続化はローカルD1で構成しています。

## 必要な環境

- Node.js 22.13以上
- npm

外部アカウント、認証情報、有料サービスは不要です。

## 新規環境で起動する

```bash
cd app
npm install
npm run dev
```

[http://localhost:3000/](http://localhost:3000/)を開きます。初回アクセス時にchecked-in migrationと、1回開催・全3回開催・再放送を含むサンプルデータが`app/.wrangler/`のローカルD1へ作成されます。再起動しても入力内容と完了記録は保持されます。

既存α版のローカルテーブルは削除しません。β版は追加テーブルを使い、画面/APIからはβデータだけを扱います。

## 主な画面

- `/`: 検索バーと、公開講習会の全件カード表示
- `/workshops`: ホーム検索の結果と、キーワード・班・年度による追加絞り込み
- `/workshops?view=roadmaps`: 学習者向けロードマップ一覧
- `/workshops/:id`: 講習会まとめ兼開催詳細。複数回は`#3`のような回番号で移動
- `/roadmaps/:id`: 段階ごとの講習会と、完了記録から導出した進捗
- `/admin/workshops/new`: 案内付き登録。新規作成はこの画面へ統一
- `/admin/workshops/:id`: 講習会・開催の編集、再放送/次回の複製
- `/admin`: 講習会作成とロードマップ管理を集約した運営向けページ
- `/admin/roadmaps/new`: ロードマップの作成
- `/admin/roadmaps/:id`: ロードマップの編集・公開状態変更・削除
- `/users/demo-learner`: 完了履歴、講習会ごとのバッジ、ロードマップ進捗

案内付き登録と既存講習会の通常編集画面は、同じ講習会/開催データ型と保存APIを使います。認証は未実装で、`demo-learner`は個人情報と結び付かない固定のローカル試用personaです。

## 検証

全ゲートを続けて実行します。

```bash
cd app
npm run check
```

`check`は型検査、ESLint、ドメインテスト、隔離した一時D1でのAPI統合テスト、production buildを順に実行します。統合テストは普段の`app/.wrangler/`を変更しません。

個別に実行する場合:

```bash
npm run check:static
npm run test:api
npm run build
```

任意の隔離D1を使う開発時は`BETA_PERSIST_PATH=/absolute/path npm run dev`を指定できます。旧`ALPHA_PERSIST_PATH`は互換目的でのみ継続対応しています。

## 内部試用

[INTERNAL_TRIAL.md](./INTERNAL_TRIAL.md)で中心導線を一巡できます。外部公開、traQ/wikiへの投稿、第三者サービスへの送信は行いません。設計判断は[DECISIONS.md](./DECISIONS.md)、検証結果と未実装範囲は[STATUS.md](./STATUS.md)を参照してください。
