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

const withMockedRandom = (values, callback) => {
  const originalRandom = Math.random;
  let index = 0;
  Math.random = () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };

  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
};

const loadSkillSystemModules = async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-system-"));

  const expressionEvaluatorSource = path.join(root, "packages/problem-format/expressionEvaluator.ts");
  const minimalDslSource = path.join(root, "packages/problem-engine/minimal-dsl.ts");
  const dslEngineSource = path.join(root, "packages/problem-engine/dsl-engine.ts");
  const skillTypesSource = path.join(root, "packages/skill-system/skillTypes.ts");
  const skillTreeSource = path.join(root, "packages/skill-system/skillTree.ts");
  const skillEngineSource = path.join(root, "packages/skill-system/skillEngine.ts");

  const expressionEvaluatorOutput = path.join(tempDir, "expressionEvaluator.mjs");
  const minimalDslOutput = path.join(tempDir, "minimal-dsl.mjs");
  const dslEngineOutput = path.join(tempDir, "dsl-engine.mjs");
  const problemEngineOutput = path.join(tempDir, "problem-engine.mjs");
  const skillTypesOutput = path.join(tempDir, "skillTypes.mjs");
  const skillTreeOutput = path.join(tempDir, "skillTree.mjs");
  const skillEngineOutput = path.join(tempDir, "skillEngine.mjs");
  const skillsOutput = path.join(tempDir, "skills.mjs");
  const addBasicOutput = path.join(tempDir, "add-basic.mjs");
  const addMake10Output = path.join(tempDir, "add-make10.mjs");
  const addCarryOutput = path.join(tempDir, "add-carry.mjs");
  const subBasicOutput = path.join(tempDir, "sub-basic.mjs");
  const subBorrowOutput = path.join(tempDir, "sub-borrow.mjs");
  const numberCompareOutput = path.join(tempDir, "number-compare.mjs");
  const numberComposeOutput = path.join(tempDir, "number-compose.mjs");
  const numberDecomposeOutput = path.join(tempDir, "number-decompose.mjs");
  const add2DigitOutput = path.join(tempDir, "add-2digit.mjs");
  const sub2DigitOutput = path.join(tempDir, "sub-2digit.mjs");

  writeJsonModule(path.join(root, "packages/skill-system/skills.json"), skillsOutput);
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/add-basic.json"), addBasicOutput);
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/add-make10.json"), addMake10Output);
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/add-carry.json"), addCarryOutput);
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/sub-basic.json"), subBasicOutput);
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/sub-borrow.json"), subBorrowOutput);
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/number-compare.json"), numberCompareOutput);
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/number-compose.json"), numberComposeOutput);
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/number-decompose.json"), numberDecomposeOutput);
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E2/add-2digit.json"), add2DigitOutput);
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E2/sub-2digit.json"), sub2DigitOutput);

  await transpileTsModule(expressionEvaluatorSource, expressionEvaluatorOutput);
  await transpileTsModule(minimalDslSource, minimalDslOutput, [
    ['from "packages/problem-format/expressionEvaluator"', 'from "./expressionEvaluator.mjs"']
  ]);
  await transpileTsModule(dslEngineSource, dslEngineOutput, [
    ['from "packages/problem-format/expressionEvaluator"', 'from "./expressionEvaluator.mjs"'],
    ['from "packages/problem-engine/minimal-dsl"', 'from "./minimal-dsl.mjs"']
  ]);
  fs.writeFileSync(
    problemEngineOutput,
    [
      'export * from "./dsl-engine.mjs";',
      'import * as dslEngine from "./dsl-engine.mjs";',
      'globalThis.__skillSystemGenerateProblemsCalls = 0;',
      'globalThis.__skillSystemGeneratedProblemIdCounter = 0;',
      'export const generateProblems = (...args) => {',
      '  globalThis.__skillSystemGenerateProblemsCalls += 1;',
      '  return dslEngine.generateProblems(...args).map((item) => ({',
      '    ...item,',
      '    id: `${item.id}::${globalThis.__skillSystemGeneratedProblemIdCounter++}`',
      '  }));',
      '};',
      'export const generateRuntimeProblems = (...args) => generateProblems(...args).map((item) => ({',
      '  ...item,',
      '  question: item.patternKey === "E1-NUM-COMPARE-01" ? `${item.variables?.a ?? 0} と ${item.variables?.b ?? 0}\\nどちらが小さい？` : item.question,',
      '  answer: item.patternKey === "E1-NUM-COMPARE-01" ? String(Math.min(item.variables?.a ?? 0, item.variables?.b ?? 0)) : item.answer,',
      '  meta: { ...(item.meta ?? {}), source: "runtime-pattern" }',
      '}));'
    ].join("\n"),
    "utf8"
  );
  await transpileTsModule(skillTypesSource, skillTypesOutput);
  await transpileTsModule(skillTreeSource, skillTreeOutput, [
    ['from "./skills.json"', 'from "./skills.mjs"']
  ]);
  await transpileTsModule(skillEngineSource, skillEngineOutput, [
    ['from "packages/problem-engine"', 'from "./problem-engine.mjs"'],
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
    ['from "./skills.json"', 'from "./skills.mjs"']
  ]);

  const skillTree = await import(`${pathToFileURL(skillTreeOutput).href}?t=${Date.now()}`);
  const skillEngine = await import(`${pathToFileURL(skillEngineOutput).href}?t=${Date.now()}`);
  return { skillTree, skillEngine };
};

