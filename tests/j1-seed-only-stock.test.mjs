import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/lib/questStockFactory.ts"),
  "utf8"
);

test("J1 stock path uses example_items only", () => {
  assert.equal(source.includes('const isJ1Grade = (gradeId: string) => Boolean(gradeId) && gradeId.startsWith("J1");'), true);
  assert.equal(source.includes('const isH1Grade = (gradeId: string) => gradeId === "H1";'), true);
  assert.equal(source.includes("if (isJ1Grade(gradeId) || isH1Grade(gradeId)) {"), true);
  assert.equal(source.includes("const seedOnlyUnique = uniqueByPromptAndEquivalent(normalizedSeed);"), true);
  assert.equal(source.includes("const orderedSeedOnly = reorderAvoidAdjacentSameFamily(shuffle(seedOnlyUnique)).slice(0, targetCount);"), true);
  assert.equal(source.includes("seedOnlyGrade: gradeId"), true);
});

test("pattern-based stock generation remains for non-J1 grades", () => {
  assert.equal(source.includes("const expanded = expandEntriesToAtLeast(normalizedSeed, targetCount).map(normalizeJ1IntEntry);"), true);
  assert.equal(source.includes("const strategy = hasPattern ? STOCK_STRATEGIES[patternId] : undefined;"), true);
  assert.equal(source.includes("if (hasPattern && strategy) {"), true);
  assert.equal(source.includes("if (!isFrozenElementaryGrade(gradeId)) {"), true);
});
