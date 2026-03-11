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

const withMockedWindow = (initialValue, callback) => {
  const storage = new Map();
  if (initialValue !== undefined) {
    storage.set("mathquest_learning_state", initialValue);
  }

  const previousWindow = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
      removeItem(key) {
        storage.delete(key);
      }
    }
  };

  try {
    return callback(storage);
  } finally {
    globalThis.window = previousWindow;
  }
};

const localModuleReplacements = [
  ['from "./studentTypes"', 'from "./studentTypes.mjs"'],
  ['from "./patternProgressTypes"', 'from "./patternProgressTypes.mjs"'],
  ['from "./skillProgressTypes"', 'from "./skillProgressTypes.mjs"'],
  ['from "./sessionTypes"', 'from "./sessionTypes.mjs"'],
  ['from "./studentStore"', 'from "./studentStore.mjs"'],
  ['from "./patternProgressTracker"', 'from "./patternProgressTracker.mjs"'],
  ['from "./skillProgressTracker"', 'from "./skillProgressTracker.mjs"'],
  ['from "./difficultyController"', 'from "./difficultyController.mjs"'],
  ['from "./weaknessAnalyzer"', 'from "./weaknessAnalyzer.mjs"'],
  ['from "./sessionBuilder"', 'from "./sessionBuilder.mjs"'],
  ['from "./learningEngine"', 'from "./learningEngine.mjs"']
];

const createSkillSystemStub = (outputPath) => {
  fs.writeFileSync(
    outputPath,
    [
      'const skillPatterns = {',
      '  E1_ADD_BASIC: ["E1_ADD_BASIC"],',
      '  E1_ADD_10: ["E1_ADD_10"],',
      '  E1_ADD_CARRY: ["E1_ADD_CARRY"],',
      '  E1_SUB_BASIC: ["E1_SUB_BASIC"],',
      '  E1_SUB_BORROW: ["E1_SUB_BORROW"],',
      '  E2_ADD_2DIGIT: ["E2_ADD_2DIGIT"],',
      '  E2_SUB_2DIGIT: ["E2_SUB_2DIGIT"],',
      '  H1_BINOMIAL: ["EXPAND_BINOMIAL_BASIC"]',
      "};",
      "export const getPatterns = (skillId) => {",
      "  const patterns = skillPatterns[skillId];",
      '  if (!patterns) throw new Error("Skill not found");',
      "  return patterns;",
      "};"
    ].join("\n"),
    "utf8"
  );
};

const createProblemEngineStub = (outputPath) => {
  fs.writeFileSync(
    outputPath,
    [
      "const difficultyByPattern = {",
      '  "E1-ADD-BASIC-01": 1,',
      '  "E1-ADD-BASIC-02": 1,',
      '  "E1-ADD-BASIC-03": 1,',
      '  "E1-ADD-BASIC-04": 1,',
      '  "E1-ADD-BASIC-05": 2,',
      '  "E1-ADD-MAKE10-01": 2,',
      '  "E1-ADD-MAKE10-02": 2,',
      '  "E1-ADD-MAKE10-03": 2,',
      '  "E1-ADD-MAKE10-04": 2,',
      '  "E1-ADD-MAKE10-05": 2,',
      '  "E1-ADD-CARRY-01": 2,',
      '  "E1-ADD-CARRY-02": 2,',
      '  "E1-ADD-CARRY-03": 3,',
      '  "E1-ADD-CARRY-04": 3,',
      '  "E1-ADD-CARRY-05": 3',
      "};",
      "export const getPatternMeta = (key) =>",
      "  difficultyByPattern[key] ? { key, difficulty: difficultyByPattern[key] } : undefined;",
      "export const generateProblems = (pattern, count) =>",
      "  Array.from({ length: count }, (_, index) => ({",
      '    id: `${pattern.key}::${index}`,',
      '    question: `${pattern.key} question ${index}`,',
      '    answer: `${index}`,',
      "    meta: { difficulty: difficultyByPattern[pattern.key] ?? 2 }",
      "  }));"
    ].join("\n"),
    "utf8"
  );
};

const loadLearningEngineModules = async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "learning-engine-"));
  const learningRoot = path.join(root, "packages/learning-engine");

  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/add-basic.json"), path.join(tempDir, "add-basic.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/add-make10.json"), path.join(tempDir, "add-make10.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/add-carry.json"), path.join(tempDir, "add-carry.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/sub-basic.json"), path.join(tempDir, "sub-basic.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/sub-borrow.json"), path.join(tempDir, "sub-borrow.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E2/add-2digit.json"), path.join(tempDir, "add-2digit.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E2/sub-2digit.json"), path.join(tempDir, "sub-2digit.mjs"));
  writeJsonModule(path.join(root, "packages/skill-system/skills.json"), path.join(tempDir, "skills.mjs"));
  createSkillSystemStub(path.join(tempDir, "skill-system.mjs"));
  createProblemEngineStub(path.join(tempDir, "problem-engine.mjs"));

  const sharedReplacements = [
    ...localModuleReplacements,
    ['from "packages/problem-engine"', 'from "./problem-engine.mjs"'],
    ['from "packages/skill-system"', 'from "./skill-system.mjs"'],
    ['from "packages/skill-system/skills.json"', 'from "./skills.mjs"'],
    ['from "packages/problem-engine/patterns/E1/add-basic.json"', 'from "./add-basic.mjs"'],
    ['from "packages/problem-engine/patterns/E1/add-make10.json"', 'from "./add-make10.mjs"'],
    ['from "packages/problem-engine/patterns/E1/add-carry.json"', 'from "./add-carry.mjs"'],
    ['from "packages/problem-engine/patterns/E1/sub-basic.json"', 'from "./sub-basic.mjs"'],
    ['from "packages/problem-engine/patterns/E1/sub-borrow.json"', 'from "./sub-borrow.mjs"'],
    ['from "packages/problem-engine/patterns/E2/add-2digit.json"', 'from "./add-2digit.mjs"'],
    ['from "packages/problem-engine/patterns/E2/sub-2digit.json"', 'from "./sub-2digit.mjs"']
  ];

  const modules = [
    "studentTypes",
    "patternProgressTypes",
    "skillProgressTypes",
    "sessionTypes",
    "studentStore",
    "patternProgressTracker",
    "skillProgressTracker",
    "difficultyController",
    "weaknessAnalyzer",
    "sessionBuilder",
    "learningEngine",
    "index"
  ];

  for (const moduleName of modules) {
    await transpileTsModule(
      path.join(learningRoot, `${moduleName}.ts`),
      path.join(tempDir, `${moduleName}.mjs`),
      sharedReplacements
    );
  }

  const load = (moduleName) => import(`${pathToFileURL(path.join(tempDir, `${moduleName}.mjs`)).href}?t=${Date.now()}`);

  return {
    studentStore: await load("studentStore"),
    trackers: await load("patternProgressTracker"),
    skillTrackers: await load("skillProgressTracker"),
    difficulty: await load("difficultyController"),
    sessionBuilder: await load("sessionBuilder"),
    learningEngine: await load("learningEngine"),
    index: await load("index")
  };
};

