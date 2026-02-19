import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const questSource = fs.readFileSync(path.join(process.cwd(), "src/app/quest/page.tsx"), "utf8");
const legacySource = fs.readFileSync(path.join(process.cwd(), "src/app/quest-handwrite-legacy/page.tsx"), "utf8");

test("quest uses keypad answer flow and calc memo canvas", () => {
  assert.match(questSource, /const \[inputMode\] = useState<'numpad' \| 'handwriting'>\('numpad'\)/);
  assert.match(questSource, /const \[isMemoOpen, setIsMemoOpen\] = useState\(false\)/);
  assert.match(questSource, /計算メモを閉じる/);
  assert.match(questSource, /data-testid="calc-memo-area"/);
  assert.match(questSource, /計算メモ/);
  assert.match(questSource, /onClick=\{handleAttack\}/);
  assert.match(questSource, /onClick=\{clearMemo\}/);
  assert.match(questSource, /onClick=\{\(\) => setIsMemoOpen\(\(prev\) => !prev\)\}/);
});

test("calc memo keeps pinch handlers for zoom interactions", () => {
  assert.equal(questSource.includes("calcZoom"), true);
  assert.equal(questSource.includes("calcPan"), true);
  assert.equal(questSource.includes("isPinchingMemo"), true);
  assert.equal(questSource.includes("handleMemoPointerDown"), true);
  assert.equal(questSource.includes("handleMemoPointerMove"), true);
  assert.equal(questSource.includes("handleMemoPointerEnd"), true);
  assert.equal(questSource.includes("resetMemoViewport"), true);
  assert.equal(questSource.includes('touchAction: "none"'), true);
});

test("legacy handwriting route is preserved", () => {
  assert.match(legacySource, /const handleHandwritingJudge = async/);
  assert.match(legacySource, /runAutoDrawFractionBatchTest/);
  assert.match(legacySource, /data-testid="auto-draw-mixed-batch"/);
});
