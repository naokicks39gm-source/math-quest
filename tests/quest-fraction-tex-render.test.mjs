import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("quest page exposes fraction TeX helpers for integer and exponent fractions", () => {
  const source = read("src/app/quest/page.tsx");
  assert.match(source, /const toFractionTexInText = \(text: string\) =>/);
  assert.match(source, /const renderMaybeMath = \(text: string\): ReactNode =>/);
  assert.match(source, /const INTEGER_FRACTION_PATTERN = \/[\s\S]*\\\/[\s\S]*\/g;/);
  assert.match(source, /const EXPONENT_FRACTION_PATTERN = \/[\s\S]*\\\/[\s\S]*\/g;/);
  assert.match(source, /if \(!raw\.includes\("\^"\)\) continue;/);
  assert.match(source, /isAsciiLetter\(prev\) \|\| isAsciiLetter\(next\)/);
});

test("quest prompt and clear list use shared math rendering path", () => {
  const source = read("src/app/quest/page.tsx");
  assert.match(source, /return renderMaybeMath\(formatPrompt\(item\.prompt\)\);/);
  assert.match(source, /renderMaybeMath\(formatPrompt\(r\.prompt\)\)/);
  assert.match(source, /renderMaybeMath\(r\.correctAnswer\)/);
  assert.match(source, /renderMaybeMath\(displayedUserAnswer\)/);
});

test("fraction handwriting path remains available", () => {
  const source = read("src/app/quest/page.tsx");
  assert.match(source, /const recognizeFractionFromCanvas/);
  assert.match(source, /forceFractionRecognitionRef/);
  assert.match(source, /runAutoDrawFractionBatchTest/);
});
