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

const loadValidationModules = async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "problem-validation-"));

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
  await transpileTsModule(
    path.join(root, "packages/problem-engine/patternIndex.ts"),
    path.join(tempDir, "patternIndex.mjs")
  );
  await transpileTsModule(
    path.join(root, "packages/problem-engine/patternCatalog.ts"),
    path.join(tempDir, "patternCatalog.mjs"),
    [['from "./patternIndex.ts"', 'from "./patternIndex.mjs"']]
  );
  await transpileTsModule(
    path.join(root, "packages/problem-engine/patternFamilyResolver.ts"),
    path.join(tempDir, "patternFamilyResolver.mjs")
  );
  await transpileTsModule(
    path.join(root, "packages/problem-engine/difficulty/numberDifficulty.ts"),
    path.join(tempDir, "numberDifficulty.mjs"),
    [
      ['from "../dsl-engine"', 'from "./dsl-engine.mjs"'],
      ['from "../patternFamilyResolver"', 'from "./patternFamilyResolver.mjs"']
    ]
  );
  await transpileTsModule(
    path.join(root, "packages/problem-engine/runtimeProblems.ts"),
    path.join(tempDir, "runtimeProblems.mjs"),
    [
      ['from "./dsl-engine"', 'from "./dsl-engine.mjs"'],
      ['from "./difficulty/numberDifficulty"', 'from "./numberDifficulty.mjs"']
    ]
  );
  fs.writeFileSync(
    path.join(tempDir, "problem-engine.mjs"),
    [
      'export { getPatternMeta } from "./patternCatalog.mjs";',
      'export { computeNumberDifficulty } from "./numberDifficulty.mjs";',
      'export { resolvePatternFamily } from "./patternFamilyResolver.mjs";',
      'export { evaluateAnswer, evaluateConstraints, generateProblems } from "./dsl-engine.mjs";',
      'export { generateRuntimeProblem, generateRuntimeProblems } from "./runtimeProblems.mjs";',
      'export * from "./dsl-engine.mjs";'
    ].join("\n"),
    "utf8"
  );
  await transpileTsModule(
    path.join(root, "packages/skill-system/skillTypes.ts"),
    path.join(tempDir, "skillTypes.mjs")
  );
  await transpileTsModule(
    path.join(root, "packages/skill-system/skillTree.ts"),
    path.join(tempDir, "skillTree.mjs"),
    [['from "./skills.json"', 'from "./skills.mjs"']]
  );

  await transpileTsModule(
    path.join(root, "packages/problem-validation/types.ts"),
    path.join(tempDir, "types.mjs"),
    [
      ['from "packages/problem-engine"', 'from "./problem-engine.mjs"'],
      ['from "packages/skill-system/skillTypes"', 'from "./skillTypes.mjs"']
    ]
  );
  await transpileTsModule(
    path.join(root, "packages/problem-validation/rules/mathRules.ts"),
    path.join(tempDir, "mathRules.mjs"),
    [
      ['from "packages/problem-engine"', 'from "./problem-engine.mjs"'],
      ['from "../types"', 'from "./types.mjs"']
    ]
  );
  await transpileTsModule(
    path.join(root, "packages/problem-validation/rules/distributionRules.ts"),
    path.join(tempDir, "distributionRules.mjs"),
    [['from "../types"', 'from "./types.mjs"']]
  );
  await transpileTsModule(
    path.join(root, "packages/problem-validation/rules/difficultyRules.ts"),
    path.join(tempDir, "difficultyRules.mjs"),
    [
      ['from "packages/problem-engine"', 'from "./problem-engine.mjs"'],
      ['from "../types"', 'from "./types.mjs"']
    ]
  );
  await transpileTsModule(
    path.join(root, "packages/problem-validation/rules/gradeRules.ts"),
    path.join(tempDir, "gradeRules.mjs"),
    [['from "../types"', 'from "./types.mjs"']]
  );
  await transpileTsModule(
    path.join(root, "packages/problem-validation/rules/digitRules.ts"),
    path.join(tempDir, "digitRules.mjs"),
    [['from "../types"', 'from "./types.mjs"']]
  );
  await transpileTsModule(
    path.join(root, "packages/problem-validation/rules/addRules.ts"),
    path.join(tempDir, "addRules.mjs"),
    [['from "../types"', 'from "./types.mjs"']]
  );
  await transpileTsModule(
    path.join(root, "packages/problem-validation/rules/subRules.ts"),
    path.join(tempDir, "subRules.mjs"),
    [['from "../types"', 'from "./types.mjs"']]
  );
  await transpileTsModule(
    path.join(root, "packages/problem-validation/rules/sumRules.ts"),
    path.join(tempDir, "sumRules.mjs"),
    [['from "../types"', 'from "./types.mjs"']]
  );
  await transpileTsModule(
    path.join(root, "packages/problem-validation/rules/numberRules.ts"),
    path.join(tempDir, "numberRules.mjs"),
    [
      ['from "packages/problem-engine"', 'from "./problem-engine.mjs"'],
      ['from "../types"', 'from "./types.mjs"']
    ]
  );
  await transpileTsModule(
    path.join(root, "packages/problem-validation/skillRules.ts"),
    path.join(tempDir, "skillRules.mjs"),
    [
      ['from "./types"', 'from "./types.mjs"'],
      ['from "./rules/mathRules"', 'from "./mathRules.mjs"'],
      ['from "./rules/difficultyRules"', 'from "./difficultyRules.mjs"'],
      ['from "./rules/gradeRules"', 'from "./gradeRules.mjs"'],
      ['from "./rules/distributionRules"', 'from "./distributionRules.mjs"'],
      ['from "./rules/digitRules"', 'from "./digitRules.mjs"'],
      ['from "./rules/addRules"', 'from "./addRules.mjs"'],
      ['from "./rules/subRules"', 'from "./subRules.mjs"'],
      ['from "./rules/sumRules"', 'from "./sumRules.mjs"'],
      ['from "./rules/numberRules"', 'from "./numberRules.mjs"']
    ]
  );
  await transpileTsModule(
    path.join(root, "packages/problem-validation/problemValidator.ts"),
    path.join(tempDir, "problemValidator.mjs"),
    [
      ['from "packages/skill-system/skillTypes"', 'from "./skillTypes.mjs"'],
      ['from "packages/problem-engine"', 'from "./problem-engine.mjs"'],
      ['from "./skillRules"', 'from "./skillRules.mjs"'],
      ['from "./types"', 'from "./types.mjs"']
    ]
  );
  await transpileTsModule(
    path.join(root, "packages/problem-validation/generatorTest.ts"),
    path.join(tempDir, "generatorTest.mjs"),
    [
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
      ['from "packages/problem-engine"', 'from "./problem-engine.mjs"'],
      ['from "packages/skill-system/skillTree"', 'from "./skillTree.mjs"'],
      ['from "packages/skill-system/skillTypes"', 'from "./skillTypes.mjs"'],
      ['from "./problemValidator"', 'from "./problemValidator.mjs"']
    ]
  );

  const modules = {
    dsl: await import(`${pathToFileURL(path.join(tempDir, "dsl-engine.mjs")).href}?t=${Date.now()}`),
    problemEngine: await import(`${pathToFileURL(path.join(tempDir, "problem-engine.mjs")).href}?t=${Date.now()}`),
    runtimeProblems: await import(`${pathToFileURL(path.join(tempDir, "runtimeProblems.mjs")).href}?t=${Date.now()}`),
    tree: await import(`${pathToFileURL(path.join(tempDir, "skillTree.mjs")).href}?t=${Date.now()}`),
    validator: await import(`${pathToFileURL(path.join(tempDir, "problemValidator.mjs")).href}?t=${Date.now()}`),
    harness: await import(`${pathToFileURL(path.join(tempDir, "generatorTest.mjs")).href}?t=${Date.now()}`),
    ruleRegistry: await import(`${pathToFileURL(path.join(tempDir, "skillRules.mjs")).href}?t=${Date.now()}`),
    distributionRules: await import(`${pathToFileURL(path.join(tempDir, "distributionRules.mjs")).href}?t=${Date.now()}`),
    numberRules: await import(`${pathToFileURL(path.join(tempDir, "numberRules.mjs")).href}?t=${Date.now()}`),
    addBasic: (await import(`${pathToFileURL(path.join(tempDir, "add-basic.mjs")).href}?t=${Date.now()}`)).default,
    addMake10: (await import(`${pathToFileURL(path.join(tempDir, "add-make10.mjs")).href}?t=${Date.now()}`)).default
  };

  return modules;
};

