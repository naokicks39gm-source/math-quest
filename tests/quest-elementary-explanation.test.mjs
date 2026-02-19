import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const pageSource = fs.readFileSync(path.join(process.cwd(), "src/app/quest/page.tsx"), "utf8");
const libSource = fs.readFileSync(path.join(process.cwd(), "src/lib/elementaryExplanations.ts"), "utf8");
const panelSource = fs.readFileSync(path.join(process.cwd(), "src/components/ElementaryExplanationPanel.tsx"), "utf8");

test("quest shows elementary explanation in memo area when elementary answer is wrong", () => {
  assert.match(pageSource, /import ElementaryExplanationPanel from "@\/components\/ElementaryExplanationPanel"/);
  assert.match(pageSource, /getElementaryLearningAid/);
  assert.match(pageSource, /isElementaryGrade\(currentGradeId\)/);
  assert.match(pageSource, /practiceResult\?\.ok === false/);
  assert.match(pageSource, /<ElementaryExplanationPanel/);
  assert.match(pageSource, /onNext=\{nextQuestion\}/);
  assert.match(pageSource, /nextLabel=\{uiText\.nextQuestion\}/);
});

test("elementary explanation resolver has abacus/column/simple branches", () => {
  assert.match(libSource, /ElementaryAidKind = "abacus" \| "column" \| "simple"/);
  assert.match(libSource, /kind: ElementaryAidKind;/);
  assert.match(libSource, /conclusion: string;/);
  assert.match(libSource, /if \(!isAddSub\(typeId, patternId, prompt\)\)/);
  assert.match(libSource, /return buildSimpleAid\(\);/);
  assert.match(libSource, /if \(isSingleDigitPair\)/);
  assert.match(libSource, /return buildAbacusAid/);
  assert.match(libSource, /return buildColumnAid/);
  assert.match(libSource, /aDigits \?\? fallbackDigitCount\(left\)/);
  assert.match(libSource, /bDigits \?\? fallbackDigitCount\(right\)/);
});

test("elementary panel has next button and visual rendering", () => {
  assert.match(panelSource, /type Props = \{/);
  assert.match(panelSource, /onNext: \(\) => void;/);
  assert.match(panelSource, /nextLabel: string;/);
  assert.match(panelSource, /aid\.visual\?\.mode === "abacus"/);
  assert.match(panelSource, /aid\.visual\?\.mode === "column"/);
  assert.match(panelSource, /こたえ \{aid\.visual\.result\} こ/);
  assert.match(panelSource, /こたえ: \{aid\.conclusion\}/);
  assert.match(panelSource, /onClick=\{onNext\}/);
  assert.match(panelSource, /\{nextLabel\}/);
});

test("secondary explanation path remains in quest page", () => {
  assert.match(pageSource, /SecondaryExplanationPanel/);
  assert.match(pageSource, /getSecondaryLearningAid/);
  assert.match(pageSource, /\{currentAid && <SecondaryExplanationPanel aid=\{currentAid\} \/>\}/);
});
