import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("top page keeps guardian session localStorage keys", () => {
  const source = read("src/app/page.tsx");
  assert.match(source, /mq:studentId/);
  assert.match(source, /mq:studentName/);
  assert.match(source, /mq:guardianMask/);
  assert.match(source, /mq:activeSessionId/);
});

test("quest page reads activeSessionId from localStorage", () => {
  const source = read("src/app/quest/page.tsx");
  assert.match(source, /mq:activeSessionId/);
  assert.match(source, /localStorage\.getItem\(LS_ACTIVE_SESSION_ID\)/);
  assert.doesNotMatch(source, /保護者レポート設定/);
});

test("guardian report mail includes required sections", () => {
  const source = read("src/lib/server/report.ts");
  assert.match(source, /1\. 学習時間/);
  assert.match(source, /2\. 解いたカテゴリ/);
  assert.match(source, /3\. カテゴリごとの代表誤答/);
  assert.match(source, /4\. 直近3回平均との差分/);
  assert.match(source, /5\. 次にやるとよい内容/);
  assert.match(source, /直近3回/);
});

test("db exposes report helper accessors", () => {
  const source = read("src/lib/server/db.ts");
  assert.match(source, /export const getSessionAnswers/);
  assert.match(source, /export const getSessionById/);
  assert.match(source, /export const getRecentCompletedSessions/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS session_reports/);
  assert.match(source, /export const saveSessionReport/);
  assert.match(source, /provider_message_id/);
  assert.match(source, /failure_reason/);
  assert.match(source, /bounce_class/);
});

test("mail sending is abstracted behind provider", () => {
  const source = read("src/lib/server/sessionService.ts");
  assert.match(source, /getMailProvider/);
  assert.match(source, /provider\.send/);
});

test("mail provider layer exists", () => {
  const source = read("src/lib/server/mail/provider.ts");
  assert.match(source, /export interface MailProvider/);
  const indexSource = read("src/lib/server/mail/index.ts");
  assert.match(indexSource, /export const getMailProvider/);
});
