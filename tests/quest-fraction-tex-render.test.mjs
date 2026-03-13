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

test("quest prompt keeps shared math rendering path and clear view uses SkillClearView", () => {
  const source = read("src/app/quest/page.tsx");
  assert.match(source, /const keepEquals = shouldKeepEqualsForE13Plus\(typeId, typeLabel\);/);
  assert.match(source, /const forceEquals = shouldForceEqualsForElementaryE2Plus\(typeId\);/);
  assert.match(source, /className="mx-\[0\.08em\] inline-flex h-\[0\.98em\] w-\[0\.98em\] items-center justify-center rounded-\[0\.16em\] border-2 border-emerald-100 align-\[-0\.04em\]"/);
  assert.match(source, /const displayTexRaw = shouldKeepPromptEquals \? tex : trimTrailingEquationEquals\(tex\);/);
  assert.match(source, /const displayTex = shouldForcePromptEquals \? ensureTrailingEquationEquals\(displayTexRaw\) : displayTexRaw;/);
  assert.match(source, /return renderMaybeMath\(formattedPrompt\);/);
  assert.match(source, /<SkillClearView/);
  assert.match(source, /history=\{learningResult\.history\}/);
});

test("quest card uses responsive layout to avoid answer overflow", () => {
  const source = read("src/app/quest/page.tsx");
  assert.match(source, /const QA_PROMPT_FONT_STEPS = \[32, 30, 28, 26, 24\] as const;/);
  assert.match(source, /const QA_ANSWER_FONT_STEPS = \[30, 28, 26, 24\] as const;/);
  assert.match(source, /const useSingleLineQa = !isSecondaryQuest && !isE2EqualShareType && !isE1TwoLineQuestionLevel;/);
  assert.match(source, /const qaAnswerOffsetPx = 0;/);
  assert.match(source, /const qaPromptFontPx = isE2EqualShareType \? 20 : isSecondaryQuest \? QA_PROMPT_FONT_STEPS\[0\] : QA_PROMPT_FONT_STEPS\[2\];/);
  assert.match(source, /const qaAnswerFontPx = isSecondaryQuest \? QA_ANSWER_FONT_STEPS\[0\] : QA_ANSWER_FONT_STEPS\[2\];/);
  assert.match(source, /useSingleLineQa[\s\S]*\? "relative z-10 w-full flex flex-wrap items-center justify-start gap-2 sm:gap-3"/);
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
