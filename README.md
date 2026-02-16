# Ranchu Japan Corporate Site

Ranchu Japan合同会社のコーポレートサイト実装です。

## Features
- 信頼獲得重視のコーポレートデザイン
- SEO/AEO最適化の基本実装
  - 固有 title / meta description / canonical
  - JSON-LD (Organization, WebSite, Service, SoftwareApplication)
  - `sitemap.xml`, `robots.txt`, `llms.txt`
- フルスタック構成
  - Node.js HTTPサーバー
  - `/api/contact` 問い合わせAPI
  - バリデーション、簡易レート制限、ハニーポット
  - `data/inquiries.ndjson` への保存
 - Vercelデプロイ対応
   - `@vercel/static-build` で静的ページ配信
   - `api/contact.js` でServerless APIを提供

## Run
```bash
npm start
```

開発モード:
```bash
npm run dev
```

本番ビルド:
```bash
npm run build
```

ブラウザ: `http://localhost:3000`

## Contact Data
問い合わせ送信データは `data/inquiries.ndjson` に追記されます。

## Pages
- `/`
- `/solutions/`
- `/solutions/government/`
- `/solutions/enterprise/`
- `/solutions/store/`
- `/solutions/partner/`
- `/services/custom-development/`
- `/services/kuchitoru/`
- `/case-studies/`
- `/company/`
- `/news/`
- `/contact/`
- `/privacy/`

## Notes
- Canonical URL は `https://www.ranchujpn.com` を前提に設定しています。
- OGP画像は `public/assets/images/og-default.svg` を利用しています。
- VercelのServerless実行環境は永続ストレージではないため、問い合わせ永続化は外部DB（Supabase等）連携を推奨します。