test("problem validation harness validates 1000 generated problems for supported E1 skills", async () => {
  const { harness } = await loadValidationModules();

  for (const skillId of [
    "E1_NUMBER_COUNT",
    "E1_NUMBER_ORDER",
    "E1_NUMBER_COMPARE",
    "E1_NUMBER_COMPOSE",
    "E1_NUMBER_DECOMPOSE",
    "E1_NUMBER_LINE",
    "E1_ADD_ZERO",
    "E1_ADD_ONE",
    "E1_ADD_DOUBLES",
    "E1_ADD_NEAR_DOUBLES",
    "E1_ADD_BASIC",
    "E1_ADD_10",
    "E1_ADD_CARRY",
    "E1_SUB_BASIC",
    "E1_SUB_FACTS",
    "E1_SUB_BORROW",
    "E1_FACT_FAMILY"
  ]) {
    const summary = harness.validateSkillGenerator(skillId, 1000);
    assert.equal(summary.skillId, skillId);
    assert.equal(summary.checked >= 1000, true);
  }
});

test("problem validator applies skill-specific arithmetic rules", async () => {
  const { tree, validator, addMake10 } = await loadValidationModules();
  const skill = tree.getSkill("E1_ADD_10");
  const pattern = addMake10[0];

  assert.ok(skill);

  const invalidProblem = {
    id: "E1-ADD-MAKE10-INVALID",
    question: "6 + 3",
    answer: "9",
    patternKey: pattern.key,
    variables: { a: 6, b: 3 },
    meta: { difficulty: 1 }
  };

  const result = validator.validateProblem(invalidProblem, pattern, skill);
  assert.equal(result.valid, false);
  assert.equal(result.error, "constraint violation");
});

