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
      "    meta: { difficulty: difficultyByPattern[pattern.key] ?? 2 }",
      "  }));",
      "export const generateRuntimeProblems = (pattern, count) =>",
      "  generateProblems(pattern, count).map((problem) => ({",
      "    ...problem,",
      "    question: pattern.key === \"E1-NUM-COMPARE-01\" ? `${problem.variables.a ?? 0} と ${problem.variables.b ?? 0}\\nどちらが小さい？` : problem.question,",
      "    answer: pattern.key === \"E1-NUM-COMPARE-01\" ? String(Math.min(problem.variables.a ?? 0, problem.variables.b ?? 0)) : pattern.key === \"E1-NUM-COMPOSE-01\" ? String((problem.variables.a ?? 0) + (problem.variables.b ?? 0)) : pattern.key === \"E1-NUM-DECOMPOSE-01\" ? String((problem.variables.whole ?? 0) - (problem.variables.known ?? 0)) : problem.answer,",
      "    meta: { ...(problem.meta ?? {}), source: \"runtime-pattern\" }",
      "  }));"
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
      "  return session;",
      "};",
      "export const getLearningSessionById = (sessionId) =>",
      "  persistedSessions.find((entry) => entry.sessionId === sessionId);",
      "export const updateLearningSession = () => {",
      "  return undefined;",
      "};"
    ].join("\n"),
    "utf8"
  );
};

const createProblemFormatStub = (outputPath) => {
  fs.writeFileSync(outputPath, "export {};\n", "utf8");
};

const loadModules = async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "e1-api-session-"));
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
  await transpileTsModule(
    path.join(root, "packages/problem-explanation/explanationRegistry.ts"),
    path.join(tempDir, "explanationRegistry.mjs"),
    [
      ['from "packages/problem-engine"', 'from "./problem-engine.mjs"'],
      ['from "./explanationTypes"', 'from "./explanationTypes.mjs"']
    ]
  );
  await transpileTsModule(
    path.join(root, "packages/problem-explanation/generateExplanation.ts"),
    path.join(tempDir, "generateExplanation.mjs"),
    [
      ['from "packages/problem-engine"', 'from "./problem-engine.mjs"'],
      ['from "./explanationRegistry"', 'from "./explanationRegistry.mjs"'],
      ['from "./explanationTypes"', 'from "./explanationTypes.mjs"']
    ]
  );
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

  await transpileTsModule(
    path.join(root, "src/app/api/learning/session/start/route.ts"),
    path.join(tempDir, "start-route.mjs"),
    [
      ['from "next/server"', 'from "./next-server.mjs"'],
      ['from "packages/learning-engine"', 'from "./index.mjs"'],
      ['from "packages/problem-format"', 'from "./problem-format.mjs"'],
      ['from "@/lib/server/db"', 'from "./db.mjs"']
    ]
  );

  await transpileTsModule(
    path.join(root, "src/app/api/learning/session/[sessionId]/route.ts"),
    path.join(tempDir, "resume-route.mjs"),
    [
      ['from "next/server"', 'from "./next-server.mjs"'],
      ['from "packages/learning-engine"', 'from "./index.mjs"'],
      ['from "packages/problem-format"', 'from "./problem-format.mjs"'],
      ['from "@/lib/server/db"', 'from "./db.mjs"']
    ]
  );

  const load = (moduleName) => import(`${pathToFileURL(path.join(tempDir, `${moduleName}.mjs`)).href}?t=${Date.now()}`);

  return {
    route: await load("start-route"),
    resumeRoute: await load("resume-route"),
    learningPatternCatalog: (await load("learningPatternCatalog")).learningPatternCatalog
  };
};

const e1SkillIds = ["E1_ADD_BASIC", "E1_ADD_10", "E1_ADD_CARRY", "E1_SUB_BASIC", "E1_SUB_BORROW", "E1_NUMBER_COMPARE", "E1_NUMBER_COMPOSE", "E1_NUMBER_DECOMPOSE"];

