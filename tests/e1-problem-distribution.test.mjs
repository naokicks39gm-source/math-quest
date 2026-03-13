import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const SESSION_COUNT = 200;

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
      '  E1_ADD_BASIC: ["E1_ADD_BASIC"],',
      '  E1_ADD_10: ["E1_ADD_10"],',
      '  E1_ADD_CARRY: ["E1_ADD_CARRY"],',
      '  E1_SUB_BASIC: ["E1_SUB_BASIC"],',
      '  E1_SUB_BORROW: ["E1_SUB_BORROW"],',
      '  E1_NUMBER_COMPARE: ["E1_NUMBER_COMPARE"],',
      '  E1_NUMBER_COMPOSE: ["E1_NUMBER_COMPOSE"],',
      '  E1_NUMBER_DECOMPOSE: ["E1_NUMBER_DECOMPOSE"]',
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
    ['"E1-SUB-BORROW-"', 1, 10, "(index <= 4 ? 2 : 3)"],
    ['"E1-NUM-COMPARE-"', 1, 1, "1"],
    ['"E1-NUM-COMPOSE-"', 1, 1, "1"],
    ['"E1-NUM-DECOMPOSE-"', 1, 1, "1"]
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
      '    variables: pattern.key === "E1-NUM-COMPARE-01" ? { a: index, b: index + 1 } : pattern.key === "E1-NUM-COMPOSE-01" ? { a: index % 5, b: 10 - (index % 5) } : pattern.key === "E1-NUM-DECOMPOSE-01" ? { whole: 10, known: index % 5 } : undefined,',
      "    meta: { difficulty: difficultyByPattern[pattern.key] ?? 2, patternId: pattern.key }",
      "  }));",
      "export const generateRuntimeProblems = (pattern, count) =>",
      "  generateProblems(pattern, count).map((problem) => ({",
      "    ...problem,",
      "    question: pattern.key === \"E1-NUM-COMPARE-01\" ? `${problem.variables.a ?? 0} と ${problem.variables.b ?? 0}\\nどちらが小さい？` : problem.question,",
      "    answer: pattern.key === \"E1-NUM-COMPARE-01\" ? String(Math.min(problem.variables.a ?? 0, problem.variables.b ?? 0)) : pattern.key === \"E1-NUM-COMPOSE-01\" ? String((problem.variables.a ?? 0) + (problem.variables.b ?? 0)) : pattern.key === \"E1-NUM-DECOMPOSE-01\" ? String((problem.variables.whole ?? 0) - (problem.variables.known ?? 0)) : problem.answer,",
      "    meta: { ...(problem.meta ?? {}), source: \"runtime-pattern\", patternId: problem.meta?.patternId ?? pattern.key }",
      "  }));"
    ].join("\n"),
    "utf8"
  );
};

