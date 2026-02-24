import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/lib/questStockFactory.ts"),
  "utf8"
);

test("stock factory exposes type stock APIs", () => {
  assert.equal(source.includes("export const buildTypeStock"), true);
  assert.equal(source.includes("export const buildStocksForTypes"), true);
  assert.equal(source.includes("export const pickUniqueQuizFromStock"), true);
});

test("stock generation keeps unique prompt/equivalent keys", () => {
  assert.equal(source.includes("entryPromptKey"), true);
  assert.equal(source.includes("entryEquivalentKey"), true);
  assert.equal(source.includes("if (promptKeys.has(promptKey)) continue;"), true);
  assert.equal(source.includes("if (equivalentKeys.has(equivalentKey)) continue;"), true);
});

test("E1 1-digit add stock always blends deterministic candidates", () => {
  assert.equal(source.includes("patternId.startsWith(\"ADD_1D_1D_\")"), true);
  assert.equal(source.includes("buildDeterministicAdd1D1D"), true);
  assert.equal(source.includes("uniqueByPromptAndEquivalent([...deterministic, ...unique].map(normalizeJ1IntEntry))"), true);
});

test("stock result includes generated count and reason", () => {
  assert.equal(source.includes("patternId?: string"), true);
  assert.equal(source.includes("expandedCount"), true);
  assert.equal(source.includes("uniqueCount"), true);
  assert.equal(source.includes("generatedCount"), true);
  assert.equal(source.includes("buildMs"), true);
  assert.equal(source.includes("failureClass"), true);
  assert.equal(source.includes("GEN_FAIL"), true);
  assert.equal(source.includes("GEN_OK_PICK_FAIL"), true);
  assert.equal(source.includes("INSUFFICIENT_GENERATABLE"), true);
  assert.equal(source.includes("NO_PATTERN"), true);
  assert.equal(source.includes("NO_SOURCE"), true);
});

test("non-frozen grades can use seed-variant fallback", () => {
  assert.equal(source.includes("isFrozenElementaryGrade"), true);
  assert.equal(source.includes("if (!isFrozenElementaryGrade(gradeId))"), true);
  assert.equal(source.includes("buildSeedVariantEntries"), false);
  assert.equal(source.includes("without altering displayed text"), true);
  assert.equal(source.includes("れんしゅう"), false);
});

test("decimal patterns have deterministic fallback generation", () => {
  assert.equal(source.includes('if (patternId.startsWith("DEC_"))'), true);
  assert.equal(source.includes('if (patternId.includes("DEC_MUL_INT"))'), true);
  assert.equal(source.includes('if (patternId.includes("DEC_DIV_INT"))'), true);
  assert.equal(source.includes("toFixed(dp)"), true);
});

test("NUM patterns have deterministic fallback generation", () => {
  assert.equal(source.includes('if (patternId.startsWith("NUM_"))'), true);
  assert.equal(source.includes('patternId === "NUM_COMPARE_UP_TO_20"'), true);
  assert.equal(source.includes('patternId === "NUM_DECOMP_10"'), true);
  assert.equal(source.includes('patternId === "NUM_COMP_10"'), true);
  assert.equal(source.includes("どちらが大きい？"), true);
});

test("E1 ADD_2D_1D_YES stock has 2-digit-only final guard", () => {
  assert.equal(source.includes("const filterE1Add2D1DYesToTwoDigits ="), true);
  assert.equal(source.includes("typeId.startsWith(\"E1.\") && patternId === \"ADD_2D_1D_YES\""), true);
  assert.equal(source.includes("return Number.isFinite(answer) && answer < 100;"), true);
  assert.equal(source.includes("unique = filterE1Add2D1DYesToTwoDigits(unique, type.type_id, hasPattern ? patternId : undefined);"), true);
});
