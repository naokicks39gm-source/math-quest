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
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pattern-catalog-"));

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

test("pattern catalogs exist under problem-engine", () => {
  const catalogDir = path.join(root, "packages/problem-engine/patterns");
  assert.equal(fs.existsSync(catalogDir), true);
  for (const name of [
    "E1/add-basic.json",
    "E1/sub-basic.json",
    "E1/mul-basic.json",
    "E1/div-basic.json",
    "J1/linear-basic.json",
    "J1/expand-basic.json",
    "J1/factor-basic.json",
    "H1/quadratic-basic.json",
    "H1/discriminant-basic.json"
  ]) {
    assert.equal(fs.existsSync(path.join(catalogDir, name)), true);
  }
});

test("pattern catalog loader can load all patterns in a level directory", async () => {
  const { adapters } = await loadProblemEngineModules();
  const catalog = adapters.loadPatternCatalog("E1");
  assert.equal(Array.isArray(catalog), true);
  assert.equal(catalog.length > 1, true);
  assert.equal(catalog[0].key, "E1-ADD-01");
});

test("loaded catalog entries follow minimal DSL shape", async () => {
  const { adapters } = await loadProblemEngineModules();
  const pattern = adapters.loadPatternCatalog("J1").find((entry) => entry.key === "J1-LIN-01");
  assert.notEqual(pattern, undefined);
  assert.equal(typeof pattern.key, "string");
  assert.equal(typeof pattern.template, "string");
  assert.equal(typeof pattern.answer, "string");
  assert.deepEqual(Object.keys(pattern.variables).sort(), ["a", "b", "c", "x"]);
  assert.equal(Array.isArray(pattern.constraints), true);
});

test("generateProblems can generate questions from loaded catalog patterns", async () => {
  const { adapters, dslEngine } = await loadProblemEngineModules();
  const [pattern] = adapters.loadPatternCatalog("E1");
  const generated = dslEngine.generateProblems(pattern, 3);
  assert.equal(generated.length, 3);
  for (const item of generated) {
    assert.equal(typeof item.question, "string");
    assert.equal(typeof item.answer, "string");
    assert.equal(item.patternKey, pattern.key);
  }
});
