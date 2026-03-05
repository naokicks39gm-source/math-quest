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

test("factory keeps strict mode only (no duplicate fallback)", () => {
  assert.equal(factorySource.includes("const strictAttempts = 1200"), false);
  assert.equal(factorySource.includes("const fallbackAttempts = 360"), false);
  assert.equal(factorySource.includes("uniqueByPromptAndEquivalent"), true);
  assert.equal(factorySource.includes("patternId === \"ADD_1D_1D_NO\""), true);
});

test("quest page uses stock-based selection and blocks when stock is empty", () => {
  assert.equal(questSource.includes("const stocks = buildStocksForTypes("), true);
  assert.equal(questSource.includes("const firstPick = activeStock ? pickUniqueQuizFromStock(activeStock.entries, quizSize)"), true);
  assert.equal(questSource.includes("if (hasDuplicateInSet(nextSet) && activeStock)"), true);
  assert.equal(questSource.includes("const sameGradeFallback = buildUniqueSetFromEntries(sameGradePool, quizSize);"), false);
  assert.equal(questSource.includes("const globalFallback = buildUniqueSetFromEntries(allCategoryItems, quizSize);"), false);
  assert.equal(questSource.includes("if (pickMeta.availableAfterDedupe < 1 || pickMeta.reason === \"DUP_GUARD_FAILED\") {"), true);
  assert.equal(questSource.includes("setStatus(\"blocked\");"), true);
  assert.equal(questSource.includes("このタイプは一時的に出題候補不足です。"), true);
});
