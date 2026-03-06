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
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "linear-pattern-integer-root-"));

  const expressionEvaluatorSource = path.join(root, "packages/problem-format/expressionEvaluator.ts");
  const minimalDslSource = path.join(root, "packages/problem-engine/minimal-dsl.ts");
  const dslEngineSource = path.join(root, "packages/problem-engine/dsl-engine.ts");
  const adaptersSource = path.join(root, "packages/problem-engine/adapters.ts");

  const expressionEvaluatorOutput = path.join(tempDir, "expressionEvaluator.mjs");
  const minimalDslOutput = path.join(tempDir, "minimal-dsl.mjs");
  const dslEngineOutput = path.join(tempDir, "dsl-engine.mjs");
  const adaptersOutput = path.join(tempDir, "adapters.mjs");
  const registryStubOutput = path.join(tempDir, "registry-stub.mjs");
  const schemaStubOutput = path.join(tempDir, "schema-stub.mjs");

  fs.writeFileSync(
    registryStubOutput,
    "export const getPatternByGradeAndId = () => undefined;\nexport const resolveGradeBucketFromTypeId = () => undefined;\n",
    "utf8"
  );
  fs.writeFileSync(
    schemaStubOutput,
    "export const validatePatternSchema = () => ({ ok: false, errors: [] });\n",
    "utf8"
  );

  await transpileTsModule(expressionEvaluatorSource, expressionEvaluatorOutput);
  await transpileTsModule(minimalDslSource, minimalDslOutput, [
    ['from "packages/problem-format/expressionEvaluator"', 'from "./expressionEvaluator.mjs"']
  ]);
  await transpileTsModule(dslEngineSource, dslEngineOutput, [
    ['from "packages/problem-format/expressionEvaluator"', 'from "./expressionEvaluator.mjs"'],
    ['from "packages/problem-engine/minimal-dsl"', 'from "./minimal-dsl.mjs"']
  ]);
  await transpileTsModule(adaptersSource, adaptersOutput, [
    ['from "packages/problem-format/registry"', 'from "./registry-stub.mjs"'],
    ['from "packages/problem-format/schema"', 'from "./schema-stub.mjs"'],
    ['from "packages/problem-engine/dsl-engine"', 'from "./dsl-engine.mjs"']
  ]);

  const adapters = await import(`${pathToFileURL(adaptersOutput).href}?t=${Date.now()}`);
  const dslEngine = await import(`${pathToFileURL(dslEngineOutput).href}?t=${Date.now()}`);
  return { adapters, dslEngine };
};

test("all J1 linear patterns generate integer answers", async () => {
  const { adapters, dslEngine } = await loadProblemEngineModules();
  const patterns = adapters
    .loadPatternCatalog("J1")
    .filter((pattern) => /^J1-LIN-(BASIC|NEG)-/u.test(pattern.key));

  assert.equal(patterns.length > 0, true);

  for (const pattern of patterns) {
    const generated = dslEngine.generateProblems(pattern, 200);
    assert.equal(generated.length, 200, `${pattern.key} should generate 200 problems`);

    for (const problem of generated) {
      const numericAnswer = Number(problem.answer);
      assert.equal(Number.isInteger(numericAnswer), true, `${pattern.key} produced non-integer answer: ${problem.answer}`);
    }
  }
});