test("skill tree exposes typed skill relationships", async () => {
  const { skillTree } = await loadSkillSystemModules();

  assert.deepEqual(skillTree.getSkill("E1_NUMBER_COUNT"), {
    id: "E1_NUMBER_COUNT",
    title: "1〜20をかぞえる",
    titleKana: "1〜20をかぞえる",
    grade: "E1",
    gradeLevel: "1",
    patterns: ["E1_NUMBER_COUNT"],
    difficulty: 1,
    requiredXP: 100
  });
  assert.deepEqual(skillTree.getPrerequisites("E1_FACT_FAMILY"), ["E1_SUB_BORROW"]);
  assert.deepEqual(skillTree.getNextSkills("E1_NUMBER_COUNT").map((skill) => skill.id), ["E1_NUMBER_ORDER"]);
  assert.deepEqual(skillTree.getSkill("E1_ADD_10")?.patterns, ["E1_ADD_10"]);
  assert.deepEqual(
    skillTree.getRootSkills().map((skill) => skill.id).sort(),
    ["E1_NUMBER_COUNT", "E2_ADD_2DIGIT", "H1_BINOMIAL"]
  );
});

test("getSkillTree reflects unlocked and mastered flags from state", async () => {
  const { skillTree } = await loadSkillSystemModules();

  const nodes = skillTree.getSkillTree({
    unlockedSkills: ["E1_NUMBER_COUNT", "E1_ADD_BASIC"],
    skillMastery: {
      E1_ADD_BASIC: 0.8
    },
    skillXP: {
      E1_ADD_BASIC: 40
    },
    skillProgress: {
      E1_NUMBER_COUNT: { mastery: 0.7, mastered: false },
      E1_ADD_BASIC: { mastery: 0.8, mastered: false },
      E1_FACT_FAMILY: { mastery: 0.2, mastered: true }
    }
  });

  assert.deepEqual(
    nodes.find((node) => node.id === "E1_ADD_BASIC"),
    {
      id: "E1_ADD_BASIC",
      title: "1けたの たしざん",
      gradeLevel: "1",
      difficulty: 3,
      requiredXP: 100,
      prerequisite: ["E1_ADD_NEAR_DOUBLES"],
      unlocked: true,
      mastered: false,
      mastery: 0.4,
      xp: 40,
      nextSkills: ["E1_ADD_10"],
      status: "LEARNING"
    }
  );
  assert.deepEqual(
    nodes.find((node) => node.id === "E1_FACT_FAMILY"),
    {
      id: "E1_FACT_FAMILY",
      title: "たしざんと ひきざんの かんけい",
      gradeLevel: "1",
      difficulty: 4,
      requiredXP: 100,
      prerequisite: ["E1_SUB_BORROW"],
      unlocked: false,
      mastered: true,
      mastery: 0,
      xp: 0,
      nextSkills: [],
      status: "MASTERED"
    }
  );
});

test("generateSkillQuiz returns GeneratedProblem-like items for E1_ADD_BASIC", async () => {
  const { skillEngine } = await loadSkillSystemModules();

  const generated = skillEngine.generateSkillQuiz("E1_ADD_BASIC", 5);

  assert.equal(generated.length, 5);
  for (const item of generated) {
    assert.equal(typeof item.id, "string");
    assert.equal(typeof item.question, "string");
    assert.equal(typeof item.answer, "string");
  }
});

test("generateSkillQuiz returns GeneratedProblem-like items for E1_ADD_10", async () => {
  const { skillEngine } = await loadSkillSystemModules();

  const generated = skillEngine.generateSkillQuiz("E1_ADD_10", 5);
  const patternKeys = new Set(generated.map((item) => item.patternKey ?? item.id.split(":")[0]));

  assert.equal(generated.length, 5);
  assert.equal([...patternKeys].every((key) => key.startsWith("E1-ADD-MAKE10")), true);
  for (const item of generated) {
    assert.equal(typeof item.id, "string");
    assert.equal(typeof item.question, "string");
    assert.equal(typeof item.answer, "string");
  }
});

test("generateSkillQuiz returns GeneratedProblem-like items for E1_ADD_ONE via runtime proxy", async () => {
  const { skillEngine } = await loadSkillSystemModules();

  const generated = skillEngine.generateSkillQuiz("E1_ADD_ONE", 5);

  assert.equal(generated.length, 5);
  for (const item of generated) {
    assert.equal(typeof item.id, "string");
    assert.equal(typeof item.question, "string");
    assert.equal(typeof item.answer, "string");
  }
});

