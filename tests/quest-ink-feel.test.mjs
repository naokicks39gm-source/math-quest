import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const questSource = fs.readFileSync(path.join(process.cwd(), "src/app/quest/page.tsx"), "utf8");
const hsKeypadSource = fs.readFileSync(path.join(process.cwd(), "src/components/keypad/HighSchoolKeypad.tsx"), "utf8");
const legacySource = fs.readFileSync(path.join(process.cwd(), "src/app/quest-handwrite-legacy/page.tsx"), "utf8");

test("quest uses keypad answer flow and calc memo canvas", () => {
  assert.equal(questSource.includes("numpad"), true);
  assert.match(questSource, /data-testid="calc-memo-area"/);
  assert.match(questSource, /計算メモ（2本指ピンチで縮小）/);
  assert.match(questSource, /onJudge=\{handleAttack\}/);
  assert.match(hsKeypadSource, /onClick=\{onJudge\}/);
  assert.match(questSource, /onClick=\{undoMemo\}/);
  assert.match(questSource, /onClick=\{clearMemo\}/);
});

test("calc memo keeps pinch handlers for zoom interactions", () => {
  assert.equal(questSource.includes("calcZoom"), true);
  assert.equal(questSource.includes("calcPan"), true);
  assert.equal(questSource.includes("isPinchingMemo"), true);
  assert.equal(questSource.includes("MIN_MEMO_ZOOM"), true);
  assert.equal(questSource.includes("MAX_MEMO_ZOOM"), true);
  assert.equal(questSource.includes("ctx.lineWidth = MEMO_BRUSH_WIDTH"), true);
  assert.equal(questSource.includes("touchAction: \"none\""), true);
  assert.equal(questSource.includes("onDragStart={(e) => e.preventDefault()}"), true);
});

test("legacy handwriting route is preserved", () => {
  assert.match(legacySource, /const handleHandwritingJudge = async/);
  assert.match(legacySource, /runAutoDrawFractionBatchTest/);
});
