import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("problem engine exports generation and grading adapters", () => {
  const indexSource = read("src/lib/problem/index.ts");
  const genSource = read("src/lib/problem/generation.ts");
  const gradingSource = read("src/lib/problem/grading.ts");
  assert.match(indexSource, /export \* from "\.\/generation";/);
  assert.match(indexSource, /export \* from "\.\/grading";/);
  assert.match(genSource, /generateTypeStock/);
  assert.match(genSource, /generateQuizSet/);
  assert.match(genSource, /buildProblemSet/);
  assert.match(gradingSource, /gradeProblemAnswer/);
});
