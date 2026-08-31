# 1m26_13

traP 1-Monthon 2026 13班のプロジェクトです。

バックエンドはGo、フロントエンドはVueで開発します。UIには
[BasiQ UI](https://github.com/traP-jp/basiq-ui)を使用する予定です。

## 開発環境

- mise 2026.8.3以降
- Go 1.26.4
- Node.js 24.19.0
- pnpm 11.20.0
- Docker EngineまたはDocker Desktop（Compose v2を含む）

Go、Node.js、pnpmのバージョンはmiseで管理しています。miseを使用しない場合も、
`mise.toml`と同じバージョンを用意してください。

## セットアップ

```sh
mise install --locked

cd frontend
mise exec -- pnpm install --frozen-lockfile

cd ../backend
cp .env.example .env
```

READMEのコマンドはmiseをshellで有効化していない環境でも動くよう、
`mise exec --`を明示しています。miseをshellで有効化している場合は省略できます。

`backend/.env`の`TRAQ_BOT_ACCESS_TOKEN`には、ユーザー一覧とユーザーグループ一覧を
取得できるtraQ Botのアクセストークンを設定してください。`.env`はGitの管理対象外です。
ローカル開発では`DEV_USER`に自分のtraQ IDを設定すると、NeoShowcaseを経由しなくても
認証済みユーザーとして動作を確認できます。

## ローカルデータベース

MariaDBとAdminerだけをDocker Composeで起動します。GoとVueはコンテナに入れず、
ホスト上で実行します。現在のGoバックエンドにはDB接続処理をまだ実装していないため、
ここで用意するのはローカルDB環境と将来使用する接続設定までです。

```sh
docker compose up -d
docker compose ps
```

MariaDBは`127.0.0.1:3307`、Adminerは <http://127.0.0.1:8081> で利用できます。
Adminerには次の値で接続します。

```text
Server: mariadb
Username: app
Password: password
Database: 1m26_13
```

コンテナを停止してもnamed volumeのデータは残ります。

```sh
docker compose down
```

データも含めて初期化するときだけ、`docker compose down --volumes`を使用してください。
Adminerは内容の確認にのみ使用し、テーブル定義は今後導入するマイグレーションで管理します。

WSLでDockerが利用できないという案内が出たら、まずDocker Desktopが起動しているか
確認してください。起動後も利用できない場合は、Docker DesktopのSettingsからResources、
WSL Integrationを開き、使用中のdistributionが有効になっているか確認します。

## 開発サーバー

バックエンドを起動します。

```sh
cd backend
set -a
. ./.env
set +a
mise exec -- go run ./cmd/server
```

別のターミナルでフロントエンドを起動します。

```sh
cd frontend
mise exec -- pnpm dev
```

フロントエンドは <http://localhost:5173>、バックエンドは
<http://localhost:8080> で起動します。Viteは`/api`へのリクエストをバックエンドへ
プロキシします。

フロントエンドのルーティングはhistory modeです。本番配信を設定するときは、
`/api`以外の未知のパスを`index.html`へフォールバックさせてください。

APIは`/api/v1`以下で提供します。API schemaとendpoint pathのsource of truthは
[`api/openapi.yaml`](api/openapi.yaml)です。`/api/v1`というprefixはOpenAPIの
`servers`、Goルーターの`BaseURL`、フロントエンドAPIクライアントの`baseUrl`に
それぞれ設定します。

仕様を変更した場合は、GoとTypeScriptのコードを再生成します。

```sh
cd backend
mise exec -- go generate ./...

cd ../frontend
mise exec -- pnpm generate:api
```

## traQユーザー・グループ

バックエンドは起動時にtraQ APIからユーザー一覧とユーザーグループ一覧を取得し、
メモリ上に同じ世代のスナップショットとして保持します。既定では5分ごとに両方を
再取得し、どちらか一方でも失敗した場合は直前の正常なスナップショットを維持します。
正常な更新から15分を超えた場合、古い情報を使い続けず`503 Service Unavailable`を
返します。更新間隔は`TRAQ_CACHE_REFRESH_INTERVAL`、利用可能期限は
`TRAQ_CACHE_MAX_STALE`で変更できます。

ブラウザからtraQ APIへ直接アクセスしたり、Botのアクセストークンをフロントエンドへ
渡したりはしません。現在のユーザーは`GET /api/v1/users/me`で取得します。

## NeoShowcaseへのデプロイ

同じFQDNにPath Overlayで次の2コンテキストを配置する想定です。

- フロントエンド: Static、context pathは`/`、SPAを有効化、部員認証はHARD
- バックエンド: Runtime、context pathは`/api`、portは`8080`、strip prefixは無効、部員認証はHARD

バックエンドには`APP_ENV=production`と`TRAQ_BOT_ACCESS_TOKEN`を環境変数として
設定します。バックエンドをNeoShowcaseの認証を通らない別経路で公開しないでください。
認証されたtraQ IDはNeoShowcaseが付与する`X-Forwarded-User`から受け取ります。
MariaDBはバックエンドアプリの作成時に有効化します。NeoShowcaseが接続情報を
`NS_MARIADB_*`環境変数として自動設定するため、値を手動で追加する必要はありません。

## チェック

フロントエンド:

```sh
cd frontend
mise exec -- pnpm check
mise exec -- pnpm build
```

バックエンド:

```sh
cd backend
test -z "$(mise exec -- gofmt -l .)"
mise exec -- go vet ./...
mise exec -- go test ./...
mise exec -- go build ./...
```

## ディレクトリ構成

```text
.
├── api/       # OpenAPI仕様
├── backend/   # Goバックエンド
├── frontend/  # Vueフロントエンド
└── compose.yaml  # ローカル開発用MariaDB・Adminer
```

## ブランチ運用

- 統合ブランチは`main`のみとする
- 変更は短命な作業ブランチからPull Requestを作成する
- ブランチ名は`chore/...`、`feat/...`、`fix/...`を基本とする
- Pull Requestは原則としてSquash mergeし、merge後に作業ブランチを削除する
- `main`を常にbuild可能な状態に保つ
