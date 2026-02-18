import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("grader supports frac parsing and simplification rule by typeId", () => {
  const source = read("src/lib/grader.ts");
  assert.match(source, /const parseFraction/);
  assert.match(source, /const reduceFraction/);
  assert.match(source, /const isReduced/);
  assert.match(source, /const isSimplificationRequired/);
  assert.match(source, /opts\?: GradeOptions/);
  assert.match(source, /format\.kind === "frac"/);
  assert.match(source, /gcd\(fraction\.num, fraction\.den\) === 1/);
  assert.match(source, /E\[5-9\]/);
});

test("quest page has slash detection and passes typeId to grader", () => {
  const source = read("src/app/quest/page.tsx");
  assert.match(source, /const isSlashComponent/);
  assert.match(source, /const recognizeFractionFromCanvas/);
  assert.match(source, /currentType\?\.answer_format\.kind === "frac"/);
  assert.match(source, /forceFractionRecognitionRef/);
  assert.match(source, /forcedFractionAnswerRef/);
  assert.match(source, /const fallback = preprocessDigits/);
  assert.match(source, /normalizeFractionFromDigitString/);
  assert.match(source, /typeId: currentType\.type_id/);
  assert.match(source, /data-testid=\"auto-draw-frac-batch\"/);
  assert.match(source, /runAutoDrawFractionBatchTest/);
});
