import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

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
      target: ts.ScriptTarget.ES2020,
      resolveJsonModule: true,
      esModuleInterop: true
    },
    fileName: path.basename(sourcePath)
  });
  fs.writeFileSync(outputPath, transpiled.outputText, "utf8");
};

const writeJsonModule = (jsonPath, outputPath) => {
  const raw = fs.readFileSync(jsonPath, "utf8");
  fs.writeFileSync(outputPath, `export default ${raw};\n`, "utf8");
};

const loadDslEngine = async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "e1-subtraction-constraints-"));

  await transpileTsModule(
    path.join(root, "packages/problem-format/expressionEvaluator.ts"),
    path.join(tempDir, "expressionEvaluator.mjs")
  );
  await transpileTsModule(
    path.join(root, "packages/problem-engine/minimal-dsl.ts"),
    path.join(tempDir, "minimal-dsl.mjs"),
    [['from "packages/problem-format/expressionEvaluator"', 'from "./expressionEvaluator.mjs"']]
  );
  await transpileTsModule(
    path.join(root, "packages/problem-engine/dsl-engine.ts"),
    path.join(tempDir, "dsl-engine.mjs"),
    [
      ['from "packages/problem-format/expressionEvaluator"', 'from "./expressionEvaluator.mjs"'],
      ['from "packages/problem-engine/minimal-dsl"', 'from "./minimal-dsl.mjs"']
    ]
  );

  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/sub-basic.json"), path.join(tempDir, "sub-basic.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/sub-borrow.json"), path.join(tempDir, "sub-borrow.mjs"));

  return {
    dslEngine: await import(`${pathToFileURL(path.join(tempDir, "dsl-engine.mjs")).href}?t=${Date.now()}`),
    subBasicPatterns: (await import(`${pathToFileURL(path.join(tempDir, "sub-basic.mjs")).href}?t=${Date.now()}`)).default,
    subBorrowPatterns: (await import(`${pathToFileURL(path.join(tempDir, "sub-borrow.mjs")).href}?t=${Date.now()}`)).default
  };
};

test("E1_SUB_BASIC generates only one-digit subtraction with answers 0..9", async () => {
  const { dslEngine, subBasicPatterns } = await loadDslEngine();

  for (const pattern of subBasicPatterns.filter((entry) => entry.key.startsWith("E1-SUB-BASIC-"))) {
    const generated = dslEngine.generateProblems(pattern, 50);
    for (const problem of generated) {
      const a = problem.variables?.a;
      const b = problem.variables?.b;
      const answer = Number(problem.answer);
      assert.equal(typeof a, "number", problem.patternKey);
      assert.equal(typeof b, "number", problem.patternKey);
      assert.equal(a >= 0 && a <= 9, true, `${problem.patternKey} a=${a}`);
      assert.equal(b >= 0 && b <= 9, true, `${problem.patternKey} b=${b}`);
      assert.equal(a >= b, true, `${problem.patternKey} ${a}-${b}`);
      assert.equal(answer >= 0 && answer <= 9, true, `${problem.patternKey} answer=${answer}`);
    }
  }
});

test("E1_SUB_BORROW stays within 10..20 and never emits 30+ minuends", async () => {
  const { dslEngine, subBorrowPatterns } = await loadDslEngine();

  for (const pattern of subBorrowPatterns.filter((entry) => entry.key.startsWith("E1-SUB-BORROW-"))) {
    const generated = dslEngine.generateProblems(pattern, 50);
    for (const problem of generated) {
      const a = problem.variables?.a;
      const b = problem.variables?.b;
      assert.equal(typeof a, "number", problem.patternKey);
      assert.equal(typeof b, "number", problem.patternKey);
      assert.equal(a >= 10 && a <= 20, true, `${problem.patternKey} a=${a}`);
      assert.equal(a < 30, true, `${problem.patternKey} a=${a}`);
      assert.equal(a > b, true, `${problem.patternKey} ${a}-${b}`);
      assert.equal(a % 10 < b, true, `${problem.patternKey} ${a}-${b}`);
    }
  }
});