test("learning session start route returns valid E1 skill sessions", async () => {
  const { route, learningPatternCatalog } = await loadModules();

  for (const skillId of e1SkillIds) {
    const request = new Request("http://localhost/api/learning/session/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "skill", skillId })
    });

    const response = await route.POST(request);
    const body = await response.json();

    assert.equal(response.status, 200, skillId);
    assert.equal(typeof body.sessionId, "string", skillId);
    assert.equal(body.sessionId.length > 0, true, skillId);
    assert.equal(typeof body.expiresAt, "number", skillId);
    assert.equal(Boolean(body.session), true, skillId);
    assert.equal(body.session.skillId, skillId, skillId);
    assert.equal(body.state.session?.skillId, skillId, skillId);
    assert.equal(body.session.problems.length, 5, skillId);

    for (const problem of body.session.problems) {
      assert.equal(typeof problem.problem.id, "string", `${skillId} -> id`);
      assert.equal(problem.problem.id.length > 0, true, `${skillId} -> id`);
      assert.equal(typeof problem.patternKey, "string", `${skillId} -> patternKey`);
      assert.equal(problem.patternKey.length > 0, true, `${skillId} -> patternKey`);
      assert.equal(
        learningPatternCatalog.some((entry) => entry.skillId === skillId && entry.patternId === problem.patternKey),
        true,
        `${skillId} -> missing catalog entry for ${problem.patternKey}`
      );
      assert.equal(typeof problem.difficulty, "number", `${skillId} -> difficulty`);
      assert.equal(problem.difficulty >= 1 && problem.difficulty <= 5, true, `${skillId} -> difficulty`);
      assert.equal(typeof problem.problem.meta?.difficulty, "number", `${skillId} -> meta difficulty`);
      assert.equal(problem.problem.meta.difficulty >= 1 && problem.problem.meta.difficulty <= 5, true, `${skillId} -> meta difficulty`);
      assert.equal(problem.problem.meta?.patternId, skillId, `${skillId} -> meta patternId`);
      assert.equal(problem.problem.hint?.patternId, skillId, `${skillId} -> hint patternId`);
      assert.equal(typeof problem.problem.hint?.text, "string", `${skillId} -> hint text`);
      assert.equal(Array.isArray(problem.problem.explanation?.steps), true, `${skillId} -> explanation steps`);
      assert.equal(problem.problem.explanation?.patternId, skillId, `${skillId} -> explanation patternId`);
    }
  }
});

test("learning session start route issues a new sessionId for repeated starts", async () => {
  const { route } = await loadModules();
  const firstResponse = await route.POST(
    new Request("http://localhost/api/learning/session/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "skill", skillId: "E1_ADD_BASIC" })
    })
  );
  const secondResponse = await route.POST(
    new Request("http://localhost/api/learning/session/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "skill", skillId: "E1_ADD_BASIC" })
    })
  );

  const firstBody = await firstResponse.json();
  const secondBody = await secondResponse.json();

  assert.equal(firstResponse.status, 200);
  assert.equal(secondResponse.status, 200);
  assert.notEqual(firstBody.sessionId, secondBody.sessionId);
});

test("learning session resume route preserves hint and explanation shape", async () => {
  const { route, resumeRoute } = await loadModules();
  const startResponse = await route.POST(
    new Request("http://localhost/api/learning/session/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "skill", skillId: "E1_ADD_BASIC" })
    })
  );
  const started = await startResponse.json();

  const resumeResponse = await resumeRoute.GET(new Request(`http://localhost/api/learning/session/${started.sessionId}`), {
    params: Promise.resolve({ sessionId: started.sessionId })
  });
  const resumed = await resumeResponse.json();

  assert.equal(resumeResponse.status, 200);
  assert.equal(resumed.sessionId, started.sessionId);
  assert.equal(resumed.session.problems.length, started.session.problems.length);
  assert.equal(resumed.session.problems[0].problem.hint?.patternId, "E1_ADD_BASIC");
  assert.equal(resumed.session.problems[0].problem.explanation?.patternId, "E1_ADD_BASIC");
});
