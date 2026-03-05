import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/app/quest/page.tsx"),
  "utf8"
);

test("end learning always navigates to top", () => {
  assert.equal(source.includes("if (!activeSessionId) {"), true);
  assert.equal(source.includes('setSessionError("セッションが開始されていません。保護者設定を保存した状態で回答すると自動開始されます。");'), false);
  assert.equal(source.includes("setSessionError(null);"), true);
  assert.equal(source.includes("router.push(\"/\");"), true);
  assert.equal(source.includes("const message = error instanceof Error ? error.message : \"session_end_failed\";"), true);
  assert.equal(source.includes("setSessionError(message);"), true);
});
