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

test("quest page is type-locked and has no grade/global fallback", () => {
  assert.equal(questSource.includes("const byQuery = typeCatalog.find((entry) => entry.typeId === typeFromQuery);"), true);
  assert.equal(questSource.includes("const activeStock = activeTypeId ? typeStocks.get(activeTypeId) : undefined;"), true);
  assert.equal(questSource.includes("pickUniqueQuizFromStock(activeStock.entries, quizSize)"), true);
  assert.equal(questSource.includes("const sameGradePool = allCategoryItems.filter((entry) =>"), false);
  assert.equal(questSource.includes("const globalFallback = buildUniqueSetFromEntries(allCategoryItems, quizSize);"), false);
});

test("factory has deterministic E1 1-digit no-carry generator", () => {
  assert.equal(factorySource.includes("patternId === \"ADD_1D_1D_NO\""), true);
  assert.equal(factorySource.includes("for (let a = 1; a <= 9; a += 1)"), true);
  assert.equal(factorySource.includes("for (let b = a; b <= 9; b += 1)"), true);
  assert.equal(factorySource.includes("if (a + b >= 10) continue;"), true);
});
