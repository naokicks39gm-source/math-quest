import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/app/quest/page.tsx"), "utf8");

test("quest keypad includes symbol keys and compact sizing", () => {
  assert.match(source, /const DIGIT_KEYPAD_TOKENS = \["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"\] as const;/);
  assert.match(source, /const SYMBOL_KEYPAD_TOKENS = \["\/", "\.", "-"\] as const;/);
  assert.match(source, /w-full grid grid-cols-10 gap-1/);
  assert.match(source, /w-full grid grid-cols-12 gap-1/);
  assert.match(source, /h-9 w-full rounded-md text-sm/);
  assert.match(source, /col-span-2 h-9 w-full rounded-md text-xs/);
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
