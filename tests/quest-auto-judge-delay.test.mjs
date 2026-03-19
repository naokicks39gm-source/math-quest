import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { readQuestSource } from "./helpers/quest-source.mjs";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("quest auto-judge delay mapping is digit-based", () => {
  const source = readQuestSource();
  assert.match(source, /export const getAutoJudgeDelayMs = \(digits: number\) => \{/);
  assert.match(source, /if \(digits <= 1\) return 700;/);
  assert.match(source, /if \(digits === 2\) return 1000;/);
  assert.match(source, /return 1300;/);
});

test("quest uses digit-based delay in all auto-judge scheduling paths", () => {
  const source = readQuestSource();
  const useCount = (source.match(/getAutoJudgeDelayMs\(getAnswerDigits\(\)\)/g) ?? []).length;
  assert.equal(useCount >= 3, true, "digit-based delay should be used in 3+ scheduling paths");
  assert.doesNotMatch(source, /const delayMs = 1500;/);
});