test("studentStore only exposes client load and serialize helpers", async () => {
  const { studentStore } = await loadLearningEngineModules();

  assert.equal(typeof studentStore.loadStateFromClient, "function");
  assert.equal(typeof studentStore.serializeState, "function");
  assert.equal(typeof studentStore.createLearningState, "function");
  assert.equal(typeof studentStore.updateXP, "function");
  assert.equal(typeof studentStore.loadState, "undefined");
  assert.equal(typeof studentStore.saveState, "undefined");

  await withMockedWindow("{bad-json", () => {
    const initial = studentStore.loadStateFromClient();
    assert.equal(initial.version, 1);
    assert.equal(initial.engineVersion, 1);
    assert.equal(initial.student.difficulty, 1);
    const serialized = studentStore.serializeState({
      ...initial,
      student: { ...initial.student, difficulty: 2 }
    });
    assert.equal(serialized.version, 1);
    assert.equal(serialized.engineVersion, 1);
    assert.equal(serialized.student.difficulty, 2);
  });

  await withMockedWindow(
    JSON.stringify({
      version: 99,
      engineVersion: 1,
      student: { difficulty: 4, correctStreak: 0, wrongStreak: 0, solved: 10, correct: 9, xpTotal: 0, xpSession: 0, level: 1 },
      patternProgress: {},
      skillProgress: {}
    }),
    () => {
      const reset = studentStore.loadStateFromClient();
      assert.equal(reset.version, 1);
      assert.equal(reset.engineVersion, 1);
      assert.equal(reset.student.difficulty, 1);
      assert.deepEqual(reset.patternProgress, {});
    }
  );

  await withMockedWindow(
    JSON.stringify({
      version: 1,
      engineVersion: 99,
      student: { difficulty: 4, correctStreak: 0, wrongStreak: 0, solved: 10, correct: 9, xpTotal: 0, xpSession: 0, level: 1 },
      patternProgress: {},
      skillProgress: {}
    }),
    () => {
      const reset = studentStore.loadStateFromClient();
      assert.equal(reset.version, 1);
      assert.equal(reset.engineVersion, 1);
      assert.equal(reset.student.difficulty, 1);
      assert.deepEqual(reset.patternProgress, {});
    }
  );

  const mismatchedVersion = studentStore.serializeState({
    version: 2,
    engineVersion: 1,
    student: { difficulty: 4, correctStreak: 0, wrongStreak: 0, solved: 5, correct: 5, xpTotal: 0, xpSession: 0, level: 1 },
    patternProgress: {
      "E1-ADD-BASIC-01": { patternKey: "E1-ADD-BASIC-01", attempts: 4, correct: 3, mastery: 0.75, lastSeenAt: 100 }
    },
    skillProgress: {}
  });
  assert.equal(mismatchedVersion.version, 1);
  assert.equal(mismatchedVersion.engineVersion, 1);
  assert.equal(mismatchedVersion.student.difficulty, 1);
  assert.deepEqual(mismatchedVersion.patternProgress, {});

  const mismatchedEngineVersion = studentStore.serializeState({
    version: 1,
    engineVersion: 2,
    student: { difficulty: 4, correctStreak: 0, wrongStreak: 0, solved: 5, correct: 5, xpTotal: 0, xpSession: 0, level: 1 },
    patternProgress: {
      "E1-ADD-BASIC-01": { patternKey: "E1-ADD-BASIC-01", attempts: 4, correct: 3, mastery: 0.75, lastSeenAt: 100 }
    },
    skillProgress: {}
  });
  assert.equal(mismatchedEngineVersion.version, 1);
  assert.equal(mismatchedEngineVersion.engineVersion, 1);
  assert.equal(mismatchedEngineVersion.student.difficulty, 1);
  assert.deepEqual(mismatchedEngineVersion.patternProgress, {});

  const source = fs.readFileSync(path.join(root, "packages/learning-engine/studentStore.ts"), "utf8");
  assert.equal(source.includes("__mathquestLearningStateStorage"), false);
  assert.equal(source.includes("version: number"), true);
  assert.equal(source.includes("engineVersion: number"), true);
  assert.equal(source.includes("CURRENT_ENGINE_VERSION = 1"), true);
  assert.equal(source.includes("value.version !== LEARNING_STATE_VERSION"), true);
  assert.equal(source.includes("value.engineVersion !== CURRENT_ENGINE_VERSION"), true);
  assert.equal(source.includes("export function updateXP"), true);
  const xpUpdated = studentStore.updateXP(
    { difficulty: 1, correctStreak: 0, wrongStreak: 0, solved: 0, correct: 0, xpTotal: 5, xpSession: 0, level: 1 },
    2
  );
  assert.equal(xpUpdated.xpTotal, 25);
  assert.equal(xpUpdated.xpSession, 20);
  assert.equal(xpUpdated.level, 2);
  assert.equal(studentStore.computeLevel(0), 1);
  assert.equal(studentStore.computeLevel(10), 2);
});

