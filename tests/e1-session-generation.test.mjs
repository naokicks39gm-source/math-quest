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
      '  E1_SUB_BORROW: ["E1_SUB_BORROW"]',
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
  const ranges = [
    ['"E1-ADD-BASIC-"', 1, 10, "(index <= 8 ? 1 : 2)"],
    ['"E1-SUB-BASIC-"', 1, 10, "(index <= 7 ? 1 : 2)"],
    ['"E1-SUB-BORROW-"', 1, 10, "(index <= 4 ? 2 : 3)"]
  ];

  fs.writeFileSync(
    outputPath,
    [
      "const difficultyByPattern = {};",
      ...ranges.map(
        ([prefix, start, end, expr]) =>
          `for (let index = ${start}; index <= ${end}; index += 1) difficultyByPattern[\`${prefix}\${String(index).padStart(2, "0")}\`] = ${expr};`
      ),
      'difficultyByPattern["E1-ADD-MAKE10"] = 2;',
      'difficultyByPattern["E1-ADD-CARRY"] = 2;',
      "export const getPatternMeta = (key) =>",
      "  difficultyByPattern[key] ? { key, difficulty: difficultyByPattern[key] } : undefined;",
      "export const generateProblems = (pattern, count) =>",
      "  Array.from({ length: count }, (_, index) => ({",
      '    id: `${pattern.key}::${index}`,',
      '    patternKey: pattern.key,',
      '    question: `${pattern.key} question ${index}`,',
      '    answer: `${index}`,',
      "    meta: { difficulty: difficultyByPattern[pattern.key] ?? 2 }",
      "  }));"
    ].join("\n"),
    "utf8"
  );
};

const loadModules = async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "e1-session-generation-"));
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
    "learningEngine"
  ]) {
    await transpileTsModule(
      path.join(learningRoot, `${moduleName}.ts`),
      path.join(tempDir, `${moduleName}.mjs`),
      sharedReplacements
    );
  }

  await transpileTsModule(path.join(root, "src/lib/learningPatternCatalog.ts"), path.join(tempDir, "learningPatternCatalog.mjs"), [
    ['from "packages/problem-engine/patterns/E1/add-basic.json"', 'from "./add-basic.mjs"'],
    ['from "packages/problem-engine/patterns/E1/add-make10.json"', 'from "./add-make10.mjs"'],
    ['from "packages/problem-engine/patterns/E1/add-carry.json"', 'from "./add-carry.mjs"'],
    ['from "packages/problem-engine/patterns/E1/sub-basic.json"', 'from "./sub-basic.mjs"'],
    ['from "packages/problem-engine/patterns/E1/sub-borrow.json"', 'from "./sub-borrow.mjs"'],
    ['from "packages/problem-engine/patterns/E2/add-2digit.json"', 'from "./add-2digit.mjs"'],
    ['from "packages/problem-engine/patterns/E2/sub-2digit.json"', 'from "./sub-2digit.mjs"'],
    ['from "packages/skill-system/skills.json"', 'from "./skills.mjs"']
  ]);

  const load = (moduleName) => import(`${pathToFileURL(path.join(tempDir, `${moduleName}.mjs`)).href}?t=${Date.now()}`);

  return {
    studentStore: await load("studentStore"),
    learningEngine: await load("learningEngine"),
    learningPatternCatalog: (await load("learningPatternCatalog")).learningPatternCatalog
  };
};

const e1SkillCases = [
  ["E1_ADD_BASIC", "E1-ADD-BASIC-"],
  ["E1_ADD_10", "E1-ADD-MAKE10"],
  ["E1_ADD_CARRY", "E1-ADD-CARRY"],
  ["E1_SUB_BASIC", "E1-SUB-BASIC-"],
  ["E1_SUB_BORROW", "E1-SUB-BORROW-"]
];

test("learningEngine.startSession generates valid five-problem sessions for runtime E1 skills", async () => {
  const { studentStore, learningEngine, learningPatternCatalog } = await loadModules();

  for (const [skillId, prefix] of e1SkillCases) {
    const initial = studentStore.createLearningState();
    const started = learningEngine.startSession(initial, { mode: "skill", skillId });
    const session = started.session;

    assert.equal(session.skillId, skillId, skillId);
    assert.equal(session.index, 0, skillId);
    assert.equal(session.correct, 0, skillId);
    assert.equal(session.wrong, 0, skillId);
    assert.equal(session.problems.length, 5, skillId);
    assert.equal(new Set(session.problems.map((problem) => problem.problem.id)).size, 5, skillId);

    for (const problem of session.problems) {
      assert.equal(problem.patternKey.startsWith(prefix), true, `${skillId} -> ${problem.patternKey}`);
      assert.equal(problem.problem.patternKey, problem.patternKey, `${skillId} -> ${problem.problem.id}`);
      assert.equal(typeof problem.difficulty, "number", `${skillId} -> ${problem.patternKey}`);
      assert.equal(problem.difficulty >= 1 && problem.difficulty <= 3, true, `${skillId} -> ${problem.patternKey}`);
      assert.equal(typeof problem.problem.meta?.difficulty, "number", `${skillId} -> ${problem.patternKey}`);
      assert.equal(problem.problem.meta.difficulty >= 1 && problem.problem.meta.difficulty <= 3, true, `${skillId} -> ${problem.patternKey}`);
      assert.equal(
        learningPatternCatalog.some((entry) => entry.skillId === skillId && entry.patternId === problem.patternKey),
        true,
        `${skillId} -> missing catalog entry for ${problem.patternKey}`
      );
    }
  }
});
