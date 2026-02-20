import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const stockSource = fs.readFileSync(path.join(root, "src/lib/questStockFactory.ts"), "utf8");
const gcfGeneratorSource = fs.readFileSync(path.join(root, "src/lib/questGenerators/factorGcf.ts"), "utf8");
const secondaryExprSource = fs.readFileSync(path.join(root, "src/lib/questGenerators/secondaryExpr.ts"), "utf8");
const h1Source = fs.readFileSync(path.join(root, "src/content/grades/mathquest_h1_types_v1.json"), "utf8");

test("stock factory wires factorization strategies", () => {
  assert.equal(stockSource.includes("generateFactorGcfEntries"), true);
  assert.equal(stockSource.includes("generateFactorDiffSqEntries"), true);
  assert.equal(stockSource.includes("generateFactorPerfSqEntries"), true);
  assert.equal(stockSource.includes("generateFactorTrinomEntries"), true);
  assert.equal(stockSource.includes("type StockGenerationStrategy"), true);
  assert.equal(stockSource.includes("const STOCK_STRATEGIES"), true);
  assert.equal(stockSource.includes("FACTOR_GCF"), true);
  assert.equal(stockSource.includes("FACTOR_DIFF_SQ"), true);
  assert.equal(stockSource.includes("FACTOR_PERF_SQ"), true);
  assert.equal(stockSource.includes("FACTOR_TRINOM"), true);
  assert.equal(stockSource.includes("EXP_RULES"), true);
  assert.equal(stockSource.includes("generateExpRulesEntries"), true);
  assert.equal(stockSource.includes("remixSecondaryExprFromSeed"), true);
  assert.equal(stockSource.includes("strategy(normalizedType, patternId, targetCount)"), true);
  assert.equal(stockSource.includes("normalizedType.answer_format.kind === \"expr\""), true);
});

test("factorization generators create prompt + tex + answer triplet", () => {
  assert.equal(gcfGeneratorSource.includes("prompt_tex"), true);
  assert.equal(gcfGeneratorSource.includes("answer"), true);
  assert.equal(gcfGeneratorSource.includes("maxAttempts"), true);
  assert.equal(gcfGeneratorSource.includes("while (out.length < targetCount"), true);
  assert.equal(gcfGeneratorSource.includes("generateFactorDiffSqEntries"), true);
  assert.equal(gcfGeneratorSource.includes("generateFactorPerfSqEntries"), true);
  assert.equal(gcfGeneratorSource.includes("generateFactorTrinomEntries"), true);
  assert.equal(secondaryExprSource.includes("generateExpRulesEntries"), true);
  assert.equal(secondaryExprSource.includes("remixSecondaryExprFromSeed"), true);
});

test("H1 has factorization pattern content to seed and expand", () => {
  assert.equal(h1Source.includes("\"type_id\": \"H1.AL.EXP.FACTOR_GCF\""), true);
  assert.equal(h1Source.includes("\"pattern_id\": \"FACTOR_GCF\""), true);
  assert.equal(h1Source.includes("\"type_id\": \"H1.AL.EXP.FACTOR_DIFF_SQ\""), true);
  assert.equal(h1Source.includes("\"pattern_id\": \"FACTOR_DIFF_SQ\""), true);
  assert.equal(h1Source.includes("\"type_id\": \"H1.AL.EXP.FACTOR_PERF_SQ\""), true);
  assert.equal(h1Source.includes("\"pattern_id\": \"FACTOR_PERF_SQ\""), true);
  assert.equal(h1Source.includes("\"type_id\": \"H1.AL.EXP.FACTOR_TRINOM\""), true);
  assert.equal(h1Source.includes("\"pattern_id\": \"FACTOR_TRINOM\""), true);
  assert.equal(h1Source.includes("\"type_id\": \"H1.AL.EXP.EXP_RULES\""), true);
  assert.equal(h1Source.includes("\"pattern_id\": \"EXP_RULES\""), true);
  assert.equal(h1Source.includes("\"prompt\": \"6x^2+9x =\""), true);
});
