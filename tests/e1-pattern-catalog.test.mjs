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

const loadModules = async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "e1-pattern-catalog-"));
  const skillEngineSource = path.join(root, "packages/skill-system/skillEngine.ts");
  const learningCatalogSource = path.join(root, "src/lib/learningPatternCatalog.ts");

  writeJsonModule(path.join(root, "packages/skill-system/skills.json"), path.join(tempDir, "skills.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/add-basic.json"), path.join(tempDir, "add-basic.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/add-make10.json"), path.join(tempDir, "add-make10.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/add-carry.json"), path.join(tempDir, "add-carry.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/sub-basic.json"), path.join(tempDir, "sub-basic.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E1/sub-borrow.json"), path.join(tempDir, "sub-borrow.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E2/add-2digit.json"), path.join(tempDir, "add-2digit.mjs"));
  writeJsonModule(path.join(root, "packages/problem-engine/patterns/E2/sub-2digit.json"), path.join(tempDir, "sub-2digit.mjs"));

  fs.writeFileSync(
    path.join(tempDir, "problem-engine.mjs"),
    [
      "export const generateProblems = () => [];",
      "export const generateProblem = () => undefined;"
    ].join("\n"),
    "utf8"
  );

  await transpileTsModule(skillEngineSource, path.join(tempDir, "skillEngine.mjs"), [
    ['from "packages/problem-engine"', 'from "./problem-engine.mjs"'],
    ['from "packages/problem-engine/patterns/E1/add-basic.json"', 'from "./add-basic.mjs"'],
    ['from "packages/problem-engine/patterns/E1/add-make10.json"', 'from "./add-make10.mjs"'],
    ['from "packages/problem-engine/patterns/E1/add-carry.json"', 'from "./add-carry.mjs"'],
    ['from "packages/problem-engine/patterns/E1/sub-basic.json"', 'from "./sub-basic.mjs"'],
    ['from "packages/problem-engine/patterns/E1/sub-borrow.json"', 'from "./sub-borrow.mjs"'],
    ['from "packages/problem-engine/patterns/E2/add-2digit.json"', 'from "./add-2digit.mjs"'],
    ['from "packages/problem-engine/patterns/E2/sub-2digit.json"', 'from "./sub-2digit.mjs"'],
    ['from "./skills.json"', 'from "./skills.mjs"']
  ]);

  await transpileTsModule(learningCatalogSource, path.join(tempDir, "learningPatternCatalog.mjs"), [
    ['from "packages/problem-engine/patterns/E1/add-basic.json"', 'from "./add-basic.mjs"'],
    ['from "packages/problem-engine/patterns/E1/add-make10.json"', 'from "./add-make10.mjs"'],
    ['from "packages/problem-engine/patterns/E1/add-carry.json"', 'from "./add-carry.mjs"'],
    ['from "packages/problem-engine/patterns/E1/sub-basic.json"', 'from "./sub-basic.mjs"'],
    ['from "packages/problem-engine/patterns/E1/sub-borrow.json"', 'from "./sub-borrow.mjs"'],
    ['from "packages/problem-engine/patterns/E2/add-2digit.json"', 'from "./add-2digit.mjs"'],
    ['from "packages/problem-engine/patterns/E2/sub-2digit.json"', 'from "./sub-2digit.mjs"'],
    ['from "packages/skill-system/skills.json"', 'from "./skills.mjs"']
  ]);

  const skillEngine = await import(`${pathToFileURL(path.join(tempDir, "skillEngine.mjs")).href}?t=${Date.now()}`);
  const learningPatternCatalogModule = await import(
    `${pathToFileURL(path.join(tempDir, "learningPatternCatalog.mjs")).href}?t=${Date.now()}`
  );

  return {
    skillEngine,
    learningPatternCatalog: learningPatternCatalogModule.learningPatternCatalog
  };
};

const runtimeE1Skills = [
  "E1_ADD_BASIC",
  "E1_ADD_10",
  "E1_ADD_CARRY",
  "E1_SUB_BASIC",
  "E1_SUB_BORROW"
];

test("runtime E1 skills resolve non-empty pattern bundles", async () => {
  const { skillEngine } = await loadModules();

  for (const skillId of runtimeE1Skills) {
    const bundles = skillEngine.getPatterns(skillId);
    assert.equal(Array.isArray(bundles), true, skillId);
    assert.equal(bundles.length > 0, true, skillId);
  }
});

test("learning pattern catalog contains entries for all runtime E1 skills", async () => {
  const { learningPatternCatalog } = await loadModules();

  for (const skillId of runtimeE1Skills) {
    const entries = learningPatternCatalog.filter((entry) => entry.skillId === skillId);
    assert.equal(entries.length > 0, true, skillId);
    for (const entry of entries) {
      assert.equal(typeof entry.pattern.key, "string");
      assert.equal(entry.pattern.key.length > 0, true);
      assert.equal(entry.patternId, entry.pattern.key);
    }
  }
});
