import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/lib/secondaryExplanations.ts"), "utf8");
const pageSource = fs.readFileSync(path.join(process.cwd(), "src/app/quest/page.tsx"), "utf8");

test("secondary derivation builder covers major pattern families", () => {
  assert.match(source, /patternId\.startsWith\("INT_"\)/);
  assert.match(source, /patternId === "LIN_EQ" \|\| patternId === "LIN_INEQ"/);
  assert.match(source, /patternId === "SYS_EQ"/);
  assert.match(source, /patternId === "QUAD_ROOTS"/);
  assert.match(source, /patternId\.startsWith\("FACTOR_"\) \|\| patternId === "EXPAND" \|\| patternId === "EXP_RULES"/);
  assert.match(source, /patternId === "POW_INT" \|\| patternId === "SQRT_VAL" \|\| patternId === "LOG_VAL"/);
  assert.match(source, /patternId\.startsWith\("TRIG_"\) \|\| patternId\.startsWith\("DIFF_"\) \|\| patternId === "DEF_INT"/);
});

test("secondary derivation builder guarantees at least two lines", () => {
  assert.match(source, /if \(normalized\.length >= 2\) return addHighlightsToLines\(normalized\);/);
  assert.match(source, /\{ kind: "tex", value: base \}/);
  assert.match(source, /String\.raw`=\$\{answerText\}`/);
});

test("secondary derivation builder highlights changed parts and does not inject sign-rule arrows into INT derivation", () => {
  assert.match(source, /const parseSignedBinaryExpression = \(value: string\)/);
  assert.match(source, /const buildIntDerivationLines = \(baseExpression: string, answerText: string\)/);
  assert.match(source, /const tokenizeForHighlight = \(tex: string\)/);
  assert.match(source, /const diffTokens = \(prev: string, next: string\)/);
  assert.match(source, /const applyHighlight = \(tex: string, tokens: string\[\]\)/);
  assert.match(source, /String\.raw`\\color\{#2563eb\}\{\$\{token\}\}`/);
  assert.equal(source.includes("...intAddRules"), false);
});

test("quest passes prompt and promptTex into secondary aid builder", () => {
  assert.match(pageSource, /prompt: currentItem\?\.prompt/);
  assert.match(pageSource, /promptTex: currentItem\?\.prompt_tex/);
});
