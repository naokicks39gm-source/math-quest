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
  assert.equal(questSource.includes("ExplanationModal"), false);
});

test("calc memo keeps pinch handlers for zoom interactions", () => {
  assert.equal(questSource.includes("CanvasDraw"), false);
  assert.equal(questSource.includes("calcZoom"), true);
  assert.equal(questSource.includes("calcPan"), true);
  assert.equal(questSource.includes("isPinchingMemo"), true);
  assert.equal(questSource.includes("MIN_MEMO_ZOOM"), true);
  assert.equal(questSource.includes("MAX_MEMO_ZOOM"), true);
  assert.equal(questSource.includes("const MEMO_BRUSH_WIDTH = 2.0"), true);
  assert.equal(questSource.includes("ctx.lineWidth = MEMO_BRUSH_WIDTH"), true);
  assert.equal(questSource.includes("MEMO_WORKSPACE_SCALE"), true);
  assert.equal(questSource.includes("Math.ceil((memoCanvasSize.width / MIN_MEMO_ZOOM) * MEMO_WORKSPACE_SCALE)"), true);
  assert.equal(questSource.includes("Math.ceil((memoCanvasSize.height / MIN_MEMO_ZOOM) * MEMO_WORKSPACE_SCALE)"), true);
  assert.equal(questSource.includes("memoOffsetX"), true);
  assert.equal(questSource.includes("memoOffsetY"), true);
  assert.equal(questSource.includes("memoStrokesRef"), true);
  assert.equal(questSource.includes("handleMemoPointerDown"), true);
  assert.equal(questSource.includes("handleMemoPointerMove"), true);
  assert.equal(questSource.includes("handleMemoPointerEnd"), true);
  assert.equal(questSource.includes('touchAction: "none"'), true);
  assert.equal(questSource.includes('userSelect: "none"'), true);
  assert.equal(questSource.includes('WebkitUserSelect: "none"'), true);
  assert.equal(questSource.includes('WebkitTouchCallout: "none"'), true);
  assert.equal(questSource.includes('WebkitTapHighlightColor: "transparent"'), true);
  assert.equal(questSource.includes("onContextMenu={(e) => e.preventDefault()}"), true);
  assert.equal(questSource.includes("onSelectStart={(e) => e.preventDefault()}"), false);
  assert.equal(questSource.includes("onDragStart={(e) => e.preventDefault()}"), true);
  assert.equal(questSource.includes("draggable={false}"), true);
  assert.equal(questSource.includes("zoomRatio >= 1"), false);
  assert.equal(questSource.includes("clamp(start.zoom * zoomRatio, MIN_MEMO_ZOOM, MAX_MEMO_ZOOM)"), true);
  assert.equal(questSource.includes("mid: memoMidpoint(p1, p2)"), true);
  assert.equal(questSource.includes("pan: calcPan"), true);
  assert.equal(questSource.includes("setCalcPan(nextPan)"), true);
  assert.equal(questSource.includes("setCalcPan({"), true);
});

test("legacy handwriting route is preserved", () => {
  assert.match(legacySource, /const handleHandwritingJudge = async/);
  assert.match(legacySource, /runAutoDrawFractionBatchTest/);
  assert.match(legacySource, /data-testid="auto-draw-mixed-batch"/);
});
