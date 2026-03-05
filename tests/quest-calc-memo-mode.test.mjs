import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("quest is keypad-only and memo canvas does not trigger handwriting judge", () => {
  const source = read("apps/web/src/app/quest/page.tsx");
  const hsKeypad = read("packages/keypad/HighSchoolKeypad.tsx");
  assert.equal(source.includes("numpad"), true);
  assert.match(source, /計算メモ/);
  assert.match(source, /data-testid=\"calc-memo-area\"/);
  assert.match(source, /aria-label=\"calc-memo-canvas\"/);
  assert.match(source, /draggable=\{false\}/);
  assert.match(source, /MAX_MEMO_ZOOM/);
  assert.match(source, /onJudge=\{handleAttack\}/);
  assert.match(hsKeypad, /onClick=\{onJudge\}/);
  assert.doesNotMatch(source, /onClick=\{\(\) => runInference\(\)\}/);
});

test("legacy route exists for future handwriting recognition reuse", () => {
  const source = read("apps/web/src/app/quest-handwrite-legacy/page.tsx");
  assert.match(source, /function QuestPageInner/);
  assert.match(source, /const handleHandwritingJudge = async/);
});
