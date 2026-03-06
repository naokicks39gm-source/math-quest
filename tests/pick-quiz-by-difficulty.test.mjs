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

const loadPickQuizModule = async () => {
  const os = await import("node:os");
  const { pathToFileURL } = await import("node:url");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "problem-stock-"));
  const pickerSource = path.join(root, "packages/problem-stock/pickQuizByDifficulty.ts");
  const pickerOutput = path.join(tempDir, "pickQuizByDifficulty.mjs");

  await transpileTsModule(pickerSource, pickerOutput, [
    ['from "packages/problem-engine"', 'from "./problem-engine-stub.mjs"']
  ]);
  fs.writeFileSync(path.join(tempDir, "problem-engine-stub.mjs"), "export {};\n", "utf8");

  return import(`${pathToFileURL(pickerOutput).href}?t=${Date.now()}`);
};

const makeProblem = (id, difficulty) => ({
  id,
  question: `${id} =`,
  answer: id,
  meta: difficulty === undefined ? undefined : { difficulty }
});

test("picker prioritizes smaller difficulty distance first", async () => {
  const { pickQuizByDifficulty } = await loadPickQuizModule();
  const stock = [
    makeProblem("d1", 1),
    makeProblem("d2", 2),
    makeProblem("d3a", 3),
    makeProblem("d3b", 3),
    makeProblem("d4", 4),
    makeProblem("d5", 5)
  ];

  const picked = pickQuizByDifficulty(stock, 3, 5);
  const pickedDifficulties = picked.map((item) => item.meta?.difficulty ?? 3);
  const pickedDistances = pickedDifficulties.map((difficulty) => Math.abs(difficulty - 3));

  assert.equal(picked.length, 5);
  assert.deepEqual(pickedDistances.sort((a, b) => a - b), [0, 0, 1, 1, 2]);
  assert.equal(pickedDifficulties.filter((difficulty) => difficulty === 3).length, 2);
});

test("picker treats missing difficulty as 3 and avoids duplicate ids", async () => {
  const { pickQuizByDifficulty } = await loadPickQuizModule();
  const stock = [
    makeProblem("same-id", 3),
    makeProblem("same-id", 2),
    makeProblem("fallback-meta", undefined),
    makeProblem("far", 5)
  ];

  const picked = pickQuizByDifficulty(stock, 3, 3);

  assert.equal(new Set(picked.map((item) => item.id)).size, picked.length);
  assert.equal(picked.some((item) => item.id === "fallback-meta"), true);
});

test("picker shuffles whole stock when stock size is smaller than count", async () => {
  const { pickQuizByDifficulty } = await loadPickQuizModule();
  const sequence = [0.9, 0.1, 0.6, 0.2];
  let index = 0;
  const rng = () => {
    const next = sequence[index] ?? sequence[sequence.length - 1];
    index += 1;
    return next;
  };

  const stock = [makeProblem("a", 1), makeProblem("b", 2), makeProblem("c", 3)];
  const picked = pickQuizByDifficulty(stock, 3, 5, rng);

  assert.equal(picked.length, 3);
  assert.notDeepEqual(picked.map((item) => item.id), ["a", "b", "c"]);
});

test("picker returns empty array for invalid input or non-positive count", async () => {
  const { pickQuizByDifficulty } = await loadPickQuizModule();
  assert.deepEqual(pickQuizByDifficulty([], 3, 5), []);
  assert.deepEqual(pickQuizByDifficulty([], 3, 0), []);
  assert.deepEqual(pickQuizByDifficulty(null, 3, 5), []);
});

test("picker clamps out-of-range difficulty values before bucketing", async () => {
  const { pickQuizByDifficulty } = await loadPickQuizModule();
  const stock = [
    makeProblem("too-low", -10),
    makeProblem("valid", 3),
    makeProblem("too-high", 99)
  ];

  const picked = pickQuizByDifficulty(stock, 3, 3, () => 0);
  const pickedIds = picked.map((item) => item.id);

  assert.equal(pickedIds[0], "valid");
  assert.equal(pickedIds.includes("too-low"), true);
  assert.equal(pickedIds.includes("too-high"), true);
});