test("progress tracker and difficulty controller update only the expected fields", async () => {
  const { trackers, difficulty } = await loadLearningEngineModules();

  const first = trackers.updatePatternProgress("E1-ADD-BASIC-01", true, undefined, () => 100);
  const second = trackers.updatePatternProgress("E1-ADD-BASIC-01", false, first, () => 200);
  const raised = difficulty.updateDifficulty(
    { difficulty: 2, correctStreak: 2, wrongStreak: 0, solved: 0, correct: 0, xp: 0, level: 0 },
    true
  );
  const lowered = difficulty.updateDifficulty(
    { difficulty: 1, correctStreak: 0, wrongStreak: 1, solved: 0, correct: 0, xp: 0, level: 0 },
    false
  );

  assert.deepEqual(first, {
    patternKey: "E1-ADD-BASIC-01",
    attempts: 1,
    correct: 1,
    mastery: 2 / 3,
    lastSeenAt: 100
  });
  assert.deepEqual(second, {
    patternKey: "E1-ADD-BASIC-01",
    attempts: 2,
    correct: 1,
    mastery: 0.5,
    lastSeenAt: 200
  });
  assert.equal(raised.difficulty, 3);
  assert.equal(lowered.difficulty, 1);
});

test("skill mastery derives from attempted pattern masteries", async () => {
  const { skillTrackers } = await loadLearningEngineModules();

  assert.equal(skillTrackers.computeSkillMastery([]), 0);
  assert.equal(skillTrackers.computeSkillMastery([0.9, 0.7, 0.8]), 0.8);
  assert.equal(skillTrackers.computeSkillMastery([0.6, 0.8, 1, 0.9]), 0.8500000000000001);
  assert.equal(skillTrackers.computeSkillMastery([0.9, 0.55, 0.8]), 0.55);

  const updated = skillTrackers.updateSkillProgress(
    { skillId: "E1_ADD_BASIC", mastery: 0.75, mastered: true },
    "E1_ADD_BASIC",
    [0.9, 0.7, 0.8]
  );

  assert.deepEqual(updated, {
    skillId: "E1_ADD_BASIC",
    mastery: 0.8,
    mastered: true
  });
});

test("weakness detection uses attempts >= 2 and mastery < 0.7", async () => {
  const { studentStore, learningEngine } = await loadLearningEngineModules();
  const state = studentStore.serializeState({
    version: 1,
    engineVersion: 1,
    student: { difficulty: 1, correctStreak: 0, wrongStreak: 0, solved: 0, correct: 0, xp: 0, level: 0 },
    patternProgress: {
      "E1-ADD-BASIC-01": { patternKey: "E1-ADD-BASIC-01", attempts: 2, correct: 1, mastery: 2 / 4, lastSeenAt: 100 },
      "E1-ADD-BASIC-02": { patternKey: "E1-ADD-BASIC-02", attempts: 1, correct: 0, mastery: 1 / 3, lastSeenAt: 200 },
      "E1-ADD-BASIC-03": { patternKey: "E1-ADD-BASIC-03", attempts: 2, correct: 2, mastery: 3 / 4, lastSeenAt: 300 }
    },
    skillProgress: {}
  });

  assert.deepEqual(learningEngine.recommendNextAction(state), {
    type: "skill",
    skillId: "E1_ADD_BASIC",
    reason: "next_skill"
  });

  const adaptiveState = studentStore.serializeState({
    ...state,
    patternProgress: {
      ...state.patternProgress,
      "E1-ADD-BASIC-03": { patternKey: "E1-ADD-BASIC-03", attempts: 2, correct: 0, mastery: 1 / 4, lastSeenAt: 400 }
    }
  });

  assert.deepEqual(learningEngine.recommendNextAction(adaptiveState), {
    type: "adaptive",
    reason: "weak_patterns",
    weakPatterns: 2
  });
});

test("sessionBuilder creates a five-problem session from explicit state", async () => {
  const { studentStore, sessionBuilder } = await loadLearningEngineModules();
  const state = studentStore.serializeState({
    version: 1,
    engineVersion: 1,
    student: { difficulty: 1, correctStreak: 0, wrongStreak: 0, solved: 0, correct: 0, xp: 0, level: 0 },
    patternProgress: {
      "E1-ADD-BASIC-01": { patternKey: "E1-ADD-BASIC-01", attempts: 5, correct: 1, mastery: 0.2, lastSeenAt: 100 },
      "E1-ADD-BASIC-03": { patternKey: "E1-ADD-BASIC-03", attempts: 3, correct: 1, mastery: 0.3333333333333333, lastSeenAt: 300 }
    },
    skillProgress: {
      E1_ADD_BASIC: { skillId: "E1_ADD_BASIC", mastery: 0, mastered: false }
    }
  });

  const session = sessionBuilder.buildSession(state, "E1_ADD_BASIC", 1);

  assert.equal(session.problems.length, 5);
  assert.equal(session.startedDifficulty, 1);
  assert.equal(session.problems.every((problem) => Math.abs(problem.difficulty - 1) <= 1), true);
  assert.equal(session.problems.some((problem) => problem.source === "weakness"), true);
});

