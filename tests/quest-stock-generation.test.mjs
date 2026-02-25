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

test("MIXED_TO_20 has deterministic fallback generation and strategy mapping", () => {
  assert.equal(source.includes('if (patternId === "MIXED_TO_20")'), true);
  assert.equal(source.includes("const addPairs: Array<[number, number]> = [];"), true);
  assert.equal(source.includes("const subPairs: Array<[number, number]> = [];"), true);
  assert.equal(source.includes('prompt: `${a} + ${b} =`'), true);
  assert.equal(source.includes('prompt: `${a} - ${b} =`'), true);
  assert.equal(source.includes("MIXED_TO_20: (type, patternId, targetCount) => buildPatternFallbackEntries(type, patternId, targetCount),"), true);
});

test("E1 ADD_2D_1D_YES stock has 2-digit-only final guard", () => {
  assert.equal(source.includes("const filterE1Add2D1DYesToTwoDigits ="), true);
  assert.equal(source.includes("typeId.startsWith(\"E1.\") && patternId === \"ADD_2D_1D_YES\""), true);
  assert.equal(source.includes("return Number.isFinite(answer) && answer < 100;"), true);
  assert.equal(source.includes("unique = filterE1Add2D1DYesToTwoDigits(unique, type.type_id, hasPattern ? patternId : undefined);"), true);
});

test("E1 phase7-10 stock applies per-type operand/answer limit rules", () => {
  assert.equal(source.includes("const isE1Phase7To10Type ="), true);
  assert.equal(source.includes("const isE1Phase7To10OperandsLimitedType ="), true);
  assert.equal(source.includes("const isE1Phase7To10AnswerLimitedType ="), true);
  assert.equal(source.includes("const limitOperandsTo20 ="), true);
  assert.equal(source.includes("const limitAnswerTo20 ="), true);
  assert.equal(source.includes("if (limitOperandsTo20 && (a > 20 || b > 20)) continue;"), true);
  assert.equal(source.includes("if (limitAnswerTo20 && sum > 20) continue;"), true);
  assert.equal(source.includes("if (limitAnswerTo20 && (diff < 0 || diff > 20)) continue;"), true);
  assert.equal(source.includes("const filterE1Phase7To10To20Range ="), true);
  assert.equal(source.includes("if (!isE1Phase7To10Type(typeId)) return entries;"), true);
  assert.equal(source.includes("if (limitOperandsTo20 && (a > 20 || b > 20)) return false;"), true);
  assert.equal(source.includes("if (limitAnswerTo20 && (answer < 0 || answer > 20)) return false;"), true);
  assert.equal(source.includes("unique = filterE1Phase7To10To20Range(unique, type.type_id);"), true);
});

test("E2 2-digit+1-digit stock applies final range guard", () => {
  assert.equal(source.includes("const isE2Add2D1DType ="), true);
  assert.equal(source.includes("const limitE2Add2D1DRange = isE2Add2D1DType(type.type_id) && patternId.startsWith(\"ADD_2D_1D_\");"), true);
  assert.equal(source.includes("if ((limitE2Add2D1DRange || limitE2Sub2D1DRange) && (a < 20 || a > 98 || b < 1 || b > 9)) continue;"), true);
  assert.equal(source.includes("if (limitE2Add2D1DRange && sum > 99) continue;"), true);
  assert.equal(source.includes("const filterE2Add2D1DRange ="), true);
  assert.equal(source.includes("if (!isE2Add2D1DType(typeId)) return entries;"), true);
  assert.equal(source.includes("if (a < 20 || a > 98) return false;"), true);
  assert.equal(source.includes("if (b < 1 || b > 9) return false;"), true);
  assert.equal(source.includes("if (answer < 0 || answer > 99) return false;"), true);
  assert.equal(source.includes("unique = filterE2Add2D1DRange(unique, type.type_id);"), true);
});

test("E2 2-digit-1-digit stock applies final range guard", () => {
  assert.equal(source.includes("const isE2Sub2D1DType ="), true);
  assert.equal(source.includes("const limitE2Sub2D1DRange = isE2Sub2D1DType(type.type_id) && patternId.startsWith(\"SUB_2D_1D_\");"), true);
  assert.equal(source.includes("if ((limitE2Add2D1DRange || limitE2Sub2D1DRange) && (a < 20 || a > 98 || b < 1 || b > 9)) continue;"), true);
  assert.equal(source.includes("if (limitE2Sub2D1DRange && diff < 0) continue;"), true);
  assert.equal(source.includes("const filterE2Sub2D1DRange ="), true);
  assert.equal(source.includes("if (!isE2Sub2D1DType(typeId)) return entries;"), true);
  assert.equal(source.includes("unique = filterE2Sub2D1DRange(unique, type.type_id);"), true);
});
