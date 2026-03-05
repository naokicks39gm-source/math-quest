import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const adapterPath = path.join(process.cwd(), "src/lib/problem/e1LevelAdapter.ts");
const source = fs.readFileSync(adapterPath, "utf8");

test("E1 level adapter defines E1-1..E1-12 and fixed-count generator", () => {
  for (const id of [
    "E1-1", "E1-2", "E1-3", "E1-4", "E1-5", "E1-6",
    "E1-7", "E1-8", "E1-9", "E1-10", "E1-11", "E1-12"
  ]) {
    assert.equal(source.includes(`"${id}"`), true);
  }
  assert.equal(source.includes("export const isE1LevelId"), true);
  assert.equal(source.includes("export const generateE1LevelProblems"), true);
  assert.equal(source.includes("count = 5"), true);
});

test("E1 level adapter keeps required numeric constraints", () => {
  assert.equal(source.includes("a + b <= 5"), false);
  assert.equal(source.includes("if (levelId === \"E1-6\")"), true);
  assert.equal(source.includes("if (levelId === \"E1-7\")"), true);
  assert.equal(source.includes("if (levelId === \"E1-8\")"), true);
  assert.equal(source.includes("if (levelId === \"E1-9\")"), true);
  assert.equal(source.includes("if (levelId === \"E1-10\")"), true);
  assert.equal(source.includes("if (levelId === \"E1-11\")"), true);
});

