import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/lib/questItemFactory.ts"),
  "utf8"
);

test("quest item factory exposes unique build APIs", () => {
  assert.equal(source.includes("export const buildUniqueQuestSet"), true);
  assert.equal(source.includes("export const expandEntriesToAtLeast"), true);
  assert.equal(source.includes("entryKey"), true);
  assert.equal(source.includes("normalizePromptForUniqueness"), true);
  assert.equal(source.includes("toEquivalentExpressionKey"), true);
  assert.equal(source.includes("toAnswerKey"), true);
});

test("quest item factory includes pattern-based generators for fallback expansion", () => {
  assert.equal(source.includes("generateByPattern"), true);
  assert.equal(source.includes('patternId.startsWith("ADD_")'), true);
  assert.equal(source.includes('patternId.startsWith("SUB_")'), true);
  assert.equal(source.includes('patternId.startsWith("MUL_")'), true);
  assert.equal(source.includes('patternId.startsWith("DIV_")'), true);
  assert.equal(source.includes('patternId.startsWith("DEC_")'), true);
  assert.equal(source.includes('patternId.startsWith("FRAC_")'), true);
  assert.equal(source.includes("while (unique.length < minCount"), true);
});

test("quest item factory exposes diversity helper functions", () => {
  assert.equal(source.includes("export const extractQuestionFeatures"), true);
  assert.equal(source.includes("export const scoreCandidateSet"), true);
  assert.equal(source.includes("export const reorderAvoidAdjacentSameFamily"), true);
  assert.equal(source.includes("pickDiverseQuizEntries"), true);
  assert.equal(source.includes("adjacentPenaltyByFeatures"), true);
});
