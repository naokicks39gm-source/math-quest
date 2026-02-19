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
  assert.match(questSource, /計算メモ（2本指ピンチで拡大縮小）/);
  assert.match(questSource, /onClick=\{handleAttack\}/);
  assert.match(questSource, /onClick=\{clearMemo\}/);
  assert.match(questSource, /onClick=\{\(\) => setIsMemoOpen\(\(prev\) => !prev\)\}/);
});

test("calc memo supports pinch zoom state and reset", () => {
  assert.match(questSource, /const \[calcZoom, setCalcZoom\] = useState\(1\)/);
  assert.match(questSource, /const \[calcPan, setCalcPan\] = useState\(\{ x: 0, y: 0 \}\)/);
  assert.match(questSource, /const \[isPinchingMemo, setIsPinchingMemo\] = useState\(false\)/);
  assert.match(questSource, /handleMemoPointerDown/);
  assert.match(questSource, /handleMemoPointerMove/);
  assert.match(questSource, /handleMemoPointerEnd/);
  assert.match(questSource, /resetMemoViewport/);
  assert.match(questSource, /touchAction: "none"/);
});

test("legacy handwriting route is preserved", () => {
  assert.match(legacySource, /const handleHandwritingJudge = async/);
  assert.match(legacySource, /runAutoDrawFractionBatchTest/);
  assert.match(legacySource, /data-testid="auto-draw-mixed-batch"/);
});