test("generateSkillQuiz mixes multiple patterns for E1_ADD_BASIC", async () => {
  const { skillEngine } = await loadSkillSystemModules();

  const generated = skillEngine.generateSkillQuiz("E1_ADD_BASIC", 5);
  const patternKeys = new Set(generated.map((item) => item.patternKey ?? item.id.split(":")[0]));

  assert.equal(generated.length, 5);
  assert.equal(patternKeys.size > 1, true);
});

test("generateSkillQuiz reuses cached stock per pattern", async () => {
  const { skillEngine } = await loadSkillSystemModules();

  globalThis.__skillSystemGenerateProblemsCalls = 0;

  const first = skillEngine.generateSkillQuiz("E1_ADD_BASIC", 5);
  const second = skillEngine.generateSkillQuiz("E1_ADD_BASIC", 5);

  assert.equal(first.length, 5);
  assert.equal(second.length, 5);
  assert.equal(globalThis.__skillSystemGenerateProblemsCalls >= 5, true);
  assert.equal(globalThis.__skillSystemGenerateProblemsCalls <= 10, true);
  assert.equal(
    first.every((item) => !second.some((next) => next.id === item.id)),
    true
  );
});

test("generateSkillQuiz reshuffles after stock exhaustion and continues serving quizzes", async () => {
  const { skillEngine } = await loadSkillSystemModules();

  globalThis.__skillSystemGenerateProblemsCalls = 0;

  const seen = new Set();
  for (let i = 0; i < 40; i += 1) {
    const batch = skillEngine.generateSkillQuiz("E1_ADD_BASIC", 5);
    assert.equal(batch.length, 5);
    for (const item of batch) {
      seen.add(item.id);
    }
  }

  const reshuffled = withMockedRandom([0], () =>
    skillEngine.generateSkillQuiz("E1_ADD_BASIC", 5).map((item) => item.id)
  );
  const nextBatch = withMockedRandom([0.99], () =>
    skillEngine.generateSkillQuiz("E1_ADD_BASIC", 5).map((item) => item.id)
  );

  assert.equal(seen.size >= 50, true);
  assert.equal(reshuffled.length, 5);
  assert.equal(nextBatch.length, 5);
  assert.notDeepEqual(reshuffled, nextBatch);
  assert.equal(globalThis.__skillSystemGenerateProblemsCalls, 5);
});

test("generateSkillQuiz returns empty array for non-positive count", async () => {
  const { skillEngine } = await loadSkillSystemModules();

  assert.deepEqual(skillEngine.generateSkillQuiz("E1_ADD_BASIC", 0), []);
  assert.deepEqual(skillEngine.generateSkillQuiz("E1_ADD_BASIC", -3), []);
});

test("generateSkillQuiz throws for unknown skill", async () => {
  const { skillEngine } = await loadSkillSystemModules();
  assert.throws(() => skillEngine.generateSkillQuiz("UNKNOWN", 5), /Skill not found/);
});

test("generateSkillQuiz throws for unresolved pattern entries", async () => {
  const { skillEngine } = await loadSkillSystemModules();
  assert.throws(
    () => skillEngine.generateSkillQuiz("H1_BINOMIAL", 5),
    /Pattern not available for skill: H1_BINOMIAL/
  );
});

test("generateSkillQuiz returns GeneratedProblem-like items for new E1 and E2 skills", async () => {
  const { skillEngine } = await loadSkillSystemModules();

  for (const skillId of ["E1_NUMBER_COUNT", "E1_NUMBER_ORDER", "E1_NUMBER_LINE", "E1_SUB_BASIC", "E1_SUB_FACTS", "E1_SUB_BORROW", "E1_NUMBER_COMPARE", "E1_NUMBER_COMPOSE", "E1_NUMBER_DECOMPOSE", "E1_FACT_FAMILY", "E2_ADD_2DIGIT", "E2_SUB_2DIGIT"]) {
    const generated = skillEngine.generateSkillQuiz(skillId, 5);
    assert.equal(generated.length, 5, skillId);
    for (const item of generated) {
      assert.equal(typeof item.id, "string");
      assert.equal(typeof item.question, "string");
      assert.equal(typeof item.answer, "string");
      assert.equal(typeof item.patternKey, "string");
      assert.equal(typeof item.meta?.difficulty, "number");
    }
  }
});

test("generateSkillQuiz uses runtime compare answer format for E1_NUMBER_COMPARE", async () => {
  const { skillEngine } = await loadSkillSystemModules();

  const generated = skillEngine.generateSkillQuiz("E1_NUMBER_COMPARE", 5);

  assert.equal(generated.length, 5);
  assert.equal(generated.every((item) => item.patternKey === "E1-NUM-COMPARE-01"), true);
  assert.equal(generated.every((item) => item.answer === String(Math.min(item.variables?.a ?? 0, item.variables?.b ?? 0))), true);
});
