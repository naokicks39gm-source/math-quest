import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (target) => fs.readFileSync(path.join(root, target), "utf8");
const readJson = (target) => JSON.parse(read(target));

test("problem-format package entry points exist", () => {
  assert.equal(fs.existsSync(path.join(root, "packages/problem-engine/index.ts")), true);
  assert.equal(fs.existsSync(path.join(root, "packages/problem-engine/dsl-engine.ts")), true);
  assert.equal(fs.existsSync(path.join(root, "packages/problem-engine/adapters.ts")), true);
  assert.equal(fs.existsSync(path.join(root, "packages/problem-format/index.ts")), true);
  assert.equal(fs.existsSync(path.join(root, "packages/problem-format/engine.ts")), true);
  assert.equal(fs.existsSync(path.join(root, "packages/problem-format/schema.ts")), true);
  assert.equal(fs.existsSync(path.join(root, "packages/problem-format/expressionEvaluator.ts")), true);
  assert.equal(fs.existsSync(path.join(root, "packages/problem-format/templateRenderer.ts")), true);
  assert.equal(fs.existsSync(path.join(root, "packages/problem-format/variableGenerator.ts")), true);
});

test("DSL representative patterns exist for elementary/junior/high", () => {
  const elementary = readJson("packages/problem-format/patterns/elementary/ADD_1D_1D_NO.json");
  const junior = readJson("packages/problem-format/patterns/junior/INT_ADD.json");
  const high = readJson("packages/problem-format/patterns/high/LOG_VAL.json");
  assert.equal(elementary.pattern_id, "ADD_1D_1D_NO");
  assert.equal(junior.pattern_id, "INT_ADD");
  assert.equal(high.pattern_id, "LOG_VAL");
  assert.equal(typeof elementary.answer_expression, "string");
  assert.equal(typeof junior.answer_expression, "string");
  assert.equal(typeof high.answer_expression, "string");
});

test("curriculum mapping files exist", () => {
  const e = readJson("packages/problem-format/curriculum/E1-1.json");
  const j = readJson("packages/problem-format/curriculum/J1-3.json");
  const h = readJson("packages/problem-format/curriculum/H1-1.json");
  assert.equal(Array.isArray(e.patterns), true);
  assert.equal(Array.isArray(j.patterns), true);
  assert.equal(Array.isArray(h.patterns), true);
});

test("quest stock factory uses DSL-first path with legacy fallback remaining", () => {
  const source = read("src/lib/questStockFactory.ts");
  assert.equal(source.includes('import { buildDslEntriesForType } from "packages/problem-engine";'), true);
  assert.equal(source.includes("const dslEntries = hasPattern ? buildDslEntriesForType(normalizedType, patternId, targetCount) : [];"), true);
  assert.equal(source.includes("if (dslEntries.length > 0) {"), true);
  assert.equal(source.includes("const strategy = hasPattern ? STOCK_STRATEGIES[patternId] : undefined;"), true);
  assert.equal(source.includes("buildPatternFallbackEntries"), true);
});

test("problem-engine exposes unified generator API", () => {
  const source = read("packages/problem-engine/dsl-engine.ts");
  assert.equal(source.includes("export type VariableRule"), true);
  assert.equal(source.includes("export type Pattern"), true);
  assert.equal(source.includes("export type GeneratedProblem"), true);
  assert.equal(source.includes("export const generateProblem"), true);
  assert.equal(source.includes("export const generateProblems"), true);
  assert.equal(source.includes("export const generateStock"), false);
  assert.equal(source.includes("export const pickQuiz"), false);
  assert.equal(source.includes("shuffle("), false);
  assert.equal(source.includes("new Set<string>()"), false);
  assert.equal(source.includes("for (let i = 0; i < count; i += 1)"), true);
  assert.equal(source.includes("problems.push(generateProblem(pattern));"), true);
});

test("problem-engine adapter uses fixed 200 raw generations and no dedupe", () => {
  const source = read("packages/problem-engine/adapters.ts");
  assert.equal(source.includes("generateProblems(validated.pattern, 200)"), true);
  assert.equal(source.includes("uniqueArtifacts"), false);
  assert.equal(source.includes("new Set<string>()"), false);
});
