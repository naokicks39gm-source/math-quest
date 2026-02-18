import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/app/quest/page.tsx"), "utf8");

test("recognition uses ROI-based binarization and size-aware tuning", () => {
  assert.match(source, /const getRecognitionRoi =/);
  assert.match(source, /const binarizeCanvasInRoi =/);
  assert.match(source, /const getBinarizeTuning =/);
  assert.match(source, /dotThresholdRatio: 0\.35/);
  assert.match(source, /fractionMinKeepRatio: 0\.00025/);
  assert.match(source, /integerMinKeepRatio: 0\.00055/);
  assert.match(source, /splitThreshold: Math\.max\(1, Math\.floor\(roiScale \* 0\.035\)\)/);
  assert.match(source, /const recognitionRoi = getRecognitionRoi\(drawingCanvas, visibleCanvasSize\)/);
  assert.match(source, /recognizeFractionFromCanvas\(drawingCanvas, recognitionRoi\)/);
  assert.match(source, /recognizeMixedFractionFromCanvas\(drawingCanvas, expectedForm, recognitionRoi\)/);
  assert.match(source, /preprocessDigits\(drawingCanvas, digits, recognitionRoi\)/);
});

test("integer path avoids fraction fallback and batch exposes failure metrics", () => {
  assert.match(source, /\(plainFractionQuestion \|\| mixedQuestion\) && perDigitString && expectedFractionAnswer/);
  assert.match(source, /空判定/);
  assert.match(source, /過分割/);
  assert.match(source, /構造失敗/);
  assert.match(source, /整数部構造失敗/);
});
