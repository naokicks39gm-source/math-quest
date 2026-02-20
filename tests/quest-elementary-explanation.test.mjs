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

test("elementary explanation resolver has abacus/column_story/simple branches", () => {
  assert.match(libSource, /ElementaryAidKind = "abacus" \| "column" \| "column_story" \| "simple"/);
  assert.match(libSource, /mode: "abacus" \| "column" \| "column_story" \| "simple"/);
  assert.match(libSource, /kind: ElementaryAidKind;/);
  assert.match(libSource, /conclusion: string;/);
  assert.match(libSource, /const isColumnPattern =/);
  assert.match(libSource, /if \(!isColumnPattern\(typeId, patternId\)\)/);
  assert.match(libSource, /return buildSimpleAid\(\);/);
  assert.match(libSource, /const buildColumnStoryFrames =/);
  assert.match(libSource, /kind: "column_story"/);
  assert.match(libSource, /mode: "column_story"/);
  assert.match(libSource, /frames: frames\.slice\(0, 5\)/);
  assert.match(libSource, /const collectDigitAdjustments =/);
  assert.match(libSource, /digitAdjustments/);
  assert.match(libSource, /marks\.set\(place \+ 1, "\+1"\);/);
  assert.match(libSource, /marks\.set\(place \+ 1, "-1"\);/);
  assert.match(libSource, /focusPlace: "ones"/);
  assert.match(libSource, /focusPlace: "next"/);
  assert.match(libSource, /title: "答え"/);
  assert.match(libSource, /partial: `答え: \$\{formatNumber\(result\)\}`/);
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
  assert.match(panelSource, /aid\.visual\?\.mode === "column_story"/);
  assert.match(panelSource, /renderColumnFrame/);
  assert.match(panelSource, /renderAlignedValue/);
  assert.match(panelSource, /text-rose-600/);
  assert.match(panelSource, /text-indigo-600/);
  assert.match(panelSource, /digitAdjustments/);
  assert.match(panelSource, /adj\.offsetFromRight/);
  assert.match(panelSource, /adj\.label/);
  assert.match(panelSource, /rounded-full border border-rose-300 bg-rose-500/);
  assert.match(panelSource, /max-w-\[19rem\]/);
  assert.match(panelSource, /こたえ \{aid\.visual\.result\} こ/);
  assert.match(panelSource, /onClick=\{onNext\}/);
  assert.match(panelSource, /\{nextLabel\}/);
});

test("secondary explanation path remains in quest page", () => {
  assert.match(pageSource, /SecondaryExplanationPanel/);
  assert.match(pageSource, /getSecondaryLearningAid/);
  assert.match(pageSource, /\{currentAid && <SecondaryExplanationPanel aid=\{currentAid\} \/>\}/);
});
