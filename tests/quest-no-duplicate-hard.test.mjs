import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const factorySource = fs.readFileSync(
  path.join(process.cwd(), "src/lib/questItemFactory.ts"),
  "utf8"
);
const questSource = fs.readFileSync(
  path.join(process.cwd(), "src/app/quest/page.tsx"),
  "utf8"
);

test("factory keeps strict mode and exposes relaxed fallback builder", () => {
  assert.equal(factorySource.includes("if (stock.length < quizSize) return [];"), true);
  assert.equal(factorySource.includes("if (countConstraintViolations(ordered) === 0) return ordered;"), true);
  assert.equal(factorySource.includes("return reorderAvoidAdjacentSameFamily(shuffle(stock).slice(0, quizSize));"), false);
  assert.equal(factorySource.includes("export const buildQuestSetWithFallback"), true);
  assert.equal(factorySource.includes("return shuffle(relaxedPool).slice(0, quizSize);"), true);
  assert.equal(factorySource.includes("while (picked.length < quizSize)"), true);
});

test("quest page retries strict mode then falls back before blocking", () => {
  assert.equal(questSource.includes("for (let attempt = 0; attempt < 6; attempt += 1)"), true);
  assert.equal(questSource.includes("nextSet = buildQuestSetWithFallback({"), true);
  assert.equal(questSource.includes("if (nextSet.length !== quizSize) {"), true);
  assert.equal(questSource.includes("setStatus(\"blocked\");"), true);
  assert.equal(questSource.includes("このタイプは一時的に出題候補不足です。"), true);
});
