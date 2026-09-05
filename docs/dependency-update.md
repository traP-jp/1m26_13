# BasiQ UI の更新

2026-09-05 に `0.1.0-beta.5` から `0.1.0-beta.6` へ更新した。
[公式リリース](https://github.com/traP-jp/basiq-ui/releases/tag/v0.1.0-beta.6)と
[npm メタデータ](https://registry.npmjs.org/basiq-ui)を照合し、公開済みの最新リリースかつ `next` が beta.6 であることを確認した。`latest` タグは beta.0 のまま。

- Select、Tooltip、DropdownMenu、Calendar、DatePicker、Progress が追加され、Input がアイコン・装飾・クリアボタンに対応した。
- 既存の CSS トークンの削除はなく、37 個追加された。使用中の既存部品の公開プロパティは維持されている。
- 新しい peer dependency `@internationalized/date` は既存の推移依存と同じ `3.12.3` を直接依存として固定した。他の依存のバージョンは変更していない。
- 既存方針どおり公式 npm 配布物を `frontend/vendor` に固定した。MIT ライセンスを同梱し、install hook はない。取得時・インストール時とも script は実行していない。
- 配布物の SHA-512 は npm メタデータと一致する。`sha512-RGkx4Th4M+CUOR9rEa61zjQb0CH8swVNUM/p+ZuADoFbIy8QwjE36a0MYymBPrOxHsIhWlEQcMmXLoSeWFfW6A==`

Select の選択肢は空文字を値にできない。未選択は `null` を使い、「すべて」の選択肢を用意する場合は専用値と検索条件の空文字を境界で変換する。

開発サーバーを起動したまま依存を更新すると、旧版の最適化キャッシュが残ることがある。更新後は Vite を `--force` 付きで再起動し、ブラウザで追加コンポーネントを使う画面への遷移も確認する。beta.6 更新時はこの手順で検索画面の `BasiqSelect` 読み込みエラーを解消した。
