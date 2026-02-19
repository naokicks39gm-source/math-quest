import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/app/quest/page.tsx"), "utf8");

test("quest defines fraction editor state and auto move delay", () => {
  assert.match(source, /type FractionEditorState = \{/);
  assert.match(source, /part: FractionEditorPart;/);
  assert.match(source, /const FRACTION_AUTO_MOVE_DELAY_MS = 800;/);
  assert.match(source, /const \[fractionInput, setFractionInput\] = useState<FractionEditorState>/);
  assert.match(source, /const \[quadraticFractionInputs, setQuadraticFractionInputs\] = useState<\[FractionEditorState, FractionEditorState\]>/);
});

test("quest enters fraction edit mode from fraction key and uses numerator-first flow", () => {
  assert.match(source, /if \(num === "\/"\)/);
  assert.match(source, /setFractionInput\(\(prev\) => \(prev\.enabled \? prev : \{ enabled: true, num: "", den: "", part: "num" \}\)\);/);
  assert.match(source, /setQuadraticFractionInputs\(\(prev\) => \{/);
  assert.match(source, /part: "num"/);
  assert.match(source, /FRACTION_AUTO_MOVE_DELAY_MS/);
  assert.match(source, /part: "den"/);
});

test("quest builds answer text from fraction editor before grading", () => {
  assert.match(source, /const fractionEditorToAnswerText = \(editor: FractionEditorState\) => `\$\{editor\.num\}\/\$\{editor\.den\}`;/);
  assert.match(source, /fractionInput\.enabled \? fractionEditorToAnswerText\(fractionInput\) : input/);
  assert.match(source, /quadraticFractionInputs\[0\]\.enabled \? fractionEditorToAnswerText\(quadraticFractionInputs\[0\]\) : quadraticAnswers\[0\]/);
  assert.match(source, /quadraticFractionInputs\[1\]\.enabled \? fractionEditorToAnswerText\(quadraticFractionInputs\[1\]\) : quadraticAnswers\[1\]/);
});

test("fraction handwriting and rendering paths remain present", () => {
  assert.match(source, /const renderMaybeMath = \(text: string\): ReactNode =>/);
  assert.match(source, /const recognizeFractionFromCanvas/);
});

