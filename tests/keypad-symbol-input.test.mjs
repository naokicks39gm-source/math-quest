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
const packageKeySource = read("packages/keypad/keys.ts");
const elementaryLayoutSource = read("packages/keypad/layouts/elementaryLayout.ts");
const juniorLayoutSource = read("packages/keypad/layouts/juniorLayout.ts");
const highLayoutSource = read("packages/keypad/layouts/highLayout.ts");
const packageIndexSource = read("packages/keypad/index.ts");

test("packages/keypad exposes shared keys and grade layouts", () => {
  assert.equal(packageKeySource.includes("export const KEYS = {"), true);
  assert.equal(packageKeySource.includes('MUL: "×"'), true);
  assert.equal(packageKeySource.includes('PLUS_MINUS: "+/-"'), true);
  assert.equal(packageKeySource.includes("var:"), false);

  assert.equal(elementaryLayoutSource.includes("export const ELEMENTARY_KEYPAD = ["), true);
  assert.equal(juniorLayoutSource.includes("export const JUNIOR_KEYPAD = ["), true);
  assert.equal(highLayoutSource.includes("export const HIGH_KEYPAD = ["), true);

  assert.equal(elementaryLayoutSource.includes("[KEYS.NUM_0, KEYS.FRACTION, KEYS.DECIMAL]"), true);
  assert.equal(juniorLayoutSource.includes("[KEYS.NUM_0, KEYS.FRACTION, KEYS.EXPONENT, KEYS.DECIMAL]"), true);
  assert.equal(highLayoutSource.includes("[KEYS.ABS, KEYS.SQRT, KEYS.LOG, KEYS.PI]"), true);

  assert.equal(packageIndexSource.includes('export * from "./keys"'), true);
  assert.equal(packageIndexSource.includes('export * from "./layouts/elementaryLayout"'), true);
  assert.equal(packageIndexSource.includes('export * from "./layouts/juniorLayout"'), true);
  assert.equal(packageIndexSource.includes('export * from "./layouts/highLayout"'), true);
});

test("component layer reads grade-specific layouts", () => {
  assert.equal(baseTsxSource.includes("export const keypadKeySizeClass"), true);
  assert.equal(layoutSource.includes('from "packages/keypad";'), true);
  assert.equal(layoutSource.includes("KEYPAD_LAYOUT_BY_MODE = {"), true);
  assert.equal(layoutSource.includes("elementary: ELEMENTARY_KEYPAD"), true);
  assert.equal(layoutSource.includes("junior: JUNIOR_KEYPAD"), true);
  assert.equal(layoutSource.includes("highschool: HIGH_KEYPAD"), true);

  assert.equal(baseSource.includes("KEYPAD_LAYOUT_BY_MODE.elementary.flat()"), true);
  assert.equal(baseSource.includes('if (token === KEYS.FRACTION) return "/";'), true);
  assert.equal(baseSource.includes('if (token === KEYS.EXPONENT) return "^";'), true);
  assert.equal(baseSource.includes('if (token === KEYS.DECIMAL) return ".";'), true);
  assert.equal(baseSource.includes('if (token === KEYS.SQRT) return "sqrt(";'), true);

  assert.equal(elemSource.includes("KEYPAD_LAYOUT_BY_MODE.elementary.map("), true);
  assert.equal(hsSource.includes('mode === "junior" ? JUNIOR_KEYPAD : HIGH_KEYPAD'), true);
  assert.equal(juniorSource.includes('SecondaryMathKeypad mode="junior"'), true);
});

test("highschool keypad keeps plus-minus gesture and judge action", () => {
  assert.equal(hsSource.includes("const PLUS_MINUS_SWITCH_PX = 0;"), true);
  assert.equal(hsSource.includes("onPointerDown={isPlus ? handlePlusDown : undefined}"), true);
  assert.equal(hsSource.includes("onTouchStart={isPlus ? handlePlusTouchStart : undefined}"), true);
  assert.equal(hsSource.includes("createPortal("), true);
  assert.equal(hsSource.includes("onClick={onJudge}"), true);
  assert.equal(hsSource.includes("disabled={baseDisabled || !canSubmit}"), true);
});

test("quest page switches keypad by grade", () => {
  assert.equal(pageSource.includes('const isJuniorQuest = /^(J1|J2|J3)$/.test(currentGradeId);'), true);
  assert.equal(pageSource.includes("<HighSchoolKeypad"), true);
  assert.equal(pageSource.includes("<JuniorKeypad"), true);
  assert.equal(pageSource.includes("<ElementaryKeypad"), true);
});