test("sessionBuilder computes targetDifficulty from skillProgress mastery", async () => {
  const { studentStore, sessionBuilder } = await loadLearningEngineModules();

  assert.equal(sessionBuilder.computeTargetDifficulty(0), 1);
  assert.equal(sessionBuilder.computeTargetDifficulty(0.39), 2);
  assert.equal(sessionBuilder.computeTargetDifficulty(0.6), 4);
  assert.equal(sessionBuilder.computeTargetDifficulty(0.85), 5);

  const highMasteryState = studentStore.serializeState({
    version: 1,
    engineVersion: 1,
    student: { difficulty: 1, correctStreak: 0, wrongStreak: 0, solved: 0, correct: 0, xp: 0, level: 0 },
    patternProgress: {},
    skillProgress: {
      E1_ADD_BASIC: { skillId: "E1_ADD_BASIC", mastery: 0.85, mastered: false }
    }
  });

  const session = sessionBuilder.buildSession(highMasteryState, "E1_ADD_BASIC", 1);
  assert.equal(session.startedDifficulty, 5);
  assert.equal(session.problems.length, 5);
});

test("sessionBuilder computes recency and pattern priority from mastery and lastSeenAt", async () => {
  const { studentStore, sessionBuilder } = await loadLearningEngineModules();
  const nowMs = 3_600_000;
  const state = studentStore.serializeState({
    version: 1,
    engineVersion: 1,
    student: { difficulty: 1, correctStreak: 0, wrongStreak: 0, solved: 0, correct: 0, xp: 0, level: 0 },
    patternProgress: {
      "E1-ADD-BASIC-01": { patternKey: "E1-ADD-BASIC-01", attempts: 3, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 3_600_000 },
      "E1-ADD-BASIC-02": { patternKey: "E1-ADD-BASIC-02", attempts: 3, correct: 2, mastery: 0.7, lastSeenAt: nowMs - 600_000 },
      "E1-ADD-BASIC-03": { patternKey: "E1-ADD-BASIC-03", attempts: 0, correct: 0, mastery: 0, lastSeenAt: 0 }
    },
    skillProgress: {}
  });

  assert.deepEqual(sessionBuilder.PRIORITY_WEIGHTS, {
    mastery: 0.5,
    recency: 0.3,
    difficulty: 0.2
  });
  assert.equal(sessionBuilder.computeDifficultyScore(1, 1), 1);
  assert.equal(sessionBuilder.computeDifficultyScore(3, 1), 0.5);
  assert.equal(sessionBuilder.computeDifficultyScore(5, 1), 0);
  assert.equal(sessionBuilder.computeRecencyScore(nowMs - 3_600_000, nowMs), 1);
  assert.equal(sessionBuilder.computeRecencyScore(nowMs - 600_000, nowMs), 600_000 / 3_600_000);
  assert.equal(sessionBuilder.computeRecencyScore(0, nowMs), 1);
  assert.equal(sessionBuilder.computeRecencyScore(nowMs + 10_000, nowMs), 0);

  const weakerPriority = sessionBuilder.computePatternPriority("E1-ADD-BASIC-01", state, nowMs, 1);
  const strongerRecentPriority = sessionBuilder.computePatternPriority("E1-ADD-BASIC-02", state, nowMs, 1);
  const unseenPriority = sessionBuilder.computePatternPriority("E1-ADD-BASIC-03", state, nowMs, 1);

  assert.equal(weakerPriority > strongerRecentPriority, true);
  assert.equal(unseenPriority > weakerPriority, true);
  assert.equal(sessionBuilder.recencyPenalty("E1-ADD-BASIC-01", state, nowMs), 0);
  assert.equal(sessionBuilder.recencyPenalty("E1-ADD-BASIC-02", state, nowMs), 100);
  assert.equal(sessionBuilder.recencyPenalty("E1-ADD-BASIC-03", state, nowMs), 0);
});

test("sessionBuilder sorts patterns by weakness before applying priority tiebreaks", async () => {
  const { studentStore, sessionBuilder } = await loadLearningEngineModules();
  const nowMs = 30_000_000;
  const state = studentStore.serializeState({
    version: 1,
    engineVersion: 1,
    student: { difficulty: 1, correctStreak: 0, wrongStreak: 0, solved: 0, correct: 0, xp: 0, level: 0 },
    patternProgress: {
      "E1-ADD-BASIC-01": { patternKey: "E1-ADD-BASIC-01", attempts: 3, correct: 3, mastery: 0.9, lastSeenAt: nowMs - 3_600_000 },
      "E1-ADD-BASIC-02": { patternKey: "E1-ADD-BASIC-02", attempts: 3, correct: 1, mastery: 0.2, lastSeenAt: nowMs - 3_600_000 },
      "E1-ADD-BASIC-03": { patternKey: "E1-ADD-BASIC-03", attempts: 3, correct: 1, mastery: 0.3, lastSeenAt: nowMs - 3_600_000 }
    },
    skillProgress: {}
  });

  const highMasteryPriority = sessionBuilder.computePatternPriority("E1-ADD-BASIC-01", state, nowMs, 1);
  const lowMasteryPriority = sessionBuilder.computePatternPriority("E1-ADD-BASIC-02", state, nowMs, 1);
  assert.equal(lowMasteryPriority > highMasteryPriority, true);

  const source = fs.readFileSync(path.join(root, "packages/learning-engine/sessionBuilder.ts"), "utf8");
  assert.equal(source.includes("const sortPatternsByWeakness"), true);
  assert.equal(source.includes('"weakPatterns"'), true);
  assert.equal(source.includes('"patternRecency"'), true);
});

