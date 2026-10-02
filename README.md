# 麺処 田舎家（ぜいご）サイトリニューアル提案

三重県鈴鹿市の「麺処 田舎家（ぜいご）」の現行サイトを確認し、上品な和の3案を作成した、ローカル閲覧用フロントエンドです。

## 公開サンプル

GitHubリポジトリ： https://github.com/gerupon-lgtm/zeigo-sample

公開先： https://gerupon-lgtm.github.io/zeigo-sample/

- A： https://gerupon-lgtm.github.io/zeigo-sample/?design=shiro
- B： https://gerupon-lgtm.github.io/zeigo-sample/?design=ai
- C： https://gerupon-lgtm.github.io/zeigo-sample/?design=komorebi
- 比較： https://gerupon-lgtm.github.io/zeigo-sample/?compare=1

`main` へのpushでGitHub Actionsがテスト・ビルド・GitHub Pagesへの公開を実行します。手動再公開はリポジトリのActionsから `Deploy zeigo sample to GitHub Pages` を実行してください。詳しくは [docs/deployment.md](docs/deployment.md) を参照してください。

## サンプルを開く

Node.js 24を使用して動作確認しています。

```powershell
cd "C:\Users\user\Documents\project\田舎家サンプル"
npm.cmd install --cache .npm-cache
npm.cmd run dev
```

ブラウザで http://127.0.0.1:5173/ を開いてください。上部でデザインを切り替えられます。

| 案 | テーマ | URL |
| --- | --- | --- |
| A | 白と墨：余白と縦書きで伝える、端正な和 | http://127.0.0.1:5173/?design=shiro |
| B | 藍と余韻：深い藍と大きな写真、会食にも似合う落ち着き | http://127.0.0.1:5173/?design=ai |
| C | 木漏れ日：柔らかな緑と木の色、家族で通う親しみ | http://127.0.0.1:5173/?design=komorebi |
| 比較 | 3案を並べた比較画面 | http://127.0.0.1:5173/?compare=1 |

`ローカルで起動.cmd` をダブルクリックしても起動できます。開発サーバーのウィンドウを閉じるとサンプルも停止します。

## 実装しているもの

- 3つのデザイン、PC・タブレット・スマートフォンに対応。
- 店舗紹介、カテゴリを切り替えられるお品書き24品、税込価格。
- 現行のお品書き原本6枚を拡大閲覧。
- お知らせの詳細表示。
- 電話、Instagram、Google Mapsの地図・経路へのリンク。
- スマートフォンメニューと、画面下の電話・地図への導線。
- デザイン比較画面。
- 写真・価格・営業情報の編集デモ。変更を保存すると3案へ反映。
- JSONの書き出し・読み込み、初期内容への復元。
- 創業についての一文と、創業年数の自動計算。日本時間で計算し、再公開なしで年数が変わります。

写真・フォントを同梱しているため、表示のための外部画像・フォント取得は不要です。電話・Instagram・Google Mapsなどの外部リンクの利用には通信が必要です。

## 編集デモについて

上部の「編集デモ」で変更できます。スマートフォンでは鉛筆アイコンです。

1. 写真を選ぶ、または価格・営業情報を入力します。
2. 「変更を保存」でサイトへ反映します。
3. リロードしても、同じブラウザ・同じURLの保存内容が維持されます。
4. 「JSONを書き出す」でバックアップできます。

**保存先は、このブラウザのlocalStorageだけです。公開中の実店舗サイトは更新されません。別の端末やブラウザには共有されません。** 写真はJPEG・PNG・WebP、各1MB以下。保存容量不足や不正な画像・JSONは画面に理由を表示します。アップロードした写真もJSONに含まれます。

実運用のCMS・ログイン・サーバー保存・写真配信・公開承認は今回の範囲に含めていません。次段階の構成案は [docs/proposal.md](docs/proposal.md) に記載しています。

## 創業年数の自動更新

現行サイトの「昭和54年創業」を根拠に、`src/content.json` の `shop.foundedYear` を `1979` にしています。「昭和54年（1979年）創業。鈴鹿の地で、今年で47年。」の年数部分は、閲覧時に日本時間の年から計算します。2027年は48年と表示され、毎年の手動更新やビルドは不要です。

創業日は未確認なので、`shop.foundedDate` は `null` です。この状態では「今年で〇年」という年単位の表現を使用します。確認後に `1979-MM-DD` 形式の正しい年月日を設定すると、「創業〇周年。」へ切り替わり、毎年その日の日本時間0時を基準に満年数が増えます。表示計算はページの読み込み・再描画時に実行します。日付を設定する際は、創業日の表現と周年の数え方を店舗と合わせてください。

ブラウザに編集データが保存されている場合、初期JSONより保存内容を優先します。創業日を追記したあと初期データを確認する際は、編集デモで初期内容に戻すか、書き出したJSONにも同じ日付を設定してください。

## 内容の管理

`src/content.json` が3案共通の初期データです。価格・写真パス・営業情報・お知らせを表示コンポーネントと分離しています。ブラウザに保存済みの編集内容がある場合、その内容を優先します。初期JSONの変更を確認する際は、編集デモで「初期内容に戻す」を実行してください。

- `src/App.tsx`：ページ構成と3案のヒーロー、比較、ナビゲーション。
- `src/styles.css`：テーマ、レスポンシブ、アクセシビリティ。
- `src/Editor.tsx`：編集デモとデータ検証。
- `src/Modal.tsx`：キーボード対応のダイアログ。
- `public/images/`：公式サイト素材、提案用生成画像、比較画面のプレビュー。
- `public/fonts/`：Noto Serif JPの文字サブセットとSIL Open Font License。
- `docs/previews/`：PC・スマートフォンのスクリーンショット。
- `docs/source-review.md`：現行サイトの確認結果、転載元、確認事項。

## ビルド・動作確認

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run preview
```

本番ビルドは `dist/` に出力します。`preview` は http://127.0.0.1:4173/ です。`dist/index.html` を直接ダブルクリックするのではなく、HTTPサーバーで閲覧してください。

ブラウザ確認を再実行する場合：

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location).Path '.cache\ms-playwright'
npx.cmd --cache .npm-cache playwright install chromium --only-shell
# 別ウィンドウで npm.cmd run dev を起動した状態で
npm.cmd run check:browser
```

3案×5幅（320・390・768・1024・1440px）について横スクロール、ナビゲーション、お品書きカテゴリ、原本表示、お知らせを確認し、価格保存・リロード・案間の共有・写真アップロード・JSON書き出し・不正JSON拒否・初期化を操作します。プレビュー画像も更新します。

公開先はGitHub Pagesです。Vercelを追加の公開先として使う場合は、未導入のVercel CLIを `npm i -g vercel` で導入すると、`vercel env pull`・`vercel deploy`・`vercel logs` を使えます。
