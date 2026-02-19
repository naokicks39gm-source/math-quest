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

## 実機スマホ接続（同一Wi-Fi）

`npm run dev` は `0.0.0.0:3001` で待ち受けるため、同一Wi-Fi内のスマホからアクセスできます。

1. Mac とスマホを同じWi-Fiに接続する。
2. スマホのSafariで次のどちらかを開く。
- `http://<Macのlocal名>.local:3001`（推奨）
- `http://<固定IP>:3001`（DHCP予約を使う場合）
3. 開けたら、Safariの共有メニューから「ホーム画面に追加」で擬似アプリ化する。

### 固定URL運用

- 優先: `.local` 名アクセス（例: `macbook-pro.local:3001`）
- 代替: ルーターでDHCP予約し、Macに固定IPを割り当てる

どちらも、毎回URLを探し直す手間を減らせます。

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

## 保護者レポート運用（GUI）

1. `保護者レポート設定ページへ` から `/guardian` を開く。
2. 児童名と保護者メールを入力して `保存` を押す。
3. トップページ `/` に戻り、学年/カテゴリ/タイプを選んで `選択した学習ではじめる` を押す。
4. クエストで1問以上回答する（初回回答時にセッション自動開始）。
5. クエスト画面の `学習終了（レポート配信）` を押す。
6. 画面の `メール: sent (...)` と、受信メールの本文5セクションを確認する。

レポート本文の必須セクション:

- 学習時間（開始〜終了、合計分）
- 解いたカテゴリ（問題数と正答率）
- カテゴリごとの代表誤答（問題/入力/正解）
- 直近3回平均との差分
- 次にやるとよい内容

## 実機確認チェックシート

1. `/` が表示される
2. `/guardian` で保存できる
3. `/quest` の手書き入力が動く
4. `学習終了（レポート配信）` 押下後、送信結果が確認できる

## トラブルシュート（スマホ接続）

- 接続不可:
  Macとスマホが同一Wi-Fiか確認。
- タイムアウト:
  開発サーバーが起動中か確認。
- メール送信不可:
  `.env.local` の `MQ_SMTP_*` と `MQ_MAIL_PROVIDER` を確認。
- iPhoneで古い画面が出る:
  Safariで再読み込み、必要なら履歴とWebサイトデータを削除。

## 分数の手書き入力

- `frac` 問題は `a/b` の形で書いてください（例: `3/4`）。
- スラッシュ `/` をはっきり斜め線で書くと認識が安定します。
- `仮分数・帯分数` 問題は次の形式で入力してください。
- 帯分数: `2 1/3`（整数部 + 半角スペース + 分数）
- 仮分数: `7/3`
- 既習学年（`E5` 以上、`J`、`H`）では、未約分の回答は不正解になります。
  例: 正答 `1/2` に対して `2/4` は不正解。
- クエスト画面の `BatchMixed100` で、帯分数/仮分数変換の認識率をまとめて確認できます。

## 書き心地優先モード

- クエスト画面は初期状態で「書き心地優先（Ink-first）」です。
- 既定では `AUTO` が OFF で、描画中に自動判定を走らせません。
- ガイド表示（28x28プレビュー、AutoDraw補助表示）は設定内の `ガイド` を ON にしたときだけ表示されます。
- 認識テスト（`Batch*`）は設定（⚙）を開いたときだけ使えます。
- 書き枠は入力エリアの横幅いっぱいに広がります（正方形）。
- 枠の外側は最小 8px まで判定対象です。
- 判定は「見た目枠中心 + 外側8px」のROIだけを使うため、不要な周辺ノイズを拾いにくくしています。
- `Batch100` / `BatchFrac100` / `BatchMixed100` は、`空判定`・`過分割`・`構造失敗` を表示して弱点を確認できます。
- 精度が急に落ちた場合は、まず「復旧優先」の閾値（小数点/分数の取りこぼしを減らす設定）で戻し、指標が安定してから段階的に最適化します。

## 回答入力と計算メモ

- `/quest` の回答入力はテンキー専用です。
- テンキーは小型化し、記号キー `.` `/` `-` を追加しています。
- 記号キーは問題形式に応じて有効化されます（小数は `.`, 分数は `/`）。
- 手書きは「計算メモ欄」として利用します（採点には使いません）。
- 計算メモ欄は 2 本指ピンチで拡大縮小できます。`100%` で表示倍率をリセットできます。
- 将来の再利用用に旧手書き判定画面を `/quest-handwrite-legacy` に退避しています（通常導線には表示しません）。

## 環境変数（メール送信用）

- `MQ_EMAIL_ENC_KEY` (base64エンコード済み32byte鍵)
- `MQ_SMTP_HOST`
- `MQ_SMTP_PORT`
- `MQ_SMTP_USER`
- `MQ_SMTP_PASS`
- `MQ_SMTP_FROM`
- `MQ_SMTP_SECURE` (`true` / `false`)
- `MQ_MAIL_PROVIDER` (`smtp` or `brevo`, 省略時は `smtp`)

## 秘密情報の取り扱い

- APIキー、SMTPキー、個人メールアドレスはログやコミットに残さない。
- 画面共有やスクリーンショット時はメールアドレスをマスクする。

## 運用ログ

- 送信ログは `mail_deliveries` に保存（provider / provider_message_id / failure_reason / bounce_class を含む）
- レポートJSONは `session_reports` に保存（再送・監査・分析用）
