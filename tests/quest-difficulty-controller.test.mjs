import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const transpileTsModule = async (sourcePath, outputPath) => {
  const tsModule = await import("typescript");
  const ts = tsModule.default ?? tsModule;
  const source = fs.readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2020,
      target: ts.ScriptTarget.ES2020
    },
    fileName: path.basename(sourcePath)
  });
  fs.writeFileSync(outputPath, transpiled.outputText, "utf8");
};

const loadControllerModule = async () => {
  const os = await import("node:os");
  const { pathToFileURL } = await import("node:url");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "quest-difficulty-controller-"));
  const sourcePath = path.join(root, "src/lib/questDifficultyController.ts");
  const outputPath = path.join(tempDir, "questDifficultyController.mjs");

  await transpileTsModule(sourcePath, outputPath);
  return import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);
};

test("initial student state starts at medium difficulty with empty streaks", async () => {
  const { createInitialStudentState } = await loadControllerModule();

  assert.deepEqual(createInitialStudentState(), {
    difficulty: 3,
    correctStreak: 0,
    wrongStreak: 0
  });
});

test("three consecutive correct answers increase difficulty and reset only correct streak", async () => {
  const { updateDifficulty } = await loadControllerModule();
  const state = { difficulty: 3, correctStreak: 2, wrongStreak: 0 };

  const updated = updateDifficulty(state, true);

  assert.notEqual(updated, state);
  assert.deepEqual(state, { difficulty: 3, correctStreak: 2, wrongStreak: 0 });
  assert.deepEqual(updated, { difficulty: 4, correctStreak: 0, wrongStreak: 0 });
});

test("two consecutive wrong answers decrease difficulty and reset only wrong streak", async () => {
  const { updateDifficulty } = await loadControllerModule();
  const state = { difficulty: 4, correctStreak: 0, wrongStreak: 1 };

  const updated = updateDifficulty(state, false);

  assert.notEqual(updated, state);
  assert.deepEqual(state, { difficulty: 4, correctStreak: 0, wrongStreak: 1 });
  assert.deepEqual(updated, { difficulty: 3, correctStreak: 0, wrongStreak: 0 });
});

test("mixed answers reset the opposite streak before thresholds are reached", async () => {
  const { updateDifficulty } = await loadControllerModule();
  const state = { difficulty: 3, correctStreak: 2, wrongStreak: 0 };

  const afterWrong = updateDifficulty(state, false);
  assert.deepEqual(state, { difficulty: 3, correctStreak: 2, wrongStreak: 0 });
  assert.deepEqual(afterWrong, { difficulty: 3, correctStreak: 0, wrongStreak: 1 });

  const afterCorrect = updateDifficulty(afterWrong, true);
  assert.deepEqual(afterWrong, { difficulty: 3, correctStreak: 0, wrongStreak: 1 });
  assert.deepEqual(afterCorrect, { difficulty: 3, correctStreak: 1, wrongStreak: 0 });
});

test("difficulty stays within the 1 to 5 bounds", async () => {
  const { updateDifficulty } = await loadControllerModule();
  const maxState = { difficulty: 5, correctStreak: 2, wrongStreak: 0 };
  const minState = { difficulty: 1, correctStreak: 0, wrongStreak: 1 };

  const maxUpdated = updateDifficulty(maxState, true);
  const minUpdated = updateDifficulty(minState, false);

  assert.deepEqual(maxState, { difficulty: 5, correctStreak: 2, wrongStreak: 0 });
  assert.deepEqual(minState, { difficulty: 1, correctStreak: 0, wrongStreak: 1 });
  assert.deepEqual(maxUpdated, { difficulty: 5, correctStreak: 0, wrongStreak: 0 });
  assert.deepEqual(minUpdated, { difficulty: 1, correctStreak: 0, wrongStreak: 0 });
});
