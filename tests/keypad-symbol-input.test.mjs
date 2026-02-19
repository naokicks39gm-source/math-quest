import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/app/quest/page.tsx"), "utf8");

test("quest keypad includes symbol keys and compact sizing", () => {
  assert.match(source, /const DIGIT_KEYPAD_TOKENS = \["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"\] as const;/);
  assert.match(source, /const SYMBOL_KEYPAD_TOKENS = \["\/", "\.", "-"\] as const;/);
  assert.match(source, /const keypadDigitTopTokens = DIGIT_KEYPAD_TOKENS\.filter\(\(token\) => token !== "0"\);/);
  assert.match(source, /const smallSymbolTokens: Array<\(typeof SYMBOL_KEYPAD_TOKENS\)\[number\]> = \["\.", "-", "\/"\];/);
  assert.match(source, /w-full flex items-stretch gap-2/);
  assert.match(source, /flex-1 grid grid-cols-3 grid-rows-4 gap-1\.5/);
  assert.match(source, /col-span-2 h-11 grid grid-cols-3 gap-1/);
  assert.match(source, /w-\[92px\] grid grid-cols-1 grid-rows-\[44px_88px_36px\] gap-1\.5/);
  assert.match(source, /h-11 w-full rounded-lg text-base/);
  assert.match(source, /h-full w-full rounded-lg text-base font-black/);
  assert.match(source, /h-full w-full rounded-md text-xs font-bold/);
  assert.match(source, /uiText\.judge/);
  assert.match(source, />\s*おわり\s*</);
  assert.match(source, /onClick=\{endLearningSession\}/);
  assert.match(source, /bg-emerald-600 text-white border border-emerald-700/);
  assert.match(source, /if \(token === "\/"\) return "分数";/);
  assert.match(source, /if \(token === "\."\) return "小数点";/);
  assert.match(source, /if \(token === "-"\)/);
  assert.match(source, /<span>マイ<\/span>/);
  assert.match(source, /<span>ナス<\/span>/);
  assert.doesNotMatch(source, /fixed right-3 bottom-3 z-30/);
});

test("keypad token guard supports int dec frac rules", () => {
  assert.match(source, /const canUseKeyToken = \(token: string\) =>/);
  assert.match(source, /if \(token === "\."\) return true/);
  assert.match(source, /if \(token === "\/"\) return true/);
  assert.match(source, /if \(token === "-"\) return true/);
  assert.match(source, /const isValidAnswerText = \(text: string, kind: AnswerFormat\["kind"\]\) =>/);
  assert.match(source, /kind === "dec"/);
  assert.match(source, /kind === "frac"/);
  assert.match(source, /keypadAnswerKind !== "frac" && input\.trim\(\)\.length > 0 && input\.includes\("\/"\)/);
});
