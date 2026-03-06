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
  assert.equal(fs.existsSync(path.join(root, "packages/problem-stock/index.ts")), true);
  assert.equal(fs.existsSync(path.join(root, "packages/problem-stock/pickQuizByDifficulty.ts")), true);
  assert.equal(fs.existsSync(path.join(root, "packages/problem-hint/index.ts")), true);
  assert.equal(fs.existsSync(path.join(root, "packages/problem-hint/hint-generator.ts")), true);
  assert.equal(fs.existsSync(path.join(root, "packages/problem-hint/hint-templates.ts")), true);
  assert.equal(fs.existsSync(path.join(root, "packages/problem-explanation/index.ts")), true);
  assert.equal(fs.existsSync(path.join(root, "packages/problem-explanation/explanation-generator.ts")), true);
  assert.equal(fs.existsSync(path.join(root, "packages/problem-explanation/explanation-templates.ts")), true);
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
  assert.equal(source.includes("const dslStock = buildDslStock(normalizedType, patternId, {"), true);
  assert.equal(source.includes("if (dslStock.entries.length > 0) {"), true);
  assert.equal(source.includes("const strategy = hasPattern ? STOCK_STRATEGIES[patternId] : undefined;"), true);
  assert.equal(source.includes("buildPatternFallbackEntries"), true);
});

test("problem-engine exposes unified generator API", () => {
  const source = read("packages/problem-engine/dsl-engine.ts");
  assert.equal(source.includes("export type Range = [number, number];"), true);
  assert.equal(source.includes("export type PatternDSL"), true);
  assert.equal(source.includes("export type GeneratedProblem"), true);
  assert.equal(source.includes("id: string;"), true);
  assert.equal(source.includes("question: string;"), true);
  assert.equal(source.includes("patternKey?: string;"), true);
  assert.equal(source.includes("variables?: Record<string, number>;"), true);
  assert.equal(source.includes("difficulty?: number;"), true);
  assert.equal(source.includes("export const parsePatternDSL"), true);
  assert.equal(source.includes("export const generateVariables"), true);
  assert.equal(source.includes("export const evaluateConstraints"), true);
  assert.equal(source.includes("export const renderTemplate"), true);
  assert.equal(source.includes("export const evaluateAnswer"), true);
  assert.equal(source.includes("export const generateProblem"), true);
  assert.equal(source.includes("export const generateProblems"), true);
  assert.equal(source.includes("export const generateStock"), false);
  assert.equal(source.includes("export const pickQuiz"), false);
  assert.equal(source.includes("new Set<string>()"), false);
  assert.equal(source.includes("for (let i = 0; i < count; i += 1)"), true);
  assert.equal(source.includes("problems.push(generateProblem(parsed));"), true);
  assert.equal(source.includes("Function("), false);
});

test("problem-engine adapter uses fixed 200 raw generations and no dedupe", () => {
  const source = read("packages/problem-engine/adapters.ts");
  assert.equal(source.includes("const generationCount = Math.max(0, Math.trunc(options.generationCount ?? 200));"), true);
  assert.equal(source.includes("const minimalDsl = toPatternDsl(validated.pattern);"), true);
  assert.equal(source.includes("generateProblems(validated.pattern, generationCount)"), false);
  assert.equal(source.includes("generateProblems(minimalDsl, generationCount)"), true);
  assert.equal(source.includes("new Set<string>()"), false);
});

test("GeneratedProblem supports optional extension fields", () => {
  const source = read("packages/problem-engine/dsl-engine.ts");
  assert.equal(source.includes("patternKey: pattern.key"), true);
  assert.equal(source.includes("variables: vars"), true);
  assert.equal(source.includes("variableRanges?: Record<string, Range>;"), true);
  assert.equal(source.includes("variableRanges: pattern.variables,"), true);
  assert.equal(source.includes("source: \"pattern-dsl\""), true);
});

test("constraints and template follow strict generation rules", () => {
  const source = read("packages/problem-engine/dsl-engine.ts");
  assert.equal(source.includes("const context = Object.fromEntries("), true);
  assert.equal(source.includes("const result = evaluateExpression(constraint, context);"), true);
  assert.equal(source.includes("for (let attempts = 0; attempts < MAX_CONSTRAINT_ATTEMPTS; attempts += 1) {"), true);
  assert.equal(source.includes("if (evaluateConstraints(pattern, vars)) {"), true);
  assert.equal(source.includes("throw new Error(\"DSL template variable not defined\");"), true);
  assert.equal(source.includes("vars[name] = randomInt(range[0], range[1]);"), true);
});

const transpileTsModule = async (sourcePath, outputPath, replacements = []) => {
  const tsModule = await import("typescript");
  const ts = tsModule.default ?? tsModule;
  let source = fs.readFileSync(sourcePath, "utf8");
  for (const [from, to] of replacements) {
    source = source.replaceAll(from, to);
  }
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2020,
      target: ts.ScriptTarget.ES2020
    },
    fileName: path.basename(sourcePath)
  });
  fs.writeFileSync(outputPath, transpiled.outputText, "utf8");
};

const loadMinimalDslModule = async () => {
  const os = await import("node:os");
  const { pathToFileURL } = await import("node:url");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "problem-engine-minimal-dsl-"));
  const evaluatorSource = path.join(root, "packages/problem-format/expressionEvaluator.ts");
  const minimalDslSource = path.join(root, "packages/problem-engine/minimal-dsl.ts");
  const evaluatorOutput = path.join(tempDir, "expressionEvaluator.mjs");
  const minimalDslOutput = path.join(tempDir, "minimal-dsl.mjs");

  await transpileTsModule(evaluatorSource, evaluatorOutput);
  await transpileTsModule(minimalDslSource, minimalDslOutput, [
    ['from "packages/problem-format/expressionEvaluator"', 'from "./expressionEvaluator.mjs"']
  ]);

  return import(`${pathToFileURL(minimalDslOutput).href}?t=${Date.now()}`);
};