test("sessionBuilder lowers priority for very recent patterns with similar mastery", async () => {
  const { studentStore, sessionBuilder } = await loadLearningEngineModules();
  const nowMs = 40_000_000;
  const state = studentStore.serializeState({
    version: 1,
    engineVersion: 1,
    student: { difficulty: 1, correctStreak: 0, wrongStreak: 0, solved: 0, correct: 0, xp: 0, level: 0 },
    patternProgress: {
      "E1-ADD-BASIC-01": { patternKey: "E1-ADD-BASIC-01", attempts: 3, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 5 * 60 * 1000 },
      "E1-ADD-BASIC-02": { patternKey: "E1-ADD-BASIC-02", attempts: 3, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 60 * 60 * 1000 }
    },
    skillProgress: {}
  });

  const recentScore =
    sessionBuilder.computePatternPriority("E1-ADD-BASIC-01", state, nowMs, 1) -
    sessionBuilder.recencyPenalty("E1-ADD-BASIC-01", state, nowMs);
  const olderScore =
    sessionBuilder.computePatternPriority("E1-ADD-BASIC-02", state, nowMs, 1) -
    sessionBuilder.recencyPenalty("E1-ADD-BASIC-02", state, nowMs);

  assert.equal(olderScore > recentScore, true);
});

test("sessionBuilder avoids recently seen patterns until cooldown fallback is needed", async () => {
  const { studentStore, sessionBuilder } = await loadLearningEngineModules();
  const nowMs = 1_000_000;
  const state = studentStore.serializeState({
    version: 1,
    engineVersion: 1,
    student: { difficulty: 1, correctStreak: 0, wrongStreak: 0, solved: 0, correct: 0, xp: 0, level: 0 },
    patternProgress: {
      "E1-ADD-BASIC-01": { patternKey: "E1-ADD-BASIC-01", attempts: 4, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 60_000 },
      "E1-ADD-BASIC-02": { patternKey: "E1-ADD-BASIC-02", attempts: 4, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 60_000 },
      "E1-ADD-BASIC-03": { patternKey: "E1-ADD-BASIC-03", attempts: 4, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 600_000 },
      "E1-ADD-BASIC-04": { patternKey: "E1-ADD-BASIC-04", attempts: 4, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 60_000 },
      "E1-ADD-BASIC-05": { patternKey: "E1-ADD-BASIC-05", attempts: 4, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 60_000 }
    },
    skillProgress: {}
  });

  const cooldownAwareSession = sessionBuilder.buildSession(state, "E1_ADD_BASIC", 1, "skill", () => nowMs);
  const cooldownCounts = cooldownAwareSession.problems.reduce((acc, problem) => {
    acc[problem.patternKey] = (acc[problem.patternKey] ?? 0) + 1;
    return acc;
  }, {});
  assert.equal(cooldownAwareSession.problems.length, 5);
  assert.equal(cooldownAwareSession.problems.some((problem) => problem.patternKey === "E1-ADD-BASIC-03"), true);
  assert.equal(Object.values(cooldownCounts).every((count) => count <= 2), true);

  const relaxedState = studentStore.serializeState({
    ...state,
    patternProgress: {
      "E1-ADD-BASIC-01": { patternKey: "E1-ADD-BASIC-01", attempts: 4, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 600_000 },
      "E1-ADD-BASIC-02": { patternKey: "E1-ADD-BASIC-02", attempts: 4, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 600_000 },
      "E1-ADD-BASIC-03": { patternKey: "E1-ADD-BASIC-03", attempts: 4, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 600_000 },
      "E1-ADD-BASIC-04": { patternKey: "E1-ADD-BASIC-04", attempts: 4, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 600_000 },
      "E1-ADD-BASIC-05": { patternKey: "E1-ADD-BASIC-05", attempts: 4, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 600_000 }
    }
  });

  const relaxedSession = sessionBuilder.buildSession(relaxedState, "E1_ADD_BASIC", 1, "skill", () => nowMs);
  assert.equal(relaxedSession.problems.length, 5);
  assert.equal(relaxedSession.problems.every((problem) => Math.abs(problem.difficulty - 1) <= 1), true);
});

test("sessionBuilder prioritizes weaker and less recent patterns within the current bucket", async () => {
  const { studentStore, sessionBuilder } = await loadLearningEngineModules();
  const nowMs = 10_000_000;
  const state = studentStore.serializeState({
    version: 1,
    engineVersion: 1,
    student: { difficulty: 1, correctStreak: 0, wrongStreak: 0, solved: 0, correct: 0, xp: 0, level: 0 },
    patternProgress: {
      "E1-ADD-BASIC-01": { patternKey: "E1-ADD-BASIC-01", attempts: 3, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 3_600_000 },
      "E1-ADD-BASIC-02": { patternKey: "E1-ADD-BASIC-02", attempts: 3, correct: 2, mastery: 0.7, lastSeenAt: nowMs - 3_600_000 },
      "E1-ADD-BASIC-03": { patternKey: "E1-ADD-BASIC-03", attempts: 3, correct: 2, mastery: 0.7, lastSeenAt: nowMs - 600_000 },
      "E1-ADD-BASIC-04": { patternKey: "E1-ADD-BASIC-04", attempts: 3, correct: 2, mastery: 0.7, lastSeenAt: nowMs - 3_600_000 },
      "E1-ADD-BASIC-05": { patternKey: "E1-ADD-BASIC-05", attempts: 3, correct: 2, mastery: 0.7, lastSeenAt: nowMs - 3_600_000 }
    },
    skillProgress: {}
  });

  const session = sessionBuilder.buildSession(state, "E1_ADD_BASIC", 1, "skill", () => nowMs);
  const priorities = Object.fromEntries(
    ["E1-ADD-BASIC-01", "E1-ADD-BASIC-02", "E1-ADD-BASIC-03", "E1-ADD-BASIC-04", "E1-ADD-BASIC-05"].map((patternKey) => [
      patternKey,
      sessionBuilder.computePatternPriority(patternKey, state, nowMs, 1)
    ])
  );

  assert.equal(session.problems.length, 5);
  assert.equal(priorities["E1-ADD-BASIC-01"] > priorities["E1-ADD-BASIC-02"], true);
  assert.equal(priorities["E1-ADD-BASIC-02"] > priorities["E1-ADD-BASIC-03"], true);
  assert.equal(session.problems.some((problem) => problem.patternKey === "E1-ADD-BASIC-01"), true);
});

