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

const loadExplanationModule = async () => {
  const os = await import("node:os");
  const { pathToFileURL } = await import("node:url");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "problem-explanation-"));
  const files = [
    "packages/problem-explanation/explanationTypes.ts",
    "packages/problem-explanation/explanationRegistry.ts",
    "packages/problem-explanation/generateExplanation.ts"
  ];

  fs.writeFileSync(path.join(tempDir, "problem-engine-stub.mjs"), "export {};\n", "utf8");

  await transpileTsModule(path.join(root, files[0]), path.join(tempDir, "explanationTypes.mjs"));
  await transpileTsModule(path.join(root, files[1]), path.join(tempDir, "explanationRegistry.mjs"), [
    ['from "packages/problem-engine"', 'from "./problem-engine-stub.mjs"'],
    ['from "./explanationTypes"', 'from "./explanationTypes.mjs"']
  ]);
  await transpileTsModule(path.join(root, files[2]), path.join(tempDir, "generateExplanation.mjs"), [
    ['from "packages/problem-engine"', 'from "./problem-engine-stub.mjs"'],
    ['from "./explanationRegistry"', 'from "./explanationRegistry.mjs"'],
    ['from "./explanationTypes"', 'from "./explanationTypes.mjs"']
  ]);

  return {
    module: await import(`${pathToFileURL(path.join(tempDir, "generateExplanation.mjs")).href}?t=${Date.now()}`),
    registry: await import(`${pathToFileURL(path.join(tempDir, "explanationRegistry.mjs")).href}?t=${Date.now()}`)
  };
};

const expectedE1PatternIds = [
  "E1_NUMBER_COUNT",
  "E1_NUMBER_ORDER",
  "E1_NUMBER_COMPARE",
  "E1_NUMBER_COMPOSE",
  "E1_NUMBER_DECOMPOSE",
  "E1_NUMBER_LINE",
  "E1_ADD_ZERO",
  "E1_ADD_ONE",
  "E1_ADD_DOUBLES",
  "E1_ADD_NEAR_DOUBLES",
  "E1_ADD_BASIC",
  "E1_ADD_10",
  "E1_ADD_CARRY",
  "E1_SUB_BASIC",
  "E1_SUB_FACTS",
  "E1_SUB_BORROW",
  "E1_FACT_FAMILY"
];

test("generateExplanation returns E1 explanation object", async () => {
  const { module: explanationModule } = await loadExplanationModule();
  const explanation = explanationModule.generateExplanation({
    id: "add:test:1",
    question: "8 + 5",
    answer: "13",
    meta: { patternId: "E1_ADD_BASIC" }
  });

  assert.deepEqual(explanation, {
    steps: ["10をつくる", "のこりをたす"],
    summary: "こたえをだす",
    patternId: "E1_ADD_BASIC"
  });
});

test("explanationRegistry covers all E1 pattern ids", async () => {
  const { registry } = await loadExplanationModule();
  assert.deepEqual(Object.keys(registry.explanationRegistry).sort(), [...expectedE1PatternIds].sort());
});

test("generateExplanation falls back for unknown patterns", async () => {
  const { module: explanationModule } = await loadExplanationModule();
  const explanation = explanationModule.generateExplanation({
    id: "unknown:test:1",
    question: "1 + 1",
    answer: "2",
    patternKey: "UNKNOWN-PATTERN-01"
  });

  assert.deepEqual(explanation, {
    steps: ["もういちどかんがえてみよう"],
    summary: "",
    patternId: ""
  });
});