test("problem validation keeps common rules and unresolved skill patterns fail fast", async () => {
  const { harness, ruleRegistry } = await loadValidationModules();

  assert.equal(Array.isArray(ruleRegistry.commonSingleRules), true);
  assert.equal(ruleRegistry.commonSingleRules.length > 0, true);
  assert.equal(Array.isArray(ruleRegistry.commonBatchRules), true);
  assert.equal(ruleRegistry.commonBatchRules.length > 0, true);
  assert.throws(
    () => harness.validateSkillGenerator("H1_BINOMIAL", 100),
    /Pattern not found for skill pattern: EXPAND_BINOMIAL_BASIC/
  );
});

test("problem validator rejects negative E1 answers through grade pedagogy rules", async () => {
  const { tree, validator, addBasic } = await loadValidationModules();
  const skill = tree.getSkill("E1_ADD_BASIC");
  const pattern = addBasic[0];

  assert.ok(skill);

  const invalidProblem = {
    id: "E1-ADD-BASIC-NEGATIVE",
    question: "1 + 2",
    answer: "-1",
    patternKey: pattern.key,
    variables: { a: 1, b: 2 },
    meta: { difficulty: 1 }
  };

  const result = validator.validateProblem(invalidProblem, pattern, skill);
  assert.equal(result.valid, false);
  assert.equal(result.error, "negative not allowed");
});

test("problem batch validator detects low variety batches", async () => {
  const { tree, validator, addMake10, distributionRules } = await loadValidationModules();
  const skill = tree.getSkill("E1_ADD_10");
  const pattern = addMake10[0];

  assert.ok(skill);
  assert.equal(typeof distributionRules.validateDistribution, "function");

  const repeated = Array.from({ length: 1000 }, (_, index) => ({
    id: `repeat-${index}`,
    question: "5 + 5",
    answer: "10",
    patternKey: pattern.key,
    variables: { a: 5, b: 5 },
    meta: { difficulty: 1 }
  }));

  const result = validator.validateProblemBatch(repeated, pattern, skill);
  assert.equal(result.valid, false);
  assert.equal(result.error, "low problem variety");
});

