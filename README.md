# 1m26_13

traP 1-Monthon 2026 13班のプロジェクトです。

バックエンドはGo、フロントエンドはVueで開発します。UIには
[BasiQ UI](https://github.com/traP-jp/basiq-ui)を使用する予定です。

## 開発環境

- mise 2026.8.3以降
- Go 1.26.4
- Node.js 24.19.0
- pnpm 11.20.0

Go、Node.js、pnpmのバージョンはmiseで管理しています。miseを使用しない場合も、
`mise.toml`と同じバージョンを用意してください。

## セットアップ

```sh
mise install --locked

cd frontend
pnpm install --frozen-lockfile
```

miseをshellで有効化していない場合は、`go`や`pnpm`の代わりに
`mise exec -- go`、`mise exec -- pnpm`を使用できます。

## 開発サーバー

バックエンドを起動します。

```sh
cd backend
go run ./cmd/server
```

別のターミナルでフロントエンドを起動します。

```sh
cd frontend
pnpm dev
```

フロントエンドは <http://localhost:5173>、バックエンドは
<http://localhost:8080> で起動します。Viteは`/api`へのリクエストをバックエンドへ
プロキシします。

APIは`/api/v1`以下で提供します。API schemaとendpoint pathのsource of truthは
[`api/openapi.yaml`](api/openapi.yaml)です。`/api/v1`というprefixはOpenAPIの
`servers`、Goルーターの`BaseURL`、フロントエンドAPIクライアントの`baseUrl`に
それぞれ設定します。

仕様を変更した場合は、GoとTypeScriptのコードを再生成します。

```sh
cd backend
go generate ./...

cd ../frontend
pnpm generate:api
```

## チェック

フロントエンド:

```sh
cd frontend
pnpm check
pnpm build
```

バックエンド:

```sh
cd backend
test -z "$(gofmt -l .)"
go vet ./...
go test ./...
go build ./...
```

## ディレクトリ構成

```text
.
├── api/       # OpenAPI仕様
├── backend/   # Goバックエンド
└── frontend/  # Vueフロントエンド
```

## ブランチ運用

- 統合ブランチは`main`のみとする
- 変更は短命な作業ブランチからPull Requestを作成する
- ブランチ名は`chore/...`、`feat/...`、`fix/...`を基本とする
- Pull Requestは原則としてSquash mergeし、merge後に作業ブランチを削除する
- `main`を常にbuild可能な状態に保つ
