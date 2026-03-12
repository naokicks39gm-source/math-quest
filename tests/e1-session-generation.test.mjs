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
      '  E1_NUMBER_LINE: ["E1_NUMBER_LINE"],',
      '  E1_ADD_ZERO: ["E1_ADD_ZERO"],',
      '  E1_ADD_ONE: ["E1_ADD_ONE"],',
      '  E1_ADD_DOUBLES: ["E1_ADD_DOUBLES"],',
      '  E1_ADD_NEAR_DOUBLES: ["E1_ADD_NEAR_DOUBLES"],',
      '  E1_ADD_BASIC: ["E1_ADD_BASIC"],',
      '  E1_ADD_10: ["E1_ADD_10"],',
      '  E1_ADD_CARRY: ["E1_ADD_CARRY"],',
      '  E1_SUB_BASIC: ["E1_SUB_BASIC"],',
      '  E1_SUB_FACTS: ["E1_SUB_FACTS"],',
      '  E1_FACT_FAMILY: ["E1_FACT_FAMILY"],',
      '  E1_SUB_BORROW: ["E1_SUB_BORROW"],',
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
    ['"E1-NUM-COUNT-"', 1, 1, "1"],
    ['"E1-NUM-ORDER-"', 1, 1, "1"],
    ['"E1-ADD-BASIC-"', 1, 10, "(index <= 8 ? 1 : 2)"],
    ['"E1-SUB-BASIC-"', 1, 10, "(index <= 7 ? 1 : 2)"],
    ['"E1-SUB-FACTS-"', 1, 1, "2"],
    ['"E1-FACT-FAMILY-"', 1, 3, "3"],
    ['"E1-SUB-BORROW-"', 1, 10, "(index <= 4 ? 2 : 3)"],
    ['"E1-NUM-COMPARE-"', 1, 1, "1"],
    ['"E1-NUM-COMPOSE-"', 1, 1, "1"],
    ['"E1-NUM-DECOMPOSE-"', 1, 1, "1"],
    ['"E1-NUM-LINE-"', 1, 1, "1"],
    ['"E1-ADD-ZERO-"', 1, 1, "1"],
    ['"E1-ADD-ONE-"', 1, 1, "1"],
    ['"E1-ADD-DOUBLES-"', 1, 1, "2"],
    ['"E1-ADD-NEAR-DOUBLES-"', 1, 1, "2"]
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
      '    variables: pattern.key === "E1-NUM-COUNT-01" ? { n: index % 21 } : pattern.key === "E1-NUM-ORDER-01" ? { a: index % 21, b: (index % 21) + 1 } : pattern.key === "E1-NUM-COMPARE-01" ? { a: index, b: index + 1 } : pattern.key === "E1-NUM-COMPOSE-01" ? { a: index % 10, b: 10 - (index % 10) } : pattern.key === "E1-NUM-DECOMPOSE-01" ? { whole: 10, a: index % 10, b: 10 - (index % 10) } : pattern.key === "E1-NUM-LINE-01" ? { start: index % 10, move: 1 + (index % 10) } : undefined,',
      "    meta: { difficulty: difficultyByPattern[pattern.key] ?? 2 }",
      "  }));",
      "export const generateRuntimeProblems = (pattern, count) =>",
      "  generateProblems(pattern, count).map((problem) => ({",
      "    ...problem,",
      "    question: pattern.key === \"E1-NUM-COMPARE-01\" ? `${problem.variables.a ?? 0} と ${problem.variables.b ?? 0}\\n小さいほうは？` : problem.question,",
      "    answer: pattern.key === \"E1-NUM-COMPARE-01\" ? String(Math.min(problem.variables.a ?? 0, problem.variables.b ?? 0)) : pattern.key === \"E1-NUM-COMPOSE-01\" ? String((problem.variables.a ?? 0) + (problem.variables.b ?? 0)) : pattern.key === \"E1-NUM-DECOMPOSE-01\" ? String(problem.variables.b ?? 0) : pattern.key === \"E1-NUM-COUNT-01\" ? String(problem.variables.n ?? 0) : pattern.key === \"E1-NUM-ORDER-01\" ? `[${Math.min(problem.variables.a ?? 0, problem.variables.b ?? 0)},${Math.max(problem.variables.a ?? 0, problem.variables.b ?? 0)}]` : pattern.key === \"E1-NUM-LINE-01\" ? String((problem.variables.start ?? 0) + (problem.variables.move ?? 0)) : problem.answer,",
      "    meta: { ...(problem.meta ?? {}), source: \"runtime-pattern\" }",
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
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/number-compare.json"), path.join(tempDir, "number-compare.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/number-compose.json"), path.join(tempDir, "number-compose.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/number-decompose.json"), path.join(tempDir, "number-decompose.mjs"));
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

  await transpileTsModule(path.join(root, "src/lib/learningPatternCatalog.ts"), path.join(tempDir, "learningPatternCatalog.mjs"), [
    ['from "packages/problem-engine/patterns/E1/add-basic.json"', 'from "./add-basic.mjs"'],
    ['from "packages/problem-engine/patterns/E1/add-make10.json"', 'from "./add-make10.mjs"'],
    ['from "packages/problem-engine/patterns/E1/add-carry.json"', 'from "./add-carry.mjs"'],
    ['from "packages/problem-engine/patterns/E1/sub-basic.json"', 'from "./sub-basic.mjs"'],
    ['from "packages/problem-engine/patterns/E1/sub-borrow.json"', 'from "./sub-borrow.mjs"'],
    ['from "packages/problem-engine/patterns/E1/number-compare.json"', 'from "./number-compare.mjs"'],
    ['from "packages/problem-engine/patterns/E1/number-compose.json"', 'from "./number-compose.mjs"'],
    ['from "packages/problem-engine/patterns/E1/number-decompose.json"', 'from "./number-decompose.mjs"'],
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
  ["E1_NUMBER_COUNT", "E1-NUM-COUNT-"],
  ["E1_NUMBER_ORDER", "E1-NUM-ORDER-"],
  ["E1_NUMBER_COMPARE", "E1-NUM-COMPARE-"],
  ["E1_NUMBER_COMPOSE", "E1-NUM-COMPOSE-"],
  ["E1_NUMBER_DECOMPOSE", "E1-NUM-DECOMPOSE-"],
  ["E1_NUMBER_LINE", "E1-NUM-LINE-"],
  ["E1_ADD_ZERO", "E1-ADD-ZERO-"],
  ["E1_ADD_ONE", "E1-ADD-ONE-"],
  ["E1_ADD_DOUBLES", "E1-ADD-DOUBLES-"],
  ["E1_ADD_NEAR_DOUBLES", "E1-ADD-NEAR-DOUBLES-"],
  ["E1_ADD_BASIC", "E1-ADD-BASIC-"],
  ["E1_ADD_10", "E1-ADD-MAKE10"],
  ["E1_ADD_CARRY", "E1-ADD-CARRY"],
  ["E1_SUB_BASIC", "E1-SUB-BASIC-"],
  ["E1_SUB_FACTS", "E1-SUB-FACTS-"],
  ["E1_FACT_FAMILY", "E1-FACT-FAMILY-"],
  ["E1_SUB_BORROW", "E1-SUB-BORROW-"],
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
      assert.equal(problem.difficulty >= 1 && problem.difficulty <= 5, true, `${skillId} -> ${problem.patternKey}`);
      assert.equal(typeof problem.problem.meta?.difficulty, "number", `${skillId} -> ${problem.patternKey}`);
      assert.equal(problem.problem.meta.difficulty >= 1 && problem.problem.meta.difficulty <= 5, true, `${skillId} -> ${problem.patternKey}`);
      assert.equal(
        learningPatternCatalog.some((entry) => entry.skillId === skillId && entry.patternId === problem.patternKey),
        true,
        `${skillId} -> missing catalog entry for ${problem.patternKey}`
      );
    }
  }
});
