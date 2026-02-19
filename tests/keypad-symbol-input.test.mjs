import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/app/quest/page.tsx"), "utf8");

test("quest keypad includes symbol keys and compact sizing", () => {
  assert.match(source, /grid-cols-4/);
  assert.match(source, /h-12 rounded-lg text-xl/);
  assert.match(source, /\["7", "8", "9", "\/"\]/);
  assert.match(source, /\["4", "5", "6", "\."\]/);
  assert.match(source, /\["1", "2", "3", "-"\]/);
  assert.match(source, /\{token === "\/" \? "分数" : token === "\." \? "小数点" : token\}/);
});

test("keypad token guard supports int dec frac rules", () => {
  assert.match(source, /const canUseKeyToken = \(token: string\) =>/);
  assert.match(source, /if \(token === "\."\) return keypadAnswerKind === "dec"/);
  assert.match(source, /if \(token === "\/"\) return true/);
  assert.match(source, /if \(token === "-"\) return true/);
  assert.match(source, /const isValidAnswerText = \(text: string, kind: AnswerFormat\["kind"\]\) =>/);
  assert.match(source, /kind === "dec"/);
  assert.match(source, /kind === "frac"/);
  assert.match(source, /keypadAnswerKind !== "frac" && input\.trim\(\)\.length > 0 && input\.includes\("\/"\)/);
});
