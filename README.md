# 1m26_13

traP 1-Monthon 2026 13班のプロジェクトです。

バックエンドはGo + Echo v4、フロントエンドはVue 3 + Vue Router + Piniaです。
API契約はOpenAPIからGoのstrict serverとTypeScript型を生成し、UIには
[BasiQ UI](https://github.com/traP-jp/basiq-ui)を使用します。

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
mise exec node pnpm -- env pnpm install --frozen-lockfile

cd ../backend
cp .env.example .env
```

READMEのコマンドはmiseをshellで有効化していない環境でも動くよう、
`mise exec node pnpm -- env pnpm`を明示しています。これにより、Node同梱のCorepackではなく
`mise.toml`で固定したNodeとpnpmの両方を使用します。miseをshellで有効化し、
`node`と`pnpm`がともに固定版へ解決される場合は省略できます。

`backend/.env`の`TRAQ_BOT_ACCESS_TOKEN`には、ユーザー一覧とユーザーグループ一覧を
取得できるtraQ Botのアクセストークンを設定してください。`.env`はGitの管理対象外です。
ローカル開発では`DEV_USER`に自分のtraQ IDを設定すると、NeoShowcaseを経由しなくても
認証済みユーザーとして動作を確認できます。

### Codex managed worktree

ChatGPTデスクトップアプリのCodex managed worktreeを作成すると、ローカルcheckoutの
`backend/.env`と、存在する場合はフロントエンドの`.env`系ファイルが
[`.worktreeinclude`](.worktreeinclude)に従って自動的にコピーされます。トークンを
worktreeごとに書き直す必要はなく、コピー先も引き続きGitの管理対象外です。

worktree作成時にlocal environmentの`1m26_13`を選ぶと、
`.codex/environments/environment.toml`のsetup scriptがmise経由でフロントエンドの依存を
準備します。Codexの画面上から開発サーバーとcheckも実行できます。

この自動コピーはCodexがローカルに作るmanaged worktreeだけが対象です。コマンドラインで
作成したworktreeやremote worktreeには適用されません。また、作成済みworktreeへ後から
自動反映はされません。

## バッジの見た目を再調整する

`frontend` で `mise exec node pnpm -- env pnpm dev --host 127.0.0.1` を起動し、
`http://127.0.0.1:5173/badge-lab.html` を開くと、本番の `BadgeAlpha.vue` と同じ
`src/components/badgeDesign.ts` を使って班色・差し色・関連名・共催・実サイズを比較できます。
このページは開発専用で、通常の本番buildには含まれず、APIへのアクセスや保存はしません。
講習会名と班を入力して比較 → 生成器を調整 → チェック → commit/PR、の順で反映してください。

- 形は講習会名から再現し、年度・獲得日時は入力に使いません。共通語の枠は公開講習会一覧から推定します。
  一覧に新しい名前が加わると共通語の選択が変わる場合があり、固定された授与データではありません。
- 班色はレビュー済みの近似色です。登録名の完全一致（大小文字・末尾の「班」・一部の日本語別名を正規化）で対応します。
  未知のグループ・主催未設定・個人主催は中立色で、講習会名から主催を推測しません。
- 現行APIの主催は1件です。プロフィールのバッジには既存の主催情報を渡しますが、共催モデルやDBは変更しません。
  生成器と開発viewerは複数班を扱えます。対等な角度分割であり、枠の着色面積の厳密な等分ではありません。
- `badgeGenerator.ts` の元の4層の描画は保持。`badgeDesign.ts` が班色の枠・内側の余白・白を残す差し色を適用します。
  調整後は `badgeDesign.test.ts` / `badgeNameAffinity.test.ts` と小サイズ・複数SVG同時表示を確認してください。

## ローカルデータベース

MariaDBとAdminerだけをDocker Composeで起動します。GoとVueはコンテナに入れず、
ホスト上で実行します。バックエンド起動時に接続確認と埋め込みmigrationを自動実行します。

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
Adminerは内容の確認にのみ使用し、テーブル定義は
`backend/internal/database/migrations`のmigrationで管理します。

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
mise exec node pnpm -- env pnpm dev
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

主要な実装範囲は次の通りです。

- Lectureと、その下に独立したSessionを1件以上登録・編集
- 公開Lectureのキーワード・学年度・分野検索と詳細表示
- 通常Sessionを`order`順の回として表示するLecture詳細。複数回だけ`#第N回`で回を直接表示し、再放送は学習者向け画面へ表示しない
- Session単位の完了、Lecture完了、バッジ、ロードマップ進捗の導出
- `lecture_pre`、`session_main`、`lecture_post`のFlowClassと、対象ごとに1件の適用時スナップショットFlow
- Lectureと通常Sessionを混在できる、段階なしの一本道ロードマップ
- Lecture / Session属性の後勝ち自動保存、競合通知、属性単位の更新イベント

Lecture、Session、FlowClass、Flow、Roadmapの削除APIはありません。

仕様を変更した場合は、GoとTypeScriptのコードを再生成します。

```sh
cd backend
GOCACHE=/tmp/1m26-go-cache mise exec -- go generate ./...

cd ../frontend
mise exec node pnpm -- env pnpm generate:api
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
mise exec node pnpm -- env pnpm check
mise exec node pnpm -- env pnpm build
```

バックエンド:

```sh
cd backend
test -z "$(mise exec -- gofmt -l .)"
mise exec -- go vet ./...
mise exec -- go test ./...
mise exec -- go build ./...
```

起動済みのローカルAPIに対するMariaDB結合確認:

```sh
API_BASE_URL=http://127.0.0.1:8080/api/v1 ./scripts/smoke-api.sh
```

このスクリプトは、認証、Lectureと第1回Sessionと3件のFlowの原子的な登録、Session追加、
Flowの適用時スナップショット、チェックとページ位置、属性自動保存と競合通知、履歴、JSON書き出しを
一巡します。確認用レコードは削除しません。

## ディレクトリ構成

```text
.
├── api/       # OpenAPI仕様
├── backend/   # Goバックエンド
├── frontend/  # Vueフロントエンド
├── scripts/   # 再現可能な結合スモークテスト
└── compose.yaml  # ローカル開発用MariaDB・Adminer
```

## ブランチ運用

- 統合ブランチは`main`のみとする
- 変更は短命な作業ブランチからPull Requestを作成する
- ブランチ名は`chore/...`、`feat/...`、`fix/...`を基本とする
- Pull Requestは原則としてSquash mergeし、merge後に作業ブランチを削除する
- `main`を常にbuild可能な状態に保つ