test("number rules validate count/order/compare/compose/decompose/line semantics", async () => {
  const { numberRules } = await loadValidationModules();

  assert.equal(
    numberRules.validateNumberCount({
      problem: {
        id: "count-1",
        question: "7 を かぞえると いくつ？",
        answer: "7",
        patternKey: "E1-NUM-COUNT-01",
        variables: { n: 7 },
        meta: { difficulty: 1 }
      },
      pattern: { key: "E1-NUM-COUNT-01" },
      skill: { id: "E1_NUMBER_COUNT", title: "かずをかぞえる", grade: "E1", patterns: ["E1_NUMBER_COUNT"] }
    }).valid,
    true
  );

  assert.equal(
    numberRules.validateNumberOrder({
      problem: {
        id: "order-1",
        question: "8 と 3\nどちらが小さい？",
        answer: "3",
        patternKey: "E1-NUM-ORDER-01",
        variables: { a: 8, b: 3 },
        meta: { difficulty: 1 }
      },
      pattern: { key: "E1-NUM-ORDER-01" },
      skill: { id: "E1_NUMBER_ORDER", title: "数の順番", grade: "E1", patterns: ["E1_NUMBER_ORDER"] }
    }).valid,
    true
  );

  assert.equal(
    numberRules.validateNumberCompare({
      problem: {
        id: "cmp-1",
        question: "3 と 5\nどちらが小さい？",
        answer: "3",
        patternKey: "E1-NUM-COMPARE-01",
        variables: { a: 3, b: 5 },
        meta: { difficulty: 1 }
      },
      pattern: { key: "E1-NUM-COMPARE-01" },
      skill: { id: "E1_NUMBER_COMPARE", title: "数のくらべ", grade: "E1", patterns: ["E1_NUMBER_COMPARE"] }
    }).valid,
    true
  );

  assert.equal(
    numberRules.validateNumberCompose({
      problem: {
        id: "comp-1",
        question: "4 + 6 =",
        answer: "10",
        patternKey: "E1-NUM-COMPOSE-01",
        variables: { a: 4, b: 6 },
        meta: { difficulty: 1 }
      },
      pattern: { key: "E1-NUM-COMPOSE-01" },
      skill: { id: "E1_NUMBER_COMPOSE", title: "数のごうせい", grade: "E1", patterns: ["E1_NUMBER_COMPOSE"] }
    }).valid,
    true
  );

  assert.equal(
    numberRules.validateNumberDecompose({
      problem: {
        id: "decomp-1",
        question: "10 は7と？でできます。",
        answer: "3",
        patternKey: "E1-NUM-DECOMPOSE-01",
        variables: { whole: 10, known: 7 },
        meta: { difficulty: 1 }
      },
      pattern: { key: "E1-NUM-DECOMPOSE-01" },
      skill: { id: "E1_NUMBER_DECOMPOSE", title: "数のぶんかい", grade: "E1", patterns: ["E1_NUMBER_DECOMPOSE"] }
    }).valid,
    true
  );

  assert.equal(
    numberRules.validateNumberLine({
      problem: {
        id: "line-1",
        question: "3 から 5 すすめると どこ？",
        answer: "8",
        patternKey: "E1-NUM-LINE-01",
        variables: { start: 3, move: 5 },
        meta: { difficulty: 1 }
      },
      pattern: { key: "E1-NUM-LINE-01" },
      skill: { id: "E1_NUMBER_LINE", title: "数直線", grade: "E1", patterns: ["E1_NUMBER_LINE"] }
    }).valid,
    true
  );
});

test("problem validator applies number skill semantic rules", async () => {
  const { tree, validator } = await loadValidationModules();
  const compareSkill = tree.getSkill("E1_NUMBER_COMPARE");
  const orderSkill = tree.getSkill("E1_NUMBER_ORDER");
  const composeSkill = tree.getSkill("E1_NUMBER_COMPOSE");
  const decomposeSkill = tree.getSkill("E1_NUMBER_DECOMPOSE");

  assert.ok(compareSkill);
  assert.ok(orderSkill);
  assert.ok(composeSkill);
  assert.ok(decomposeSkill);

  assert.equal(
    validator.validateProblem(
      {
        id: "order-invalid",
        question: "8 と 3\nどちらが小さい？",
        answer: "8",
        patternKey: "E1-NUM-ORDER-01",
        variables: { a: 8, b: 3 },
        meta: { difficulty: 1 }
      },
      {
        key: "E1-NUM-ORDER-01",
        template: "{a} と {b}\nどちらが小さい？",
        variables: { a: [0, 20], b: [0, 20] },
        constraints: ["a != b"],
        answer: "min(a, b)"
      },
      orderSkill
    ).error,
    "wrong answer"
  );

  assert.equal(
    validator.validateProblem(
      {
        id: "cmp-invalid",
        question: "3 と 5\nどちらが小さい？",
        answer: "5",
        patternKey: "E1-NUM-COMPARE-01",
        variables: { a: 3, b: 5 },
        meta: { difficulty: 1 }
      },
      { key: "E1-NUM-COMPARE-01" },
      compareSkill
    ).error,
    "compare result mismatch"
  );

  assert.equal(
    validator.validateProblem(
      {
        id: "compose-invalid",
        question: "7 + 3 =",
        answer: "11",
        patternKey: "E1-NUM-COMPOSE-01",
        variables: { a: 7, b: 3 },
        meta: { difficulty: 2 }
      },
      { key: "E1-NUM-COMPOSE-01", template: "{a} + {b} =", variables: { a: [0, 10], b: [0, 10] }, constraints: ["b == 10 - a"], answer: "a + b" },
      composeSkill
    ).error,
    "wrong answer"
  );

  assert.equal(
    validator.validateProblem(
      {
        id: "decompose-invalid",
        question: "10 は7と？でできます。",
        answer: "-3",
        patternKey: "E1-NUM-DECOMPOSE-01",
        variables: { whole: 10, a: 7, b: 3 },
        meta: { difficulty: 1 }
      },
      { key: "E1-NUM-DECOMPOSE-01", template: "{whole} は {a} と ？", variables: { whole: [10, 10], a: [0, 10], b: [0, 10] }, constraints: ["whole == 10", "b == whole - a"], answer: "b" },
      decomposeSkill
    ).error,
    "negative not allowed"
  );
});

