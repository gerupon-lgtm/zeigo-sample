# GitHub Pages公開・更新手順

## 公開先

- リポジトリ： https://github.com/gerupon-lgtm/zeigo-sample
- サンプル： https://gerupon-lgtm.github.io/zeigo-sample/
- 3案の比較： https://gerupon-lgtm.github.io/zeigo-sample/?compare=1
- 自動公開の実行履歴： https://github.com/gerupon-lgtm/zeigo-sample/actions/workflows/deploy.yml

これはリニューアル提案用サンプルです。店舗の現行サイト `zeigo.net` とは別のURLです。3案の切替、比較、編集デモを公開版にも含めています。編集デモの変更は、閲覧したブラウザ内にだけ保存されます。

## 公開方式

GitHub PagesのソースはGitHub Actionsです。`.github/workflows/deploy.yml` は `main` へのpush、または手動実行で起動します。

1. Node.js 24で `npm ci`。
2. `npm test` で創業年数、編集データ、お知らせの件数と表示順を検証。
3. `npm run build:pages` で `/zeigo-sample/` を基点としてビルド。
4. `dist/` をPages用artifactとしてアップロード。
5. `github-pages` 環境へ公開。

公式GitHub Actionsは確認したコミットSHAに固定しています。同時に2つの公開が走ると、古い公開処理をキャンセルして最新のものを優先します。

## 内容を更新する

価格・営業時間・写真パス・お知らせの初期内容は `src/content.json` で管理します。写真は `public/images/` に配置し、内容データでは `/images/ファイル名` を指定してください。表示時にビルド先の基点を付けるため、ローカルとGitHub Pagesで同じデータを使用できます。編集デモからのアップロード画像はdata URLのまま扱います。

更新時は `src/version.ts` と `index.html` の読み込みURLの `v` を同じ新しい番号にします。現在は `20261003-4` です。編集操作・表示10件／保存20件の仕様は [editing-spec.md](editing-spec.md) を参照してください。

```powershell
npm.cmd test
npm.cmd run build:pages
git add src/content.json src/version.ts index.html
# 写真なども変更した場合は、そのファイルを指定して追加してください。
git commit -m "Update zeigo site content"
git push origin main
```

Actionsが成功した後に公開URLを確認してください。公開版にブラウザ内の編集内容が保存されていると、その内容を優先します。公開の初期データを確認するときは「編集デモ」で初期内容に戻すか、プライベートブラウジングで閲覧してください。

## 公開用ビルドをローカル確認する

```powershell
npm.cmd run build:pages
npm.cmd run preview -- --base=/zeigo-sample/ --port 4173
```

http://127.0.0.1:4173/zeigo-sample/ を開きます。写真、フォント、お品書き原本、3案の比較を確認してください。

ブラウザによる検証は、上のサーバーを起動したまま別ウィンドウで実行できます。

```powershell
$env:CHECK_URL = 'http://127.0.0.1:4173/zeigo-sample/'
npm.cmd run check:browser
npm.cmd run check:editing
```

実行にはREADMEに記載のPlaywright用Chromiumが必要です。

## 公開が失敗した場合

- Actionsの失敗したステップのログを確認。
- Settings → Pages → SourceがGitHub Actionsになっていることを確認。
- テストやビルドの失敗はローカルで再現して修正し、再度push。
- 一時的な失敗はActionsのRe-run failed jobsで再実行。
- 表示が白い、写真が出ない場合は `/zeigo-sample/` 付きのURLで公開用ビルドを確認。

参考：[ViteのGitHub Pages公開ガイド](https://vite.dev/guide/static-deploy.html#github-pages)、[GitHub Pagesのカスタムワークフロー](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
