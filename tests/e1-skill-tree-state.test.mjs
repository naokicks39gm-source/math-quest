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

const loadSkillTreeModule = async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "e1-skill-tree-state-"));
  await transpileTsModule(path.join(root, "packages/skill-system/skillTypes.ts"), path.join(tempDir, "skillTypes.mjs"));
  writeJsonModule(path.join(root, "packages/skill-system/skills.json"), path.join(tempDir, "skills.mjs"));
  await transpileTsModule(path.join(root, "packages/skill-system/skillTree.ts"), path.join(tempDir, "skillTree.mjs"), [
    ['from "./skills.json"', 'from "./skills.mjs"']
  ]);

  return import(`${pathToFileURL(path.join(tempDir, "skillTree.mjs")).href}?t=${Date.now()}`);
};

test("getSkillTree returns UI-ready node state for E1 skills", async () => {
  const skillTree = await loadSkillTreeModule();

  const nodes = skillTree.getSkillTree({
    unlockedSkills: ["E1_NUMBER_COUNT", "E1_NUMBER_ORDER", "E1_ADD_BASIC"],
    skillMastery: {
      E1_NUMBER_ORDER: 0.5,
      E1_ADD_BASIC: 0.9
    },
    skillXP: {
      E1_ADD_BASIC: 120
    },
    skillProgress: {
      E1_ADD_BASIC: { mastery: 0.9, mastered: true }
    }
  });

  const orderNode = nodes.find((node) => node.id === "E1_NUMBER_ORDER");
  const addBasicNode = nodes.find((node) => node.id === "E1_ADD_BASIC");
  const factFamilyNode = nodes.find((node) => node.id === "E1_FACT_FAMILY");

  assert.deepEqual(orderNode, {
    id: "E1_NUMBER_ORDER",
    title: "数の順番理解",
    difficulty: 1,
    requiredXP: 100,
    prerequisite: ["E1_NUMBER_COUNT"],
    unlocked: true,
    mastered: false,
    mastery: 0,
    xp: 0,
    nextSkills: ["E1_NUMBER_COMPARE"],
    status: "AVAILABLE"
  });
  assert.deepEqual(addBasicNode, {
    id: "E1_ADD_BASIC",
    title: "1桁のたし算",
    difficulty: 3,
    requiredXP: 100,
    prerequisite: ["E1_ADD_NEAR_DOUBLES"],
    unlocked: true,
    mastered: true,
    mastery: 1,
    xp: 120,
    nextSkills: ["E1_ADD_10"],
    status: "MASTERED"
  });
  assert.equal(factFamilyNode?.mastery, 0);
  assert.equal(factFamilyNode?.xp, 0);
  assert.equal(factFamilyNode?.requiredXP, 100);
  assert.deepEqual(factFamilyNode?.nextSkills, []);
  assert.equal(factFamilyNode?.status, "LOCKED");
});
