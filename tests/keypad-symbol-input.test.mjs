import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

const pageSource = read("src/app/quest/page.tsx");
const baseSource = read("src/components/keypad/BaseMathKeypad.ts");
const layoutSource = read("src/components/keypad/KeypadLayout.ts");
const baseTsxSource = read("src/components/keypad/BaseMathKeypad.tsx");
const elemSource = read("src/components/keypad/ElementaryKeypad.tsx");
const juniorSource = read("src/components/keypad/JuniorKeypad.tsx");
const hsSource = read("src/components/keypad/HighSchoolKeypad.tsx");

test("math keypad layout is 4x5 with right-side action column", () => {
  assert.match(layoutSource, /export const KEYPAD_LAYOUT = \[/);
  assert.match(layoutSource, /"1", "2", "3", "\(\)",/);
  assert.match(layoutSource, /"4", "5", "6", "var",/);
  assert.match(layoutSource, /"7", "8", "9", "\+\/-",/);
  assert.match(layoutSource, /"0", "frac", "pow", "\.",/);
  assert.match(layoutSource, /"abs", "sqrt", "log", "pi"/);
  assert.match(elemSource, /grid-cols-4 grid-rows-5/);
  assert.match(hsSource, /grid-cols-4 grid-rows-5/);
  assert.match(elemSource, /onClick=\{onDelete\}/);
  assert.match(elemSource, /onClick=\{onJudge\}/);
  assert.match(elemSource, /onClick=\{onEnd\}/);
});

test("grade-specific enabled tokens are defined", () => {
  assert.match(baseTsxSource, /export \* from "\.\/BaseMathKeypad";/);
  assert.match(baseSource, /elementary: new Set<MathKeypadToken>\(\["var", "\+\/-", "frac", "pow", "abs", "sqrt", "log", "pi"\]\)/);
  assert.match(baseSource, /junior: new Set<MathKeypadToken>\(\["abs", "sqrt", "log", "pi"\]\)/);
  assert.match(baseSource, /highschool: new Set<MathKeypadToken>\(\[\]\)/);
  assert.match(baseSource, /elementary: "h-14 text-lg rounded-lg"/);
  assert.match(baseSource, /junior: "h-10 text-sm rounded-md"/);
  assert.match(baseSource, /highschool: "h-9 text-xs rounded-md"/);
});

test("junior and highschool use gesture handlers for +/- and variable popup", () => {
  assert.match(hsSource, /const VARIABLE_CHOICES = \["x", "y", "a"\] as const;/);
  assert.match(hsSource, /const resolveVariableCandidate = \(deltaY: number\)/);
  assert.match(hsSource, /onPointerDown=\{isPlus \? handlePlusDown : isVar \? handleVarDown : undefined\}/);
  assert.match(hsSource, /onTouchStart=\{isPlus \? handlePlusTouchStart : isVar \? handleVarTouchStart : undefined\}/);
  assert.match(hsSource, /createPortal\(/);
  assert.match(juniorSource, /SecondaryMathKeypad mode="junior"/);
});

test("quest page switches keypad by grade", () => {
  assert.match(pageSource, /const isJuniorQuest = \/\^\(J1\|J2\|J3\)\$\/\.test\(currentGradeId\);/);
  assert.match(pageSource, /<HighSchoolKeypad/);
  assert.match(pageSource, /<JuniorKeypad/);
  assert.match(pageSource, /<ElementaryKeypad/);
});
