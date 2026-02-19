import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("quest is keypad-only and memo canvas does not trigger handwriting judge", () => {
  const source = read("src/app/quest/page.tsx");
  assert.match(source, /const \[inputMode\] = useState<'numpad' \| 'handwriting'>\('numpad'\)/);
  assert.match(source, /計算メモ/);
  assert.match(source, /data-testid="calc-memo-area"/);
  assert.match(source, /aria-label="calc-memo-canvas"/);
  assert.match(source, /MAX_MEMO_ZOOM/);
  assert.match(source, /h-\[200px\] sm:h-\[185px\]/);
  assert.match(source, /onClick=\{handleAttack\}/);
  assert.doesNotMatch(source, /onClick=\{\(\) => runInference\(\)\}/);
});

test("legacy route exists for future handwriting recognition reuse", () => {
  const source = read("src/app/quest-handwrite-legacy/page.tsx");
  assert.match(source, /function QuestPageInner/);
  assert.match(source, /const handleHandwritingJudge = async/);
});
