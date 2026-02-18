import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("top page has learning start controls and guardian link", () => {
  const source = read("src/app/page.tsx");
  assert.match(source, /学習の選択と開始/);
  assert.match(source, /選択した学習ではじめる/);
  assert.match(source, /全学年まとめてはじめる/);
  assert.match(source, /保護者レポート設定ページへ/);
  assert.match(source, /router\.push\("\/guardian"\)/);
});

test("guardian page is settings-only", () => {
  const source = read("src/app/guardian/page.tsx");
  assert.match(source, /保護者レポート設定/);
  assert.match(source, /保存/);
  assert.doesNotMatch(source, /選択した学習ではじめる/);
  assert.doesNotMatch(source, /全学年まとめてはじめる/);
  assert.doesNotMatch(source, /学習セッション開始/);
  assert.doesNotMatch(source, /学習終了（レポート配信）/);
});

test("quest page reads localStorage keys and auto-session logic", () => {
  const source = read("src/app/quest/page.tsx");
  assert.match(source, /mq:activeSessionId/);
  assert.match(source, /mq:studentId/);
  assert.match(source, /const ensureActiveSession/);
  assert.match(source, /\/api\/session\/start/);
  assert.match(source, /\/api\/session\/answer/);
  assert.match(source, /学習終了（レポート配信）/);
  assert.match(source, /\/api\/session\/end/);
});

test("guardian report mail includes required sections", () => {
  const source = read("src/lib/server/report.ts");
  assert.match(source, /1\. 学習時間/);
  assert.match(source, /2\. 解いたカテゴリ/);
  assert.match(source, /fullPathName/);
  assert.match(source, /3\. カテゴリごとの代表誤答/);
  assert.match(source, /4\. 直近3回平均との差分/);
  assert.match(source, /5\. 次にやるとよい内容/);
});

test("db exposes report helper accessors and session report table", () => {
  const source = read("src/lib/server/db.ts");
  assert.match(source, /export const getSessionAnswers/);
  assert.match(source, /export const getSessionById/);
  assert.match(source, /export const getRecentCompletedSessions/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS session_reports/);
  assert.match(source, /export const saveSessionReport/);
});

test("mail sending is abstracted behind provider", () => {
  const source = read("src/lib/server/sessionService.ts");
  assert.match(source, /getMailProvider/);
  assert.match(source, /provider\.send/);
});
