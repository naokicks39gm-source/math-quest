import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/app/quest/page.tsx"), "utf8");

test("answer operations are locked while secondary explanation is open", () => {
  assert.match(source, /const isAnswerLockedByExplanation = isSecondaryQuest && showSecondaryExplanation/);
  assert.match(source, /if \(status !== 'playing' \|\| isStarting \|\| isAnswerLockedByExplanation\) return;/);
  assert.match(source, /disabled=\{status !== 'playing' \|\| isStarting \|\| isAnswerLockedByExplanation \|\| !canSubmitCurrentAnswer\}/);
});

test("skip from explanation is recorded and advances to next question", () => {
  assert.match(source, /const skipFromExplanation = \(\) => \{/);
  assert.match(source, /skipped: true/);
  assert.match(source, /setShowSecondaryExplanation\(false\)/);
  assert.match(source, /setShowSecondaryHint\(false\)/);
  assert.match(source, /nextQuestion\(\)/);
  assert.match(source, /skipped \? "スキップ"/);
});