test("runtime-backed number skills use runtime generator path in validation harness", () => {
  const source = fs.readFileSync(path.join(root, "packages/problem-validation/generatorTest.ts"), "utf8");
  assert.equal(source.includes('const runtimeMandatorySkills = new Set(["E1_NUMBER_COMPARE"]);'), true);
  assert.equal(source.includes("generateRuntimeProblems(pattern, perPatternCount)"), true);
});

test("runtimeProblems delegates number difficulty to shared module", () => {
  const source = fs.readFileSync(path.join(root, "packages/problem-engine/runtimeProblems.ts"), "utf8");
  assert.equal(source.includes('from "./difficulty/numberDifficulty"'), true);
  assert.equal(source.includes("const computeCompareDifficulty"), false);
  assert.equal(source.includes("const computeComposeDifficulty"), false);
  assert.equal(source.includes("const computeDecomposeDifficulty"), false);
  assert.equal(source.includes("export const computeNumberDifficulty"), false);
});

test("resolvePatternFamily normalizes current and future number keys", async () => {
  const { problemEngine } = await loadValidationModules();

  assert.equal(problemEngine.resolvePatternFamily("E1-NUM-COMPARE-01"), "number_compare");
  assert.equal(problemEngine.resolvePatternFamily("E1-NUM-COMPOSE-01"), "number_compose");
  assert.equal(problemEngine.resolvePatternFamily("E1-NUM-DECOMPOSE-01"), "number_decompose");
  assert.equal(problemEngine.resolvePatternFamily("number_compare.v2"), "number_compare");
  assert.equal(problemEngine.resolvePatternFamily("UNKNOWN-PATTERN-01"), "unknown_pattern");
  assert.equal(problemEngine.resolvePatternFamily(undefined), undefined);
});

test("patternFamilyResolver uses registry mapping instead of startsWith branching", () => {
  const source = fs.readFileSync(
    path.join(root, "packages/problem-engine/patternFamilyResolver.ts"),
    "utf8"
  );

  assert.equal(source.includes("const patternFamilyMap"), true);
  assert.equal(source.includes("startsWith("), false);
  assert.equal(source.includes("patternFamilyMap[candidate]"), true);
  assert.equal(source.includes('e1_num_compare: "number_compare"'), true);
  assert.equal(source.includes('number_compare: "number_compare"'), true);
});

test("numberDifficulty resolves difficulty from patternKey family mapping, not skillId", () => {
  const source = fs.readFileSync(
    path.join(root, "packages/problem-engine/difficulty/numberDifficulty.ts"),
    "utf8"
  );

  assert.equal(source.includes("problem.skillId"), false);
  assert.equal(source.includes('from "../patternFamilyResolver"'), true);
  assert.equal(source.includes("NUMBER_PATTERN_FAMILIES"), false);
  assert.equal(source.includes("resolveNumberPatternFamily"), false);
  assert.equal(source.includes("resolvePatternFamily(problem.patternKey)"), true);
  assert.equal(source.includes('patternFamily === "number_compare"'), true);
  assert.equal(source.includes('patternFamily === "number_compose"'), true);
  assert.equal(source.includes('patternFamily === "number_decompose"'), true);
});

