import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("grader supports expectedForm mixed/improper rules", () => {
  const source = read("src/lib/grader.ts");
  assert.match(source, /if \(expectedForm === "mixed" && !userMixed\)/);
  assert.match(source, /if \(expectedForm === "improper" && !userImproper\)/);
  assert.match(source, /expectedForm === "mixed"/);
  assert.match(source, /normalized: `\$\{mixed\.whole\} \$\{mixed\.num\}\/\$\{mixed\.den\}`/);
});

test("quest has mixed batch scenarios and metrics", () => {
  const source = read("src/app/quest/page.tsx");
  assert.match(source, /7\/3 を帯分数に/);
  assert.match(source, /2 1\/4 を仮分数に/);
  assert.match(source, /形式一致/);
  assert.match(source, /整数部検出/);
  assert.match(source, /BatchMixed100/);
});