test("minimal DSL exports are appended without changing existing engine API", () => {
  const engineSource = read("packages/problem-engine/dsl-engine.ts");
  const indexSource = read("packages/problem-engine/index.ts");
  const catalogSource = read("packages/problem-engine/catalog.ts");
  assert.equal(engineSource.includes('parsePatternDSL as parsePatternDSLMinimal'), true);
  assert.equal(engineSource.includes('generateMinimalProblem'), true);
  assert.equal(indexSource.includes('generateMinimalProblems'), true);
  assert.equal(catalogSource.includes("export const toMinimalPatternDsl"), true);
});

test("minimal DSL can generate a problem from the smallest pattern shape", async () => {
  const minimalDsl = await loadMinimalDslModule();
  const pattern = {
    key: "ADD_BASIC",
    template: "{a} + {b} =",
    variables: {
      a: [1, 1],
      b: [2, 2]
    },
    answer: "a + b"
  };

  const generated = minimalDsl.generateMinimalProblem(pattern);
  assert.equal(generated.question, "1 + 2 =");
  assert.equal(generated.answer, "3");
  assert.equal(generated.patternKey, "ADD_BASIC");
  assert.deepEqual(generated.variables, { a: 1, b: 2 });
  assert.deepEqual(generated.variableRanges, pattern.variables);
  assert.equal(generated.meta?.source, "pattern-dsl");
  assert.equal(typeof generated.meta?.difficulty, "number");
  assert.equal(generated.meta.difficulty >= 1 && generated.meta.difficulty <= 5, true);
});

test("minimal DSL generateMinimalProblems keeps n-count behavior", async () => {
  const minimalDsl = await loadMinimalDslModule();
  const pattern = {
    key: "ADD_REPEAT",
    template: "{a} + {b} =",
    variables: {
      a: [1, 1],
      b: [1, 1]
    },
    answer: "a + b"
  };

  const generated = minimalDsl.generateMinimalProblems(pattern, 3);
  assert.equal(generated.length, 3);
  for (const item of generated) {
    assert.equal(item.question, "1 + 1 =");
    assert.equal(item.answer, "2");
    assert.deepEqual(item.variableRanges, pattern.variables);
  }
});

test("minimal DSL renderTemplate throws when a template variable is undefined", async () => {
  const minimalDsl = await loadMinimalDslModule();
  assert.throws(
    () => minimalDsl.renderTemplate("x = {missing}", { a: 1 }),
    /DSL template variable not defined/
  );
  assert.throws(
    () => minimalDsl.renderTemplate("x = {a + b}", { a: 1, b: 2 }),
    /DSL template variable not defined/
  );
});

test("minimal DSL regenerates variables until constraints are satisfied", async () => {
  const minimalDsl = await loadMinimalDslModule();
  const originalRandom = Math.random;
  const sequence = [0, 0, 0.99, 0];
  let index = 0;

  Math.random = () => {
    const next = sequence[index] ?? sequence[sequence.length - 1];
    index += 1;
    return next;
  };

  try {
    const generated = minimalDsl.generateMinimalProblem({
      key: "RETRY_CONSTRAINT",
      template: "{a},{b}",
      variables: {
        a: [1, 2],
        b: [1, 2]
      },
      constraints: ["a > b"],
      answer: "a - b"
    });

    assert.equal(index >= 4, true);
    assert.deepEqual(generated.variables, { a: 2, b: 1 });
    assert.equal(generated.question, "2,1");
    assert.equal(generated.answer, "1");
  } finally {
    Math.random = originalRandom;
  }
});

test("minimal DSL keeps variableRanges in GeneratedProblem", async () => {
  const minimalDsl = await loadMinimalDslModule();
  const pattern = {
    key: "RANGE_KEEP",
    template: "{x}",
    variables: {
      x: [4, 7]
    },
    answer: "x"
  };

  const generated = minimalDsl.generateMinimalProblem(pattern);
  assert.deepEqual(generated.variableRanges, {
    x: [4, 7]
  });
});

test("minimal DSL derives c for J1 negative linear patterns before rendering and constraint evaluation", async () => {
  const minimalDsl = await loadMinimalDslModule();
  const pattern = {
    key: "J1-LIN-NEG-01",
    template: "{a}x + {b} = {c}",
    variables: {
      a: [2, 2],
      b: [-3, -3],
      x: [-4, -4]
    },
    constraints: ["c == a * x + b"],
    answer: "x"
  };

  const generated = minimalDsl.generateMinimalProblem(pattern);

  assert.equal(generated.variables.c, -11);
  assert.equal(generated.question, "2x + -3 = -11");
  assert.equal(generated.answer, "-4");
  assert.equal(minimalDsl.evaluateConstraints(pattern, generated.variables), true);
});

test("minimal DSL derives c for grouped J1 negative linear patterns", async () => {
  const minimalDsl = await loadMinimalDslModule();
  const pattern = {
    key: "J1-LIN-NEG-04",
    template: "{a}(x - {b}) = {c}",
    variables: {
      a: [3, 3],
      b: [2, 2],
      x: [-5, -5]
    },
    constraints: ["c == a * (x - b)"],
    answer: "x"
  };

  const generated = minimalDsl.generateMinimalProblem(pattern);

  assert.equal(generated.variables.c, -21);
  assert.equal(generated.question, "3(x - 2) = -21");
  assert.equal(generated.answer, "-5");
  assert.equal(minimalDsl.evaluateConstraints(pattern, generated.variables), true);
});