test("sessionBuilder priority favors patterns closer to the student difficulty", async () => {
  const { studentStore, sessionBuilder } = await loadLearningEngineModules();
  const nowMs = 20_000_000;
  const state = studentStore.serializeState({
    version: 1,
    engineVersion: 1,
    student: { difficulty: 2, correctStreak: 0, wrongStreak: 0, solved: 0, correct: 0, xp: 0, level: 0 },
    patternProgress: {
      "E1-ADD-BASIC-04": { patternKey: "E1-ADD-BASIC-04", attempts: 3, correct: 2, mastery: 0.7, lastSeenAt: nowMs - 3_600_000 },
      "E1-ADD-BASIC-05": { patternKey: "E1-ADD-BASIC-05", attempts: 3, correct: 2, mastery: 0.7, lastSeenAt: nowMs - 3_600_000 }
    },
    skillProgress: {}
  });

  const easierPriority = sessionBuilder.computePatternPriority("E1-ADD-BASIC-04", state, nowMs, 2);
  const alignedPriority = sessionBuilder.computePatternPriority("E1-ADD-BASIC-05", state, nowMs, 2);

  assert.equal(alignedPriority > easierPriority, true);
});

const summarizeComposition = (session) => {
  const skillCount = session.problems.filter((problem) => problem.source === "skill").length;
  const weaknessCount = session.problems.filter((problem) => problem.source === "weakness").length;

  return {
    total: session.problems.length,
    skillCount,
    weaknessCount
  };
};

test("sessionBuilder composition keeps 3 skill and 2 weakness in a normal state", async () => {
  const { studentStore, sessionBuilder } = await loadLearningEngineModules();
  const state = studentStore.serializeState({
    version: 1,
    engineVersion: 1,
    student: { difficulty: 1, correctStreak: 0, wrongStreak: 0, solved: 0, correct: 0, xp: 0, level: 0 },
    patternProgress: {
      "E1-ADD-BASIC-01": { patternKey: "E1-ADD-BASIC-01", attempts: 3, correct: 1, mastery: 0.4, lastSeenAt: 100 },
      "E1-ADD-BASIC-02": { patternKey: "E1-ADD-BASIC-02", attempts: 3, correct: 1, mastery: 0.4, lastSeenAt: 200 }
    },
    skillProgress: {}
  });

  const composition = summarizeComposition(sessionBuilder.buildSession(state, "E1_ADD_BASIC", 1));
  assert.equal(composition.total, 5);
  assert.equal(composition.skillCount, 3);
  assert.equal(composition.weaknessCount, 2);
});

test("sessionBuilder composition falls back when weakness patterns are few", async () => {
  const { studentStore, sessionBuilder } = await loadLearningEngineModules();
  const state = studentStore.serializeState({
    version: 1,
    engineVersion: 1,
    student: { difficulty: 1, correctStreak: 0, wrongStreak: 0, solved: 0, correct: 0, xp: 0, level: 0 },
    patternProgress: {
      "E1-ADD-BASIC-01": { patternKey: "E1-ADD-BASIC-01", attempts: 3, correct: 1, mastery: 0.4, lastSeenAt: 100 }
    },
    skillProgress: {}
  });

  const composition = summarizeComposition(sessionBuilder.buildSession(state, "E1_ADD_BASIC", 1));
  assert.equal(composition.total, 5);
  assert.equal(composition.weaknessCount <= 2, true);
  assert.equal(composition.skillCount >= 3, true);
  assert.equal(composition.skillCount + composition.weaknessCount, 5);
});

test("sessionBuilder composition holds when many weakness patterns exist", async () => {
  const { studentStore, sessionBuilder } = await loadLearningEngineModules();
  const state = studentStore.serializeState({
    version: 1,
    engineVersion: 1,
    student: { difficulty: 1, correctStreak: 0, wrongStreak: 0, solved: 0, correct: 0, xp: 0, level: 0 },
    patternProgress: {
      "E1-ADD-BASIC-01": { patternKey: "E1-ADD-BASIC-01", attempts: 3, correct: 1, mastery: 0.4, lastSeenAt: 100 },
      "E1-ADD-BASIC-02": { patternKey: "E1-ADD-BASIC-02", attempts: 3, correct: 1, mastery: 0.4, lastSeenAt: 200 },
      "E1-ADD-BASIC-03": { patternKey: "E1-ADD-BASIC-03", attempts: 3, correct: 1, mastery: 0.4, lastSeenAt: 300 },
      "E1-ADD-BASIC-04": { patternKey: "E1-ADD-BASIC-04", attempts: 3, correct: 1, mastery: 0.4, lastSeenAt: 400 }
    },
    skillProgress: {}
  });

  const composition = summarizeComposition(sessionBuilder.buildSession(state, "E1_ADD_BASIC", 1));
  assert.equal(composition.total, 5);
  assert.equal(composition.skillCount, 3);
  assert.equal(composition.weaknessCount, 2);
});

