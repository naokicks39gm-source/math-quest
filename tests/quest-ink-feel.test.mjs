import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/app/quest/page.tsx"), "utf8");

test("ink-first mode defaults and guide toggles exist", () => {
  assert.match(source, /const \[inkFirstMode, setInkFirstMode\] = useState\(true\)/);
  assert.match(source, /const \[showRecognitionGuides, setShowRecognitionGuides\] = useState\(false\)/);
  assert.match(source, /const \[autoJudgeEnabled, setAutoJudgeEnabled\] = useState\(false\)/);
  assert.match(source, /if \(inkFirstMode\) {\s*setAutoJudgeEnabled\(false\);/);
  assert.match(source, /if \(inkFirstMode\) return;/);
});

test("canvas draw is tuned for direct handwriting and guides are conditional", () => {
  assert.match(source, /const OUTER_MARGIN = 8;/);
  assert.match(source, /const \[visibleCanvasSize, setVisibleCanvasSize\] = useState\(DEFAULT_VISIBLE_CANVAS_SIZE\)/);
  assert.match(source, /const drawCanvasSize = visibleCanvasSize \+ OUTER_MARGIN \* 2;/);
  assert.match(source, /new ResizeObserver/);
  assert.match(source, /brushRadius=\{3\.2\}/);
  assert.match(source, /lazyRadius=\{0\}/);
  assert.match(source, /immediateLoading/);
  assert.match(source, /canvasWidth=\{drawCanvasSize\}/);
  assert.match(source, /canvasHeight=\{drawCanvasSize\}/);
  assert.match(source, /style=\{\{ left: -OUTER_MARGIN, top: -OUTER_MARGIN \}\}/);
  assert.match(source, /showRecognitionGuides && previewImages\.length > 0/);
});

test("batch controls are moved under settings and still available", () => {
  assert.match(source, /setSettingsOpen\(\(v\) => !v\)/);
  assert.match(source, /settingsOpen && \(/);
  assert.match(source, /data-testid="auto-draw-batch"/);
  assert.match(source, /data-testid="auto-draw-frac-batch"/);
  assert.match(source, /data-testid="auto-draw-mixed-batch"/);
});
