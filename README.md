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

## Run
```bash
npm start
```

開発モード:
```bash
npm run dev
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
- 実運用時は会社情報・実績数値・法務文面を確定値に置き換えてください。