test("sessionBuilder composition survives cooldown filtering when weakness is sufficient", async () => {
  const { studentStore, sessionBuilder } = await loadLearningEngineModules();
  const nowMs = 5_000_000;
  const state = studentStore.serializeState({
    version: 1,
    engineVersion: 1,
    student: { difficulty: 1, correctStreak: 0, wrongStreak: 0, solved: 0, correct: 0, xp: 0, level: 0 },
    patternProgress: {
      "E1-ADD-BASIC-01": { patternKey: "E1-ADD-BASIC-01", attempts: 3, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 60_000 },
      "E1-ADD-BASIC-02": { patternKey: "E1-ADD-BASIC-02", attempts: 3, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 600_000 },
      "E1-ADD-BASIC-03": { patternKey: "E1-ADD-BASIC-03", attempts: 3, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 600_000 }
    },
    skillProgress: {}
  });

  const composition = summarizeComposition(sessionBuilder.buildSession(state, "E1_ADD_BASIC", 1, "skill", () => nowMs));
  assert.equal(composition.total, 5);
  assert.equal(composition.skillCount, 3);
  assert.equal(composition.weaknessCount, 2);
});

test("sessionBuilder composition preserves five problems when fallback is triggered", async () => {
  const { studentStore, sessionBuilder } = await loadLearningEngineModules();
  const nowMs = 1_000_000;
  const state = studentStore.serializeState({
    version: 1,
    engineVersion: 1,
    student: { difficulty: 1, correctStreak: 0, wrongStreak: 0, solved: 0, correct: 0, xp: 0, level: 0 },
    patternProgress: {
      "E1-ADD-BASIC-01": { patternKey: "E1-ADD-BASIC-01", attempts: 4, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 60_000 },
      "E1-ADD-BASIC-02": { patternKey: "E1-ADD-BASIC-02", attempts: 4, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 60_000 },
      "E1-ADD-BASIC-03": { patternKey: "E1-ADD-BASIC-03", attempts: 4, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 600_000 },
      "E1-ADD-BASIC-04": { patternKey: "E1-ADD-BASIC-04", attempts: 4, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 60_000 },
      "E1-ADD-BASIC-05": { patternKey: "E1-ADD-BASIC-05", attempts: 4, correct: 1, mastery: 0.4, lastSeenAt: nowMs - 60_000 }
    },
    skillProgress: {}
  });

  const composition = summarizeComposition(sessionBuilder.buildSession(state, "E1_ADD_BASIC", 1, "skill", () => nowMs));
  assert.equal(composition.total, 5);
  assert.equal(composition.weaknessCount <= 2, true);
  assert.equal(composition.skillCount >= 3, true);
  assert.equal(composition.skillCount + composition.weaknessCount, 5);
});

test("sessionBuilder ignores difficulty alignment when strict candidates are empty", async () => {
  const { studentStore, sessionBuilder } = await loadLearningEngineModules();
  const state = studentStore.serializeState({
    version: 1,
    engineVersion: 1,
    student: { difficulty: 4, correctStreak: 0, wrongStreak: 0, solved: 0, correct: 0, xp: 0, level: 0 },
    patternProgress: {},
    skillProgress: {
      E1_ADD_BASIC: { skillId: "E1_ADD_BASIC", mastery: 0.85, mastered: false }
    }
  });

  const session = sessionBuilder.buildSession(state, "E1_ADD_BASIC", 4);

  assert.equal(session.problems.length, 5);
  assert.equal(session.startedDifficulty, 5);
  assert.equal(session.problems.some((problem) => Math.abs(problem.difficulty - 5) > 1), true);
});

test("sessionBuilder source includes random skill-pattern top-up fallback", () => {
  const source = fs.readFileSync(path.join(root, "packages/learning-engine/sessionBuilder.ts"), "utf8");

  assert.equal(source.includes("ignoreDifficulty: true"), true);
  assert.equal(source.includes("topUpWithRandomSkillPatterns"), true);
  assert.equal(source.includes("const additions = uniqueBatch.length > 0 ? uniqueBatch : generated;"), true);
  assert.equal(source.includes("const MAX_PATTERN_PER_SESSION = 2;"), true);
  assert.equal(source.includes("patternCounts"), true);
  assert.equal(source.includes("getPatternCount(patternCounts, patternKey) < MAX_PATTERN_PER_SESSION"), true);
});

test("sessionBuilder keeps same pattern at most twice per session", async () => {
  const { studentStore, sessionBuilder } = await loadLearningEngineModules();
  const state = studentStore.serializeState({
    version: 1,
    engineVersion: 1,
    student: { difficulty: 4, correctStreak: 0, wrongStreak: 0, solved: 0, correct: 0, xp: 0, level: 0 },
    patternProgress: {},
    skillProgress: {}
  });

  const session = sessionBuilder.buildSession(state, "E1_ADD_BASIC", 4);
  const counts = session.problems.reduce((acc, problem) => {
    acc[problem.patternKey] = (acc[problem.patternKey] ?? 0) + 1;
    return acc;
  }, {});

  assert.equal(session.problems.length, 5);
  assert.equal(Object.values(counts).every((count) => count <= 2), true);
  assert.equal(
    session.problems.every((problem, index, list) => index === 0 || problem.patternKey !== list[index - 1].patternKey),
    true
  );
});

