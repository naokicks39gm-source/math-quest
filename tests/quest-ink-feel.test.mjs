import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const questSource = fs.readFileSync(path.join(process.cwd(), "src/app/quest/page.tsx"), "utf8");
const legacySource = fs.readFileSync(path.join(process.cwd(), "src/app/quest-handwrite-legacy/page.tsx"), "utf8");

test("quest uses keypad answer flow and calc memo canvas", () => {
  assert.match(questSource, /const \[inputMode\] = useState<'numpad' \| 'handwriting'>\('numpad'\)/);
  assert.match(questSource, /data-testid="calc-memo-area"/);
  assert.match(questSource, /計算メモ（2本指ピンチで縮小）/);
  assert.match(questSource, /onClick=\{handleAttack\}/);
  assert.match(questSource, /onClick=\{undoMemo\}/);
  assert.match(questSource, /onClick=\{clearMemo\}/);
  assert.equal(questSource.includes("100%"), false);
  assert.equal(questSource.includes("閉じる"), false);
});

test("calc memo keeps pinch handlers for zoom interactions", () => {
  assert.equal(questSource.includes("calcZoom"), true);
  assert.equal(questSource.includes("calcPan"), true);
  assert.equal(questSource.includes("isPinchingMemo"), true);
  assert.equal(questSource.includes("MIN_MEMO_ZOOM"), true);
  assert.equal(questSource.includes("Math.ceil(memoCanvasSize.width / MIN_MEMO_ZOOM)"), true);
  assert.equal(questSource.includes("Math.ceil(memoCanvasSize.height / MIN_MEMO_ZOOM)"), true);
  assert.equal(questSource.includes("drawOffsetX"), true);
  assert.equal(questSource.includes("drawOffsetY"), true);
  assert.equal(questSource.includes("handleMemoPointerDown"), true);
  assert.equal(questSource.includes("handleMemoPointerMove"), true);
  assert.equal(questSource.includes("handleMemoPointerEnd"), true);
  assert.equal(questSource.includes('touchAction: "none"'), true);
  assert.equal(questSource.includes("if (zoomRatio >= 1) return;"), true);
  assert.equal(questSource.includes("clamp(start.zoom * zoomRatio, MIN_MEMO_ZOOM, start.zoom)"), true);
});

test("legacy handwriting route is preserved", () => {
  assert.match(legacySource, /const handleHandwritingJudge = async/);
  assert.match(legacySource, /runAutoDrawFractionBatchTest/);
  assert.match(legacySource, /data-testid="auto-draw-mixed-batch"/);
});
