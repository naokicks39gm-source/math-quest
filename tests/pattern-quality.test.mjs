import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

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
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pattern-quality-"));

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

test("all catalog patterns generate valid problems and evaluable answers", async () => {
  const { adapters, dslEngine } = await loadProblemEngineModules();
  const gradeTypes = ["E1", "E2", "J1", "H1"];

  for (const gradeType of gradeTypes) {
    const patterns = adapters.loadPatternCatalog(gradeType);
    assert.equal(patterns.length > 0, true, `${gradeType} must have patterns`);

    for (const pattern of patterns) {
      const generated = dslEngine.generateProblems(pattern, 100);
      assert.equal(generated.length, 100, `${pattern.key} should generate 100 problems`);

      for (const problem of generated) {
        assert.equal(
          dslEngine.evaluateConstraintsMinimal(pattern, problem.variables ?? {}),
          true,
          `${pattern.key} generated a constraint violation`
        );
        assert.doesNotThrow(() => dslEngine.evaluateAnswerMinimal(pattern.answer, problem.variables ?? {}), pattern.key);
      }
    }
  }
});
