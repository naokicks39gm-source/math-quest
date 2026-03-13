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
  ['from "./progress-utils"', 'from "./progress-utils.mjs"'],
  ['from "./patternProgressTracker"', 'from "./patternProgressTracker.mjs"'],
  ['from "./skillProgressTracker"', 'from "./skillProgressTracker.mjs"'],
  ['from "./difficultyController"', 'from "./difficultyController.mjs"'],
  ['from "./weaknessAnalyzer"', 'from "./weaknessAnalyzer.mjs"'],
  ['from "./sessionBuilder"', 'from "./sessionBuilder.mjs"'],
  ['from "./learningEngine"', 'from "./learningEngine.mjs"'],
  ['from "./skill-unlock"', 'from "./skill-unlock.mjs"'],
  ['from "./progression-engine"', 'from "./progression-engine.mjs"'],
  ['from "./index"', 'from "./index.mjs"']
];

const createSkillSystemStub = (outputPath) => {
  fs.writeFileSync(
    outputPath,
    [
      'const skillPatterns = {',
      '  E1_ADD_BASIC: ["E1_ADD_BASIC"]',
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
      "let generationBatch = 0;",
      'const difficultyByPattern = { "E1-ADD-BASIC-01": 3, "E1-ADD-BASIC-02": 3, "E1-ADD-BASIC-03": 3 };',
      "export const getPatternMeta = (key) =>",
      "  difficultyByPattern[key] ? { key, difficulty: difficultyByPattern[key] } : undefined;",
      "export const generateProblems = (pattern, count) => {",
      "  generationBatch += 1;",
      "  return Array.from({ length: count }, (_, index) => ({",
      '    id: `${pattern.key}::${generationBatch}::${index}`,',
      '    patternKey: pattern.key,',
      '    question: `${pattern.key} question ${generationBatch}-${index}`,',
      '    answer: `${index}`,',
      "    meta: { difficulty: difficultyByPattern[pattern.key] ?? 3, patternId: pattern.key }",
      "  }));",
      "};",
      "export const generateRuntimeProblems = (pattern, count) => generateProblems(pattern, count);"
    ].join("\n"),
    "utf8"
  );
};

const createProblemHintStub = (outputPath) => {
  fs.writeFileSync(
    outputPath,
    'export const DEFAULT_HINT = "もういちど よく みてみよう";\nexport const generateHint = (problem) => `${problem.patternKey ?? "pattern"} hint`;\n',
    "utf8"
  );
};

const createProblemExplanationStub = (outputPath) => {
  fs.writeFileSync(
    outputPath,
    'export const DEFAULT_EXPLANATION = "こたえを たしかめよう";\nexport const generateExplanation = (problem) => `${problem.patternKey ?? "pattern"} explanation`;\n',
    "utf8"
  );
};

const createNextServerStub = (outputPath) => {
  fs.writeFileSync(
    outputPath,
    [
      "export const NextResponse = {",
      "  json(body, init = {}) {",
      "    return {",
      "      status: init.status ?? 200,",
      "      async json() {",
      "        return body;",
      "      }",
      "    };",
      "  }",
      "};"
    ].join("\n"),
    "utf8"
  );
};

const createDbStub = (outputPath) => {
  fs.writeFileSync(
    outputPath,
    [
      "export const persistedSessions = [];",
      "export const upsertLearningSession = (session) => {",
      "  persistedSessions.push(session);",
      "};"
    ].join("\n"),
    "utf8"
  );
};

const createProblemFormatStub = (outputPath) => {
  fs.writeFileSync(outputPath, "export {};\n", "utf8");
};

const loadModules = async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "e1-session-diversity-"));
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
  createProblemHintStub(path.join(tempDir, "problem-hint.mjs"));
  createProblemExplanationStub(path.join(tempDir, "problem-explanation.mjs"));
  createNextServerStub(path.join(tempDir, "next-server.mjs"));
  createDbStub(path.join(tempDir, "db.mjs"));
  createProblemFormatStub(path.join(tempDir, "problem-format.mjs"));
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
    "progress-utils",
    "patternProgressTracker",
    "skillProgressTracker",
    "difficultyController",
    "weaknessAnalyzer",
    "sessionBuilder",
    "skill-unlock",
    "progression-engine",
    "learningEngine",
    "index"
  ]) {
    await transpileTsModule(
      path.join(learningRoot, `${moduleName}.ts`),
      path.join(tempDir, `${moduleName}.mjs`),
      sharedReplacements
    );
  }

  await transpileTsModule(
    path.join(root, "src/app/api/learning/session/start/route.ts"),
    path.join(tempDir, "route.mjs"),
    [
      ['from "next/server"', 'from "./next-server.mjs"'],
      ['from "packages/learning-engine"', 'from "./index.mjs"'],
      ['from "packages/problem-format"', 'from "./problem-format.mjs"'],
      ['from "@/lib/server/db"', 'from "./db.mjs"']
    ]
  );

  const load = (moduleName) => import(`${pathToFileURL(path.join(tempDir, `${moduleName}.mjs`)).href}?t=${Date.now()}`);

  return {
    studentStore: await load("studentStore"),
    learningEngine: await load("learningEngine"),
    route: await load("route")
  };
};

test("startSession for the same skill does not return identical problem sets three times", async () => {
  const { learningEngine, studentStore } = await loadModules();
  const initial = studentStore.createLearningState();

  const sessions = Array.from({ length: 3 }, () => learningEngine.startSession(initial, { mode: "skill", skillId: "E1_ADD_BASIC" }).session);
  const signatures = sessions.map((session) => session.problems.map((problem) => problem.problemId).join("|"));

  assert.equal(new Set(signatures).size > 1, true);
});

test("session start route issues unique sessionIds across three repeated starts", async () => {
  const { route } = await loadModules();

  const startRequests = () =>
    route.POST(
      new Request("http://localhost/api/learning/session/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "skill", skillId: "E1_ADD_BASIC" })
      })
    );

  const [firstResponse, secondResponse, thirdResponse] = await Promise.all([startRequests(), startRequests(), startRequests()]);
  const [firstBody, secondBody, thirdBody] = await Promise.all([
    firstResponse.json(),
    secondResponse.json(),
    thirdResponse.json()
  ]);

  assert.equal(firstResponse.status, 200);
  assert.equal(secondResponse.status, 200);
  assert.equal(thirdResponse.status, 200);
  assert.equal(new Set([firstBody.sessionId, secondBody.sessionId, thirdBody.sessionId]).size, 3);
});
