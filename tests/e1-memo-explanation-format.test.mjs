import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const adapterPath = path.join(process.cwd(), "src/lib/problem/e1LevelAdapter.ts");
const source = fs.readFileSync(adapterPath, "utf8");

test("E1 memo explanations use dots and short block format", () => {
  assert.equal(source.includes('Array.from({ length: Math.max(0, Math.floor(count)) }, () => "●").join(" ")'), true);
  assert.equal(source.includes("memo_explanation"), true);
  assert.equal(source.includes("const SECTION_DIVIDER = \"--------------\";"), true);
  assert.equal(source.includes("numberedStep(1"), true);
  assert.equal(source.includes("const explanationAddSimple"), true);
  assert.equal(source.includes("const explanationSub"), true);
  assert.equal(source.includes("まず10をつくる"), true);
  assert.equal(source.includes("こたえ"), true);
  assert.equal(source.includes("おおきいのは"), true);
  assert.equal(source.includes("`${right} > ${left}`"), false);
});

test("calculation prompts enforce trailing equals", () => {
  assert.equal(source.includes("ensureEquationSuffix"), true);
  assert.equal(source.includes("prompt: ensureEquationSuffix"), true);
  assert.equal(source.includes("10 は ${known} と"), true);
  assert.equal(source.includes("□ と ${known} で 10"), true);
  assert.equal(source.includes(" − "), true);
});
