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

const loadHintModule = async () => {
  const os = await import("node:os");
  const { pathToFileURL } = await import("node:url");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "problem-hint-"));
  const hintTemplatesSource = path.join(root, "packages/problem-hint/hint-templates.ts");
  const hintGeneratorSource = path.join(root, "packages/problem-hint/hint-generator.ts");
  const hintTemplatesOutput = path.join(tempDir, "hint-templates.mjs");
  const hintGeneratorOutput = path.join(tempDir, "hint-generator.mjs");
  const problemEngineStubOutput = path.join(tempDir, "problem-engine-stub.mjs");

  fs.writeFileSync(problemEngineStubOutput, "export {};\n", "utf8");

  await transpileTsModule(hintTemplatesSource, hintTemplatesOutput);
  await transpileTsModule(hintGeneratorSource, hintGeneratorOutput, [
    ['from "packages/problem-engine"', 'from "./problem-engine-stub.mjs"'],
    ['from "packages/problem-hint/hint-templates"', 'from "./hint-templates.mjs"']
  ]);

  return import(`${pathToFileURL(hintGeneratorOutput).href}?t=${Date.now()}`);
};

test("generateHint resolves known pattern key by prefix", async () => {
  const hintModule = await loadHintModule();
  const hint = hintModule.generateHint({
    id: "J1-LIN-BASIC-01:test:1",
    question: "3x + 2 = 11",
    answer: "3",
    patternKey: "J1-LIN-BASIC-01",
    variables: { a: 3, b: 2, c: 11, x: 3 }
  });

  assert.equal(hint, "x を求めるために移項しましょう");
});

test("generateHint builds multiline make10 hint when variables are present", async () => {
  const hintModule = await loadHintModule();
  const hint = hintModule.generateHint({
    id: "E1-ADD-MAKE10:test:10",
    question: "8 + 7",
    answer: "10",
    patternKey: "E1-ADD-MAKE10",
    variables: { a: 8, b: 2 }
  });

  assert.equal(hint.includes("まず10を作ります"), true);
  assert.equal(hint.includes("8 + 2"), true);
  assert.equal(hint.includes("8 + 2 + 0"), true);
});

test("generateHint falls back to default hint for unknown pattern keys", async () => {
  const hintModule = await loadHintModule();
  const hint = hintModule.generateHint({
    id: "UNKNOWN:test:0",
    question: "1 + 1",
    answer: "2",
    patternKey: "UNKNOWN-PATTERN-01"
  });

  assert.equal(hint, hintModule.DEFAULT_HINT);
});

test("generateHint falls back to default hint when pattern key is missing", async () => {
  const hintModule = await loadHintModule();
  const hint = hintModule.generateHint({
    id: "missing:test:0",
    question: "1 + 1",
    answer: "2"
  });

  assert.equal(hint, hintModule.DEFAULT_HINT);
});

test("generateHint falls back to default hint when template variables are missing", async () => {
  const hintModule = await loadHintModule();
  const hint = hintModule.generateHint({
    id: "E1-ADD-MAKE10:test:10",
    question: "8 + 7",
    answer: "10",
    patternKey: "E1-ADD-MAKE10"
  });

  assert.equal(hint, hintModule.DEFAULT_HINT);
});
