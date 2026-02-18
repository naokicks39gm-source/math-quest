import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("grader supports frac parsing and simplification rule by typeId", () => {
  const source = read("src/lib/grader.ts");
  assert.match(source, /const parseImproperFraction/);
  assert.match(source, /const parseMixedFraction/);
  assert.match(source, /const reduceFraction/);
  assert.match(source, /const isReduced/);
  assert.match(source, /const mixedToImproper/);
  assert.match(source, /const improperToMixed/);
  assert.match(source, /const isSimplificationRequired/);
  assert.match(source, /opts\?: GradeOptions/);
  assert.match(source, /expectedForm\?: "mixed" \| "improper" \| "auto"/);
  assert.match(source, /format\.kind === "frac"/);
  assert.match(source, /gcd\(fraction\.num, fraction\.den\) === 1/);
  assert.match(source, /E\[5-9\]/);
});

test("quest page has slash detection and passes typeId to grader", () => {
  const source = read("src/app/quest/page.tsx");
  assert.match(source, /const isSlashComponent/);
  assert.match(source, /const recognizeFractionFromCanvas/);
  assert.match(source, /const recognizeMixedFractionFromCanvas/);
  assert.match(source, /const isMixedFractionQuestion/);
  assert.match(source, /const resolveExpectedFormFromPrompt/);
  assert.match(source, /currentType\?\.answer_format\.kind === "frac"/);
  assert.match(source, /forceFractionRecognitionRef/);
  assert.match(source, /forceMixedRecognitionRef/);
  assert.match(source, /forcedFractionAnswerRef/);
  assert.match(source, /forcedExpectedFormRef/);
  assert.match(source, /const fallback = preprocessDigits/);
  assert.match(source, /normalizeFractionFromDigitString/);
  assert.match(source, /normalizeMixedFractionFromDigitString/);
  assert.match(source, /typeId: currentType\.type_id/);
  assert.match(source, /expectedForm/);
  assert.match(source, /data-testid=\"auto-draw-frac-batch\"/);
  assert.match(source, /data-testid=\"auto-draw-mixed-batch\"/);
  assert.match(source, /runAutoDrawFractionBatchTest/);
  assert.match(source, /runAutoDrawMixedBatchTest/);
});