test("numberRules use shared pattern family resolver", () => {
  const source = fs.readFileSync(path.join(root, "packages/problem-validation/rules/numberRules.ts"), "utf8");

  assert.equal(source.includes('import { resolvePatternFamily } from "packages/problem-engine";'), true);
  assert.equal(source.includes('resolvePatternFamily(problem.patternKey) !== "number_compare"'), true);
  assert.equal(source.includes('resolvePatternFamily(problem.patternKey) !== "number_compose"'), true);
  assert.equal(source.includes('resolvePatternFamily(problem.patternKey) !== "number_decompose"'), true);
});

test("runtime number patterns assign tuned difficulty bands", async () => {
  const { problemEngine } = await loadValidationModules();

  assert.equal(
    problemEngine.computeNumberDifficulty({
      patternKey: "E1-NUM-ORDER-01",
      variables: { a: 2, b: 3 }
    }),
    1
  );
  assert.equal(
    problemEngine.computeNumberDifficulty({
      patternKey: "E1-NUM-ORDER-01",
      variables: { a: 12, b: 18 }
    }),
    2
  );

  assert.equal(
    problemEngine.computeNumberDifficulty({
      patternKey: "E1-NUM-COMPARE-01",
      variables: { a: 3, b: 5 }
    }),
    1
  );
  assert.equal(
    problemEngine.computeNumberDifficulty({
      patternKey: "E1-NUM-COMPARE-01",
      variables: { a: 6, b: 10 }
    }),
    2
  );
  assert.equal(
    problemEngine.computeNumberDifficulty({
      patternKey: "E1-NUM-COMPARE-01",
      variables: { a: 11, b: 20 }
    }),
    3
  );

  assert.equal(
    problemEngine.computeNumberDifficulty({
      patternKey: "E1-NUM-COMPOSE-01",
      variables: { a: 2, b: 3 }
    }),
    1
  );
  assert.equal(
    problemEngine.computeNumberDifficulty({
      patternKey: "E1-NUM-COMPOSE-01",
      variables: { a: 4, b: 6 }
    }),
    2
  );

  assert.equal(
    problemEngine.computeNumberDifficulty({
      patternKey: "E1-NUM-DECOMPOSE-01",
      variables: { whole: 5, known: 2 }
    }),
    1
  );
  assert.equal(
    problemEngine.computeNumberDifficulty({
      patternKey: "E1-NUM-DECOMPOSE-01",
      variables: { whole: 10, known: 7 }
    }),
    2
  );
  assert.equal(
    problemEngine.computeNumberDifficulty({
      patternKey: "E1-NUM-LINE-01",
      variables: { start: 2, move: 3 }
    }),
    1
  );
  assert.equal(
    problemEngine.computeNumberDifficulty({
      patternKey: "E1-NUM-LINE-01",
      variables: { start: 10, move: 9 }
    }),
    2
  );
});

test("runtime number source produces expected difficulty distributions", async () => {
  const { runtimeProblems } = await loadValidationModules();

  const comparePattern = {
    key: "E1-NUM-COMPARE-01",
    template: "{a} ? {b}",
    variables: { a: [0, 20], b: [0, 20] },
    constraints: ["a != b"],
    answer: "a < b"
  };
  const composePattern = {
    key: "E1-NUM-COMPOSE-01",
    template: "{a} + {b} =",
    variables: { a: [0, 10], b: [0, 10] },
    constraints: ["b == 10 - a"],
    answer: "a + b"
  };
  const decomposePattern = {
    key: "E1-NUM-DECOMPOSE-01",
    template: "{whole} は{known}と？でできます。",
    variables: { whole: [1, 10], known: [0, 10] },
    constraints: ["known <= whole"],
    answer: "whole - known"
  };

  const compareDifficulties = new Set(
    runtimeProblems.generateRuntimeProblems(comparePattern, 1000).map((problem) => problem.meta?.difficulty)
  );
  const composeDifficulties = new Set(
    runtimeProblems.generateRuntimeProblems(composePattern, 1000).map((problem) => problem.meta?.difficulty)
  );
  const decomposeDifficulties = new Set(
    runtimeProblems.generateRuntimeProblems(decomposePattern, 1000).map((problem) => problem.meta?.difficulty)
  );

  assert.deepEqual([...compareDifficulties].sort(), [1, 2, 3]);
  assert.deepEqual([...composeDifficulties].sort(), [2]);
  assert.deepEqual([...decomposeDifficulties].sort(), [1, 2]);
});