const loadModules = async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "e1-problem-distribution-"));
  const learningRoot = path.join(root, "packages/learning-engine");

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
  writeJsonModule(path.join(root, "packages/skill-system/skills.json"), path.join(tempDir, "skills.mjs"));

  createSkillSystemStub(path.join(tempDir, "skill-system.mjs"));
  createProblemEngineStub(path.join(tempDir, "problem-engine.mjs"));
  await transpileTsModule(path.join(root, "packages/problem-hint/hintTypes.ts"), path.join(tempDir, "hintTypes.mjs"));
  await transpileTsModule(path.join(root, "packages/problem-hint/hintRegistry.ts"), path.join(tempDir, "hintRegistry.mjs"), [
    ['from "packages/problem-engine"', 'from "./problem-engine.mjs"'],
    ['from "./hintTypes"', 'from "./hintTypes.mjs"']
  ]);
  await transpileTsModule(path.join(root, "packages/problem-hint/generateHint.ts"), path.join(tempDir, "generateHint.mjs"), [
    ['from "packages/problem-engine"', 'from "./problem-engine.mjs"'],
    ['from "./hintRegistry"', 'from "./hintRegistry.mjs"'],
    ['from "./hintTypes"', 'from "./hintTypes.mjs"']
  ]);
  await transpileTsModule(path.join(root, "packages/problem-hint/index.ts"), path.join(tempDir, "problem-hint.mjs"), [
    ['from "packages/problem-hint/generateHint"', 'from "./generateHint.mjs"'],
    ['from "packages/problem-hint/hintTypes"', 'from "./hintTypes.mjs"']
  ]);
  await transpileTsModule(path.join(root, "packages/problem-explanation/explanationTypes.ts"), path.join(tempDir, "explanationTypes.mjs"));
  await transpileTsModule(path.join(root, "packages/problem-explanation/explanationRegistry.ts"), path.join(tempDir, "explanationRegistry.mjs"), [
    ['from "packages/problem-engine"', 'from "./problem-engine.mjs"'],
    ['from "./explanationTypes"', 'from "./explanationTypes.mjs"']
  ]);
  await transpileTsModule(path.join(root, "packages/problem-explanation/generateExplanation.ts"), path.join(tempDir, "generateExplanation.mjs"), [
    ['from "packages/problem-engine"', 'from "./problem-engine.mjs"'],
    ['from "./explanationRegistry"', 'from "./explanationRegistry.mjs"'],
    ['from "./explanationTypes"', 'from "./explanationTypes.mjs"']
  ]);
  await transpileTsModule(path.join(root, "packages/problem-explanation/index.ts"), path.join(tempDir, "problem-explanation.mjs"), [
    ['from "packages/problem-explanation/generateExplanation"', 'from "./generateExplanation.mjs"'],
    ['from "packages/problem-explanation/explanationTypes"', 'from "./explanationTypes.mjs"']
  ]);

  const sharedReplacements = [
    ...localModuleReplacements,
    ['from "packages/problem-engine"', 'from "./problem-engine.mjs"'],
    ['from "packages/problem-hint"', 'from "./problem-hint.mjs"'],
    ['from "packages/problem-explanation"', 'from "./problem-explanation.mjs"'],
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

const e1SkillCases = [
  ["E1_ADD_BASIC", "E1-ADD-BASIC-"],
  ["E1_ADD_10", "E1-ADD-MAKE10"],
  ["E1_ADD_CARRY", "E1-ADD-CARRY"],
  ["E1_SUB_BASIC", "E1-SUB-BASIC-"],
  ["E1_SUB_BORROW", "E1-SUB-BORROW-"],
  ["E1_NUMBER_COMPARE", "E1-NUM-COMPARE-"],
  ["E1_NUMBER_COMPOSE", "E1-NUM-COMPOSE-"],
  ["E1_NUMBER_DECOMPOSE", "E1-NUM-DECOMPOSE-"]
];

test("runtime E1 skills keep lightweight session distribution sanity", async () => {
  const { studentStore, learningEngine } = await loadModules();

  for (const [skillId, prefix] of e1SkillCases) {
    const patternCounts = new Map();
    let totalProblems = 0;

    for (let sessionIndex = 0; sessionIndex < SESSION_COUNT; sessionIndex += 1) {
      const started = learningEngine.startSession(studentStore.createLearningState(), { mode: "skill", skillId });
      const problems = started.session.problems;

      assert.equal(problems.length, 5, `${skillId} session size`);
      assert.equal(new Set(problems.map((problem) => problem.problemId)).size, 5, `${skillId} duplicate ids`);

      for (const problem of problems) {
        assert.equal(problem.patternKey.startsWith(prefix), true, `${skillId} -> ${problem.patternKey}`);
        patternCounts.set(problem.patternKey, (patternCounts.get(problem.patternKey) ?? 0) + 1);
        totalProblems += 1;
      }
    }

    if (
      skillId === "E1_ADD_10" ||
      skillId === "E1_ADD_CARRY" ||
      skillId === "E1_SUB_BORROW" ||
      skillId === "E1_NUMBER_COMPARE" ||
      skillId === "E1_NUMBER_COMPOSE" ||
      skillId === "E1_NUMBER_DECOMPOSE"
    ) {
      assert.equal(patternCounts.size >= 1, true, `${skillId} unique patterns: ${patternCounts.size}`);
      assert.equal(patternCounts.size <= 1, true, `${skillId} unique patterns: ${patternCounts.size}`);
      continue;
    }

    assert.equal(patternCounts.size >= 3, true, `${skillId} unique patterns: ${patternCounts.size}`);

    const maxUsageRatio = Math.max(...[...patternCounts.values()].map((count) => count / totalProblems));
    assert.equal(maxUsageRatio <= 0.6, true, `${skillId} max usage ratio: ${maxUsageRatio}`);
  }
});
