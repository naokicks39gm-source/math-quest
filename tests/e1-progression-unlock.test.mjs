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
  ['from "./learningEngine"', 'from "./learningEngine.mjs"'],
  ['from "./skill-unlock"', 'from "./skill-unlock.mjs"'],
  ['from "./progression-engine"', 'from "./progression-engine.mjs"']
];

const createSkillSystemStub = (outputPath) => {
  fs.writeFileSync(
    outputPath,
    [
      'const skillPatterns = {',
      '  E1_NUMBER_COUNT: ["E1_NUMBER_COUNT"],',
      '  E1_NUMBER_ORDER: ["E1_NUMBER_ORDER"],',
      '  E1_NUMBER_COMPARE: ["E1_NUMBER_COMPARE"],',
      '  E1_NUMBER_COMPOSE: ["E1_NUMBER_COMPOSE"],',
      '  E1_NUMBER_DECOMPOSE: ["E1_NUMBER_DECOMPOSE"],',
      '  E1_ADD_BASIC: ["E1_ADD_BASIC"],',
      '  E1_ADD_10: ["E1_ADD_10"],',
      '  E1_SUB_BASIC: ["E1_SUB_BASIC"]',
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
      '  "E1-ADD-BASIC-01": 3,',
      '  "E1-ADD-MAKE10": 4,',
      '  "E1-SUB-BASIC-01": 4,',
      '  "E1-NUM-COMPARE-01": 2,',
      '  "E1-NUM-COMPOSE-01": 1,',
      '  "E1-NUM-DECOMPOSE-01": 1',
      "};",
      "export const getPatternMeta = (key) =>",
      "  difficultyByPattern[key] ? { key, difficulty: difficultyByPattern[key] } : undefined;",
      "export const generateProblems = (pattern, count) =>",
      "  Array.from({ length: count }, (_, index) => ({",
      '    id: `${pattern.key}::${index}`,',
      '    patternKey: pattern.key,',
      '    question: `${pattern.key} question ${index}`,',
      '    answer: `${index}`,',
      "    meta: { difficulty: difficultyByPattern[pattern.key] ?? 1 }",
      "  }));",
      "export const generateRuntimeProblems = (pattern, count) => generateProblems(pattern, count);"
    ].join("\n"),
    "utf8"
  );
};

const loadModules = async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "e1-progression-unlock-"));
  const learningRoot = path.join(root, "packages/learning-engine");

  writeJsonModule(path.join(root, "packages/skill-system/skills.json"), path.join(tempDir, "skills.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/add-basic.json"), path.join(tempDir, "add-basic.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/add-make10.json"), path.join(tempDir, "add-make10.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/add-carry.json"), path.join(tempDir, "add-carry.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/sub-basic.json"), path.join(tempDir, "sub-basic.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/sub-borrow.json"), path.join(tempDir, "sub-borrow.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/number-compare.json"), path.join(tempDir, "number-compare.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/number-compose.json"), path.join(tempDir, "number-compose.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/number-decompose.json"), path.join(tempDir, "number-decompose.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E2/add-2digit.json"), path.join(tempDir, "add-2digit.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E2/sub-2digit.json"), path.join(tempDir, "sub-2digit.mjs"));
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
    ['from "packages/problem-engine/patterns/E1/number-compare.json"', 'from "./number-compare.mjs"'],
    ['from "packages/problem-engine/patterns/E1/number-compose.json"', 'from "./number-compose.mjs"'],
    ['from "packages/problem-engine/patterns/E1/number-decompose.json"', 'from "./number-decompose.mjs"'],
    ['from "packages/problem-engine/patterns/E2/add-2digit.json"', 'from "./add-2digit.mjs"'],
    ['from "packages/problem-engine/patterns/E2/sub-2digit.json"', 'from "./sub-2digit.mjs"']
  ];

  for (const moduleName of [
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
    "skill-unlock",
    "progression-engine",
    "learningEngine"
  ]) {
    await transpileTsModule(
      path.join(learningRoot, `${moduleName}.ts`),
      path.join(tempDir, `${moduleName}.mjs`),
      sharedReplacements
    );
  }

  const load = (moduleName) => import(`${pathToFileURL(path.join(tempDir, `${moduleName}.mjs`)).href}?t=${Date.now()}`);

  return {
    studentStore: await load("studentStore"),
    learningEngine: await load("learningEngine")
  };
};

const buildFinishedState = (studentStore, skillId, unlockedSkills = [skillId]) =>
  studentStore.serializeState({
    version: 1,
    engineVersion: 1,
    student: { difficulty: 1, correctStreak: 0, wrongStreak: 0, solved: 5, correct: 5, xpTotal: 50, xpSession: 50, level: 3 },
    patternProgress: {},
    skillProgress: {
      [skillId]: { skillId, mastery: 0.8, mastered: true }
    },
    unlockedSkills,
    session: {
      mode: "skill",
      skillId,
      startedDifficulty: 1,
      problems: [],
      index: 0,
      correct: 5,
      wrong: 0
    }
  });

const progressionCases = [
  ["E1_NUMBER_COUNT", "E1_NUMBER_ORDER"],
  ["E1_NUMBER_ORDER", "E1_NUMBER_COMPARE"],
  ["E1_NUMBER_COMPARE", "E1_NUMBER_COMPOSE"],
  ["E1_NUMBER_COMPOSE", "E1_ADD_BASIC"]
];

for (const [completedSkillId, nextSkillId] of progressionCases) {
  test(`${completedSkillId} mastery >= 0.8 unlocks ${nextSkillId}`, async () => {
    const { learningEngine, studentStore } = await loadModules();
    const state = buildFinishedState(studentStore, completedSkillId);

    const finished = learningEngine.finishSession(state);

    assert.equal(finished.state.unlockedSkills.includes(nextSkillId), true);
  });
}
