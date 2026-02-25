import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const questPath = path.join(process.cwd(), "src/app/quest/page.tsx");
const source = fs.readFileSync(questPath, "utf8");

test("quest page does not import explanation modal", () => {
  assert.equal(source.includes("ExplanationModal"), false);
  assert.equal(source.includes("SecondaryExplanationPanel"), true);
  assert.equal(source.includes("getSecondaryLearningAid"), true);
  assert.equal(source.includes("解説を開く"), false);
});