test("sessionBuilder source includes patternUsage diversity guard logging", () => {
  const source = fs.readFileSync(path.join(root, "packages/learning-engine/sessionBuilder.ts"), "utf8");

  assert.equal(source.includes("const patternUsage = Object.fromEntries(patternCounts);"), true);
  assert.equal(source.includes('console.log("patternUsage", patternUsage);'), true);
  assert.equal(source.includes("const reorderProblemsWithPatternDiversity"), true);
});

test("learningEngine start/record/finish/recommend are pure state transformers", async () => {
  const { learningEngine, studentStore, index } = await loadLearningEngineModules();
  const initial = studentStore.createLearningState();
  assert.equal(initial.version, 1);
  assert.equal(initial.engineVersion, 1);

  assert.equal(typeof index.startSession, "function");
  assert.equal(typeof index.serializeState, "function");

  const started = learningEngine.startSession(initial, { mode: "skill", skillId: "E1_ADD_BASIC" });
  assert.equal(started.state.version, 1);
  assert.equal(started.state.engineVersion, 1);
  assert.equal(started.session.problems.length, 5);
  assert.equal(started.state.session?.problems.length, 5);

  const answered = learningEngine.recordAnswer(started.state, { correct: true });
  assert.equal(answered.state.version, 1);
  assert.equal(answered.state.engineVersion, 1);
  assert.equal(answered.state.student.solved, 1);
  assert.equal(answered.state.student.correct, 1);
  assert.equal(answered.state.student.xpTotal, 10);
  assert.equal(answered.state.student.xpSession, 10);
  assert.equal(answered.state.student.level, 2);
  assert.equal(answered.session.index, 1);
  assert.equal(answered.state.skillProgress.E1_ADD_BASIC?.mastery, 2 / 3);
  assert.equal(answered.state.skillProgress.E1_ADD_BASIC?.mastered, false);

  const recommendedSkill = learningEngine.recommendNextAction(answered.state);
  assert.deepEqual(recommendedSkill, {
    type: "skill",
    skillId: "E1_ADD_BASIC",
    reason: "next_skill"
  });

  const weakState = studentStore.serializeState({
    ...answered.state,
    patternProgress: {
      ...answered.state.patternProgress,
      "E1-ADD-BASIC-02": { patternKey: "E1-ADD-BASIC-02", attempts: 3, correct: 1, mastery: 0.3333333333333333, lastSeenAt: 500 },
      "E1-ADD-BASIC-03": { patternKey: "E1-ADD-BASIC-03", attempts: 3, correct: 1, mastery: 0.3333333333333333, lastSeenAt: 600 }
    }
  });
  assert.deepEqual(learningEngine.recommendNextAction(weakState), {
    type: "adaptive",
    reason: "weak_patterns",
    weakPatterns: 2
  });

  const finished = learningEngine.finishSession(answered.state);
  assert.equal(finished.state.version, 1);
  assert.equal(finished.state.engineVersion, 1);
  assert.equal(finished.state.session, undefined);
  assert.equal(finished.state.student.xpTotal, 10);
  assert.equal(finished.state.student.xpSession, 0);
  assert.equal(finished.state.student.level, 2);
  assert.equal(finished.result.totalQuestions, 5);
  assert.equal(finished.result.skillProgressBefore?.skillId, "E1_ADD_BASIC");
  assert.equal(finished.result.skillProgressBefore?.mastery, 0);
  assert.equal(finished.result.skillProgressAfter?.skillId, "E1_ADD_BASIC");
  assert.equal(finished.result.skillProgressAfter?.mastery, 2 / 3);

  const source = fs.readFileSync(path.join(root, "packages/learning-engine/learningEngine.ts"), "utf8");
  assert.equal(source.includes('console.log("skillMastery"'), true);
  assert.equal(source.includes('console.log("studentXP"'), true);
});

test("recordAnswer recomputes only the affected skill", async () => {
  const { learningEngine, studentStore } = await loadLearningEngineModules();
  const started = learningEngine.startSession(studentStore.createLearningState(), { mode: "skill", skillId: "E1_ADD_BASIC" });
  const seededState = studentStore.serializeState({
    ...started.state,
    skillProgress: {
      E1_ADD_BASIC: { skillId: "E1_ADD_BASIC", mastery: 0.4, mastered: false },
      E1_ADD_CARRY: { skillId: "E1_ADD_CARRY", mastery: 0.9, mastered: true }
    }
  });

  const answered = learningEngine.recordAnswer(seededState, { correct: true });

  assert.notEqual(answered.state.skillProgress.E1_ADD_BASIC?.mastery, 0.4);
  assert.deepEqual(answered.state.skillProgress.E1_ADD_CARRY, {
    skillId: "E1_ADD_CARRY",
    mastery: 0.9,
    mastered: true
  });
});

test("adaptive start works without skillId and difficulty remains within 1..4", async () => {
  const { learningEngine, studentStore } = await loadLearningEngineModules();
  const initial = studentStore.createLearningState();

  const adaptive = learningEngine.startSession(initial, { mode: "adaptive" });
  assert.equal(adaptive.state.version, 1);
  assert.equal(adaptive.state.engineVersion, 1);
  assert.equal(adaptive.session.mode, "adaptive");
  assert.equal(adaptive.session.skillId, "E1_ADD_BASIC");
  assert.equal(adaptive.session.startedDifficulty >= 1 && adaptive.session.startedDifficulty <= 5, true);

  const highDifficultyState = studentStore.serializeState({
    ...adaptive.state,
    student: { ...adaptive.state.student, difficulty: 4, correctStreak: 2, wrongStreak: 0 }
  });
  const answered = learningEngine.recordAnswer(highDifficultyState, { correct: true });
  assert.equal(answered.state.student.difficulty, 4);
});
