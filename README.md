# Life Plan Simulator (LifePlanSim)

ブラウザのみで動作するライフプラン／家計シミュレーションアプリです。複数のシナリオを作成し、収入・支出・住宅・車・貯蓄条件を入力すると、年間キャッシュフローと累積資産を比較できます。

## 主な機能

- 複数シナリオの比較（グラフ・サマリー表）
- 年間キャッシュフロー（棒）と累積資産（折れ線）の可視化
- シナリオの JSON 書き出し／読み込み
- シナリオセットを URL（`?snapshot=`）として共有

## クイックスタート

前提: Node.js / npm

```bash
cd app
npm ci
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

## ビルド

```bash
cd app
npm run build
npm run preview
```

成果物は `app/dist` に出力されます。

## ドキュメント

- ユーザーガイド: `docs/USER_GUIDE.md`

## GitHub Pages で公開

このプロジェクトはフロントエンド（`app/`）を GitHub Pages へデプロイできます（GitHub Actions）。

- ワークフロー: `.github/workflows/deploy-pages.yml`
- Pages の設定: GitHub リポジトリの Settings → Pages → Source を「GitHub Actions」に設定
- 公開 URL: `https://<user>.github.io/<repo>/`

## 開発用コマンド（app）

```bash
cd app
npm run lint
npm test
```
