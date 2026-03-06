import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const stockSource = fs.readFileSync(
  path.join(process.cwd(), "src/lib/questStockFactory.ts"),
  "utf8"
);
const factorySource = fs.readFileSync(
  path.join(process.cwd(), "src/lib/questItemFactory.ts"),
  "utf8"
);
const questSource = fs.readFileSync(
  path.join(process.cwd(), "src/app/quest/page.tsx"),
  "utf8"
);

test("H1 stock path uses example_items only", () => {
  assert.equal(stockSource.includes('const isH1Grade = (gradeId: string) => gradeId === "H1";'), true);
  assert.equal(stockSource.includes("if (isJ1Grade(gradeId) || isH1Grade(gradeId)) {"), true);
  assert.equal(stockSource.includes("const seedOnlyUnique = uniqueByPromptAndEquivalent(normalizedSeed);"), true);
  assert.equal(stockSource.includes("seedOnlyGrade: gradeId"), true);
});

test("H1 factory path keeps seed-only selection", () => {
  assert.equal(factorySource.includes('if (selectedTypeId.startsWith("H1.")) {'), true);
  assert.equal(factorySource.includes("const uniquePool = uniqueByPromptAndEquivalent(typedSource);"), true);
  assert.equal(factorySource.includes("const expanded = expandEntriesToAtLeast(typedSource, Math.max(poolSize, quizSize * 4));"), true);
});

test("quest page can start H1 even when fewer than five examples exist", () => {
  assert.equal(questSource.includes("if (pickMeta.availableAfterDedupe < 1 || pickMeta.reason === \"DUP_GUARD_FAILED\") {"), true);
  assert.equal(questSource.includes("候補不足のため"), true);
});

test("quest page treats H1 expr lessons as reference-only cards", () => {
  assert.equal(questSource.includes("const isH1ReferenceOnlyType"), true);
  assert.equal(questSource.includes("このカードは例題表示のみです。右下の「次へ」で進めます。"), true);
  assert.equal(questSource.includes("const canSubmitResolved = isH1ReferenceOnlyQuestion ? false : canSubmitCurrentAnswer;"), true);
});
