import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const adapterPath = path.join(process.cwd(), "src/lib/problem/e1LevelAdapter.ts");
const source = fs.readFileSync(adapterPath, "utf8");

test("E1 memo explanations use dots and short block format", () => {
  assert.equal(source.includes("●"), true);
  assert.equal(source.includes("↓"), true);
  assert.equal(source.includes("memo_explanation"), true);
  assert.equal(source.includes("const explanationAdd"), true);
  assert.equal(source.includes("const explanationSub"), true);
});

test("calculation prompts enforce trailing equals", () => {
  assert.equal(source.includes("ensureEquationSuffix"), true);
  assert.equal(source.includes("if (levelId === \"E1-5\")"), true);
});

