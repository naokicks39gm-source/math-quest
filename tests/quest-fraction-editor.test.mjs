import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { readQuestSource } from "./helpers/quest-source.mjs";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const source = readQuestSource();
const validationSource = read("src/utils/answerValidation.ts");
const learningSource = read("src/app/quest/hooks/useLearningOrchestrator.ts");

test("quest defines fraction editor state and auto move delay", () => {
  assert.match(validationSource, /export type FractionEditorState = \{/);
  assert.match(validationSource, /part: "num" \| "den";/);
  assert.match(source, /const FRACTION_AUTO_MOVE_DELAY_MS = 800;/);
  assert.match(source, /const \[fractionInput, setFractionInput\] = useState<FractionEditorState>/);
  assert.match(source, /const \[quadraticFractionInputs, setQuadraticFractionInputs\] = useState<\[FractionEditorState, FractionEditorState\]>/);
});

test("quest enters fraction edit mode from fraction key and uses numerator-first flow", () => {
  assert.match(learningSource, /if \(normalizedToken === "\/"\) \{/);
  assert.match(learningSource, /setFractionInput\(\(prev: FractionEditorState\) =>/);
  assert.match(learningSource, /setQuadraticFractionInputs\(\(prev: \[FractionEditorState, FractionEditorState\]\) => \{/);
  assert.match(source, /part: "num"/);
  assert.match(source, /FRACTION_AUTO_MOVE_DELAY_MS/);
  assert.match(source, /part: "den"/);
});

test("quest builds answer text from fraction editor before grading", () => {
  assert.match(validationSource, /export const fractionEditorToAnswerText = \(/);
  assert.equal(source.includes("fractionEditorToAnswerText(fractionInput)"), true);
  assert.equal(source.includes("fractionEditorToAnswerText(quadraticFractionInputs[0])"), true);
  assert.equal(source.includes("fractionEditorToAnswerText(quadraticFractionInputs[1])"), true);
});

test("fraction handwriting and rendering paths remain present", () => {
  assert.match(source, /renderMaybeMath/);
  assert.match(source, /const recognizeFractionFromCanvas/);
});
