import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("quest page exposes fraction TeX helpers for integer and exponent fractions", () => {
  const source = read("src/app/quest/page.tsx");
  assert.match(source, /const trimTrailingEquationEquals = \(text: string\) =>/);
  assert.match(source, /const ensureTrailingEquationEquals = \(text: string\) =>/);
  assert.match(source, /const shouldForceEqualsForElementaryE2Plus = \(typeId\?: string\) =>/);
  assert.match(source, /const formatPrompt = \(prompt: string, keepEquals = false, forceEquals = false\) =>/);
  assert.match(source, /const base = keepEquals \? cleaned\.trim\(\) : trimTrailingEquationEquals\(cleaned\);/);
  assert.match(source, /return forceEquals \? ensureTrailingEquationEquals\(base\) : base;/);
  assert.match(source, /const toFractionTexInText = \(text: string\) =>/);
  assert.match(source, /const renderMaybeMath = \(text: string\): ReactNode =>/);
  assert.match(source, /const INTEGER_FRACTION_PATTERN = \/[\s\S]*\\\/[\s\S]*\/g;/);
  assert.match(source, /const EXPONENT_FRACTION_PATTERN = \/[\s\S]*\\\/[\s\S]*\/g;/);
  assert.match(source, /if \(!raw\.includes\("\^"\)\) continue;/);
  assert.match(source, /isAsciiLetter\(prev\) \|\| isAsciiLetter\(next\)/);
});

test("quest prompt and clear list use shared math rendering path", () => {
  const source = read("src/app/quest/page.tsx");
  assert.match(source, /const keepEquals = shouldKeepEqualsForE13Plus\(typeId, typeLabel\);/);
  assert.match(source, /const forceEquals = shouldForceEqualsForElementaryE2Plus\(typeId\);/);
  assert.match(source, /const displayTexRaw = keepEquals \? tex : trimTrailingEquationEquals\(tex\);/);
  assert.match(source, /const displayTex = forceEquals \? ensureTrailingEquationEquals\(displayTexRaw\) : displayTexRaw;/);
  assert.match(source, /toEquationTex\(trimTrailingEquationEquals\(r\.promptTex\.trim\(\)\)\)/);
  assert.match(source, /return renderMaybeMath\(formattedPrompt\);/);
  assert.match(source, /renderMaybeMath\(formatPrompt\(r\.prompt\)\)/);
  assert.match(source, /renderMaybeMath\(r\.correctAnswer\)/);
  assert.match(source, /renderMaybeMath\(displayedUserAnswer\)/);
});

test("quest card uses responsive layout to avoid answer overflow", () => {
  const source = read("src/app/quest/page.tsx");
  assert.match(source, /const \[useSingleLineQa, setUseSingleLineQa\] = useState\(false\)/);
  assert.match(source, /const \[qaAnswerOffsetPx, setQaAnswerOffsetPx\] = useState\(0\)/);
  assert.match(source, /const \[qaPromptFontPx, setQaPromptFontPx\] = useState<number>\(QA_PROMPT_FONT_STEPS\[0\]\)/);
  assert.match(source, /const \[qaAnswerFontPx, setQaAnswerFontPx\] = useState<number>\(QA_ANSWER_FONT_STEPS\[0\]\)/);
  assert.match(source, /const QA_PROMPT_FONT_STEPS = \[32, 30, 28, 26, 24\] as const;/);
  assert.match(source, /const QA_ANSWER_FONT_STEPS = \[30, 28, 26, 24\] as const;/);
  assert.match(source, /if \(!isSecondaryQuest\) \{/);
  assert.match(source, /for \(let i = 0; i < QA_PROMPT_FONT_STEPS\.length; i \+= 1\) \{/);
  assert.match(source, /setUseSingleLineQa\(true\)/);
  assert.match(source, /setUseSingleLineQa\(false\)/);
  assert.match(source, /setQaAnswerOffsetPx\(0\)/);
  assert.match(source, /useSingleLineQa[\s\S]*\? "relative z-10 w-full flex items-center justify-start gap-2 sm:gap-3"/);
  assert.match(source, /useSingleLineQa[\s\S]*: "relative z-10 w-full flex flex-col justify-center gap-1 sm:gap-2"/);
  assert.match(source, /style=\{\(isSecondaryQuest \|\| isE2EqualShareType\) \? \{ fontSize: `\$\{qaPromptFontPx\}px` \} : undefined\}/);
  assert.match(source, /aria-label=\"recognized-answer\"/);
  assert.match(source, /fractionInput\.enabled \? "w-\[190px\] sm:w-\[220px\] h-\[74px\] sm:h-\[84px\]/);
  assert.match(source, /: "w-\[150px\] sm:w-\[180px\] h-\[56px\] sm:h-\[64px\]/);
});

test("fraction handwriting path remains available", () => {
  const source = read("src/app/quest-handwrite-legacy/page.tsx");
  assert.match(source, /const recognizeFractionFromCanvas/);
  assert.match(source, /forceFractionRecognitionRef/);
  assert.match(source, /runAutoDrawFractionBatchTest/);
});
