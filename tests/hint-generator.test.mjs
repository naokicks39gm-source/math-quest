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
  const files = [
    "packages/problem-hint/hintTypes.ts",
    "packages/problem-hint/hintRegistry.ts",
    "packages/problem-hint/generateHint.ts"
  ];

  fs.writeFileSync(path.join(tempDir, "problem-engine-stub.mjs"), "export {};\n", "utf8");

  await transpileTsModule(path.join(root, files[0]), path.join(tempDir, "hintTypes.mjs"));
  await transpileTsModule(path.join(root, files[1]), path.join(tempDir, "hintRegistry.mjs"), [
    ['from "packages/problem-engine"', 'from "./problem-engine-stub.mjs"'],
    ['from "./hintTypes"', 'from "./hintTypes.mjs"']
  ]);
  await transpileTsModule(path.join(root, files[2]), path.join(tempDir, "generateHint.mjs"), [
    ['from "packages/problem-engine"', 'from "./problem-engine-stub.mjs"'],
    ['from "./hintRegistry"', 'from "./hintRegistry.mjs"'],
    ['from "./hintTypes"', 'from "./hintTypes.mjs"']
  ]);

  return import(`${pathToFileURL(path.join(tempDir, "generateHint.mjs")).href}?t=${Date.now()}`);
};

test("generateHint returns E1 hint object from explicit meta patternId", async () => {
  const hintModule = await loadHintModule();
  const hint = hintModule.generateHint({
    id: "count:test:1",
    question: "●●● はいくつ？",
    answer: "3",
    meta: { patternId: "E1_NUMBER_COUNT" }
  });

  assert.deepEqual(hint, {
    text: "いくつある？",
    type: "concept",
    patternId: "E1_NUMBER_COUNT"
  });
});

test("generateHint resolves E1 patternId from patternKey fallback", async () => {
  const hintModule = await loadHintModule();
  const hint = hintModule.generateHint({
    id: "compare:test:1",
    question: "3 と 5",
    answer: "5",
    patternKey: "E1-NUM-COMPARE-01"
  });

  assert.equal(hint.patternId, "E1_NUMBER_COMPARE");
  assert.equal(hint.text, "どちらがおおきい？");
  assert.equal(hint.type, "concept");
});

test("generateHint falls back for unknown patterns", async () => {
  const hintModule = await loadHintModule();
  const hint = hintModule.generateHint({
    id: "unknown:test:1",
    question: "1 + 1",
    answer: "2",
    patternKey: "UNKNOWN-PATTERN-01"
  });

  assert.deepEqual(hint, {
    text: "よくかんがえてみよう",
    type: "concept",
    patternId: ""
  });
});
