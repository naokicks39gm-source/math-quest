This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 開発ルール

完成条件は `make check` が成功すること。

## 保護者レポート運用

1. トップページで児童名と保護者メールを入力し、`保存` を押す。
2. `学習開始` を押してから問題を解く。
3. 学習後にトップページへ戻って `学習終了` を押す。
4. 学習終了時に保護者メールへレポートを送信する。

レポートには以下を含みます。

- 学習時間（開始〜終了、合計分）
- 解いたカテゴリ（問題数と正答率）
- カテゴリごとの代表誤答（問題/入力/正解）
- 直近3回平均との差分
- 次にやるとよい内容

## 環境変数（メール送信用）

- `MQ_EMAIL_ENC_KEY` (base64エンコード済み32byte鍵)
- `MQ_SMTP_HOST`
- `MQ_SMTP_PORT`
- `MQ_SMTP_USER`
- `MQ_SMTP_PASS`
- `MQ_SMTP_FROM`
- `MQ_SMTP_SECURE` (`true` / `false`)
- `MQ_MAIL_PROVIDER` (`smtp` or `brevo`, 省略時は `smtp`)

## 運用ログ

- 送信ログは `mail_deliveries` に保存（provider / provider_message_id / failure_reason / bounce_class を含む）
- レポートJSONは `session_reports` に保存（再送・監査・分析用）
