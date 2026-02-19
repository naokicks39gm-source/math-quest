import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const questSource = fs.readFileSync(path.join(process.cwd(), "src/app/quest/page.tsx"), "utf8");
const legacySource = fs.readFileSync(path.join(process.cwd(), "src/app/quest-handwrite-legacy/page.tsx"), "utf8");

test("quest uses keypad answer flow and calc memo canvas", () => {
  assert.match(questSource, /const \[inputMode\] = useState<'numpad' \| 'handwriting'>\('numpad'\)/);
  assert.match(questSource, /data-testid="calc-memo-area"/);
  assert.match(questSource, /計算メモ/);
  assert.match(questSource, /onClick=\{handleAttack\}/);
  assert.match(questSource, /onClick=\{clearMemo\}/);
});

test("calc memo is stabilized without pinch handlers", () => {
  assert.equal(questSource.includes("calcZoom"), false);
  assert.equal(questSource.includes("calcPan"), false);
  assert.equal(questSource.includes("isPinchingMemo"), false);
  assert.equal(questSource.includes("handleMemoPointerDown"), false);
  assert.equal(questSource.includes("handleMemoPointerMove"), false);
  assert.equal(questSource.includes("handleMemoPointerEnd"), false);
  assert.equal(questSource.includes("resetMemoViewport"), false);
  assert.equal(questSource.includes('touchAction: "none"'), false);
});

test("legacy handwriting route is preserved", () => {
  assert.match(legacySource, /const handleHandwritingJudge = async/);
  assert.match(legacySource, /runAutoDrawFractionBatchTest/);
  assert.match(legacySource, /data-testid="auto-draw-mixed-batch"/);
});
