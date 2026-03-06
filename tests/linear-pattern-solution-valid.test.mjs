import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const EPSILON = 1e-9;

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

const loadProblemEngineModules = async () => {
  const os = await import("node:os");
  const { pathToFileURL } = await import("node:url");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "linear-pattern-solution-valid-"));

  const expressionEvaluatorSource = path.join(root, "packages/problem-format/expressionEvaluator.ts");
  const minimalDslSource = path.join(root, "packages/problem-engine/minimal-dsl.ts");
  const dslEngineSource = path.join(root, "packages/problem-engine/dsl-engine.ts");
  const catalogSource = path.join(root, "packages/problem-engine/catalog.ts");

  const expressionEvaluatorOutput = path.join(tempDir, "expressionEvaluator.mjs");
  const minimalDslOutput = path.join(tempDir, "minimal-dsl.mjs");
  const dslEngineOutput = path.join(tempDir, "dsl-engine.mjs");
  const catalogOutput = path.join(tempDir, "catalog.mjs");

  await transpileTsModule(expressionEvaluatorSource, expressionEvaluatorOutput);
  await transpileTsModule(minimalDslSource, minimalDslOutput, [
    ['from "packages/problem-format/expressionEvaluator"', 'from "./expressionEvaluator.mjs"']
  ]);
  await transpileTsModule(dslEngineSource, dslEngineOutput, [
    ['from "packages/problem-format/expressionEvaluator"', 'from "./expressionEvaluator.mjs"'],
    ['from "packages/problem-engine/minimal-dsl"', 'from "./minimal-dsl.mjs"']
  ]);
  await transpileTsModule(catalogSource, catalogOutput, [
    ['from "packages/problem-engine/dsl-engine"', 'from "./dsl-engine.mjs"']
  ]);

  const adapters = await import(`${pathToFileURL(catalogOutput).href}?t=${Date.now()}`);
  const dslEngine = await import(`${pathToFileURL(dslEngineOutput).href}?t=${Date.now()}`);
  return { adapters, dslEngine };
};

const equationHoldsByVariables = (patternKey, variables, answer) => {
  const x = Number(answer);
  if (!Number.isFinite(x)) return false;

  switch (patternKey) {
    case "J1-LIN-BASIC-01":
    case "J1-LIN-NEG-01":
      return Math.abs((variables.a * x + variables.b) - variables.c) < EPSILON;
    case "J1-LIN-BASIC-02":
    case "J1-LIN-NEG-02":
      return Math.abs((variables.a * x - variables.b) - variables.c) < EPSILON;
    case "J1-LIN-BASIC-03":
      return Math.abs((variables.a * (x + variables.b)) - variables.c) < EPSILON;
    case "J1-LIN-BASIC-04":
      return Math.abs((x / variables.a + variables.b) - (variables.q + variables.b)) < EPSILON;
    case "J1-LIN-BASIC-05":
      return Math.abs((variables.a * x + variables.b) - (variables.c + variables.d)) < EPSILON;
    case "J1-LIN-NEG-03":
      return Math.abs((-variables.a * x + variables.b) - variables.c) < EPSILON;
    case "J1-LIN-NEG-04":
      return Math.abs((variables.a * (x - variables.b)) - variables.c) < EPSILON;
    case "J1-LIN-NEG-05":
      return Math.abs((x / variables.a - variables.b) - (-variables.q - variables.b)) < EPSILON;
    case "J1-LIN-FRAC-01":
      return Math.abs((variables.n * x / variables.d + variables.b) - (variables.q + variables.b)) < EPSILON;
    case "J1-LIN-FRAC-02":
      return Math.abs((variables.n * x / variables.d - variables.b) - (variables.q - variables.b)) < EPSILON;
    case "J1-LIN-FRAC-03":
      return Math.abs((x / variables.d + variables.b) - (variables.q + variables.b)) < EPSILON;
    case "J1-LIN-FRAC-04":
      return Math.abs((variables.n * (x + variables.b) / variables.d) - variables.q) < EPSILON;
    case "J1-LIN-FRAC-05":
      return Math.abs((variables.n * x / variables.d) - variables.q) < EPSILON;
    default:
      throw new Error(`Unhandled linear pattern: ${patternKey}`);
  }
};

test("all J1 linear pattern answers satisfy the rendered equation", async () => {
  const { adapters, dslEngine } = await loadProblemEngineModules();
  const patterns = adapters
    .loadPatternCatalog("J1")
    .filter((pattern) => pattern.key.startsWith("J1-LIN-"));

  assert.equal(patterns.length > 0, true);

  for (const pattern of patterns) {
    const generated = dslEngine.generateProblems(pattern, 200);
    assert.equal(generated.length, 200, `${pattern.key} should generate 200 problems`);

    for (const problem of generated) {
      assert.equal(
        equationHoldsByVariables(pattern.key, problem.variables ?? {}, problem.answer),
        true,
        `${pattern.key} failed substitution check: ${problem.question} / x=${problem.answer}`
      );
    }
  }
});
