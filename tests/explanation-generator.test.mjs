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
  const explanationTemplatesSource = path.join(root, "packages/problem-explanation/explanation-templates.ts");
  const explanationGeneratorSource = path.join(root, "packages/problem-explanation/explanation-generator.ts");
  const explanationTemplatesOutput = path.join(tempDir, "explanation-templates.mjs");
  const explanationGeneratorOutput = path.join(tempDir, "explanation-generator.mjs");
  const problemEngineStubOutput = path.join(tempDir, "problem-engine-stub.mjs");

  fs.writeFileSync(problemEngineStubOutput, "export {};\n", "utf8");

  await transpileTsModule(explanationTemplatesSource, explanationTemplatesOutput);
  await transpileTsModule(explanationGeneratorSource, explanationGeneratorOutput, [
    ['from "packages/problem-engine"', 'from "./problem-engine-stub.mjs"'],
    ['from "packages/problem-explanation/explanation-templates"', 'from "./explanation-templates.mjs"']
  ]);

  return import(`${pathToFileURL(explanationGeneratorOutput).href}?t=${Date.now()}`);
};

test("generateExplanation resolves known pattern key by prefix", async () => {
  const explanationModule = await loadExplanationModule();
  const explanation = explanationModule.generateExplanation({
    id: "E1-ADD-BASIC-01:test:5",
    question: "2 + 3",
    answer: "5",
    patternKey: "E1-ADD-BASIC-01",
    variables: { a: 2, b: 3 }
  });

  assert.equal(explanation, "2 + 3\n\nそのままたします\n\n2 + 3\n=\n5");
});

test("generateExplanation builds multiline make10 explanation when variables are present", async () => {
  const explanationModule = await loadExplanationModule();
  const explanation = explanationModule.generateExplanation({
    id: "E1-ADD-MAKE10:test:10",
    question: "8 + 2",
    answer: "10",
    patternKey: "E1-ADD-MAKE10",
    variables: { a: 8, b: 2 }
  });

  assert.equal(explanation.includes("まず10を作ります"), true);
  assert.equal(explanation.includes("8 + 2 + 0"), true);
  assert.equal(explanation.includes("10 + 0"), true);
  assert.equal(explanation.endsWith("\n10"), true);
});

test("generateExplanation falls back to default explanation for unknown pattern keys", async () => {
  const explanationModule = await loadExplanationModule();
  const explanation = explanationModule.generateExplanation({
    id: "UNKNOWN:test:0",
    question: "1 + 1",
    answer: "2",
    patternKey: "UNKNOWN-PATTERN-01"
  });

  assert.equal(explanation, explanationModule.DEFAULT_EXPLANATION);
});

test("generateExplanation falls back to default explanation when pattern key is missing", async () => {
  const explanationModule = await loadExplanationModule();
  const explanation = explanationModule.generateExplanation({
    id: "missing:test:0",
    question: "1 + 1",
    answer: "2"
  });

  assert.equal(explanation, explanationModule.DEFAULT_EXPLANATION);
});

test("generateExplanation falls back to default explanation when template variables are missing", async () => {
  const explanationModule = await loadExplanationModule();
  const explanation = explanationModule.generateExplanation({
    id: "E1-ADD-MAKE10:test:10",
    question: "8 + 7",
    answer: "10",
    patternKey: "E1-ADD-MAKE10"
  });

  assert.equal(explanation, explanationModule.DEFAULT_EXPLANATION);
});
