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

const loadDslModule = async () => {
  const os = await import("node:os");
  const { pathToFileURL } = await import("node:url");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "problem-engine-dsl-"));
  const evaluatorSource = path.join(root, "packages/problem-format/expressionEvaluator.ts");
  const dslSource = path.join(root, "packages/problem-engine/dsl-engine.ts");
  const evaluatorOutput = path.join(tempDir, "expressionEvaluator.mjs");
  const dslOutput = path.join(tempDir, "dsl-engine.mjs");

  await transpileTsModule(evaluatorSource, evaluatorOutput);
  await transpileTsModule(dslSource, dslOutput, [
    ['from "packages/problem-format/expressionEvaluator"', 'from "./expressionEvaluator.mjs"'],
    ['from "packages/problem-engine/minimal-dsl"', 'from "./minimal-dsl.mjs"']
  ]);
  await transpileTsModule(path.join(root, "packages/problem-engine/minimal-dsl.ts"), path.join(tempDir, "minimal-dsl.mjs"), [
    ['from "packages/problem-format/expressionEvaluator"', 'from "./expressionEvaluator.mjs"']
  ]);

  return import(`${pathToFileURL(dslOutput).href}?t=${Date.now()}`);
};

test("generated problems always include difficulty in the 1-5 range", async () => {
  const dsl = await loadDslModule();
  const generated = dsl.generateProblem({
    key: "ADD_RANGE",
    template: "{a} + {b} =",
    variables: {
      a: [1, 9],
      b: [1, 9]
    },
    answer: "a + b"
  });

  assert.equal(typeof generated.meta?.difficulty, "number");
  assert.equal(generated.meta.difficulty >= 1 && generated.meta.difficulty <= 5, true);
});

test("small arithmetic stays easier than linear equations", async () => {
  const dsl = await loadDslModule();
  const easy = dsl.generateProblem({
    key: "ADD_SMALL",
    template: "{a} + {b} =",
    variables: {
      a: [3, 3],
      b: [4, 4]
    },
    answer: "a + b"
  });
  const linear = dsl.generateProblem({
    key: "LINEAR_BASIC",
    template: "{a}x + {b} = {c}",
    variables: {
      a: [3, 3],
      b: [5, 5],
      c: [20, 20],
      x: [5, 5]
    },
    constraints: ["c == a * x + b"],
    answer: "x"
  });

  assert.equal(easy.meta?.difficulty < linear.meta?.difficulty, true);
});

test("quadratic expressions rank at the high end", async () => {
  const dsl = await loadDslModule();
  const quadratic = dsl.generateProblem({
    key: "QUAD_HIGH",
    template: "x^2 + {b}x + {c} = 0",
    variables: {
      b: [5, 5],
      c: [6, 6]
    },
    answer: "0"
  });

  assert.equal(quadratic.meta?.difficulty >= 3, true);
  assert.equal(quadratic.meta?.difficulty <= 5, true);
});
