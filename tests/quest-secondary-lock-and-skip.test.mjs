import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/app/quest/page.tsx"), "utf8");
const hsKeypadSource = fs.readFileSync(path.join(process.cwd(), "src/components/keypad/HighSchoolKeypad.tsx"), "utf8");

test("answer operations are locked while secondary explanation is open", () => {
  assert.match(source, /const isAnswerLockedByExplanation =/);
  assert.match(source, /\(isSecondaryQuest && showSecondaryExplanation\)/);
  assert.match(source, /\(isElementaryQuest && shouldRenderElementaryExplanationPanel\)/);
  assert.match(source, /if \(status !== 'playing' \|\| isStarting \|\| isAnswerLockedByExplanation\) return;/);
  assert.match(source, /isAnswerLocked=\{isAnswerLockedByExplanation\}/);
  assert.match(source, /canSubmit=\{canSubmitResolved\}/);
  assert.match(hsKeypadSource, /disabled=\{baseDisabled \|\| !canSubmit\}/);
  assert.match(source, /if \(practiceResult\?\.ok === false && currentLearningShowExplanation\) \{/);
  assert.match(source, /setShowSecondaryExplanation\(true\)/);
});

test("skip from explanation is recorded and advances to next question", () => {
  assert.match(source, /const skipFromExplanation = \(\) => \{/);
  assert.match(source, /skipped: true/);
  assert.match(source, /setShowSecondaryExplanation\(false\)/);
  assert.match(source, /setShowSecondaryHint\(false\)/);
  assert.match(source, /nextQuestion\(\)/);
  assert.match(source, /skipped \? "スキップ"/);
});
