import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const e1SkillMapPath = path.join(root, "docs/curriculum/e1-skill-map.json");
const e1SkillMap = JSON.parse(fs.readFileSync(e1SkillMapPath, "utf8"));
const patternRoot = path.join(root, "packages/problem-engine/patterns");

const patternCatalog = new Set(
  ["E1", "E2", "J1", "H1"].flatMap((grade) => {
    const gradeDir = path.join(patternRoot, grade);
    return fs
      .readdirSync(gradeDir)
      .filter((fileName) => fileName.endsWith(".json"))
      .flatMap((fileName) => {
        const filePath = path.join(gradeDir, fileName);
        const entries = JSON.parse(fs.readFileSync(filePath, "utf8"));
        return entries.map((entry) => entry.key);
      });
  })
);

const skillIds = e1SkillMap.skills.map((skill) => skill.id);
const skillById = new Map(e1SkillMap.skills.map((skill) => [skill.id, skill]));

const visit = (skillId, visiting, visited) => {
  if (visited.has(skillId)) {
    return;
  }
  if (visiting.has(skillId)) {
    throw new Error(`cycle detected at ${skillId}`);
  }

  visiting.add(skillId);
  const skill = skillById.get(skillId);
  for (const prerequisite of skill?.prerequisite ?? []) {
    visit(prerequisite, visiting, visited);
  }
  visiting.delete(skillId);
  visited.add(skillId);
};

test("E1 curriculum design defines the canonical 11-skill map", () => {
  assert.equal(e1SkillMap.grade, "E1");
  assert.equal(e1SkillMap.phase, "curriculum-design");
  assert.equal(e1SkillMap.skills.length, 11);
});

test("E1 curriculum design uses the agreed public shape only", () => {
  for (const skill of e1SkillMap.skills) {
    const keys = Object.keys(skill).sort();
    assert.equal(skill.id.startsWith("E1_"), true, skill.id);
    assert.equal(skill.grade, "E1", skill.id);

    const expectedKeys = skill.prerequisite
      ? ["grade", "id", "patterns", "prerequisite", "title"]
      : ["grade", "id", "patterns", "title"];
    assert.deepEqual(keys, expectedKeys, skill.id);
  }
});

test("E1 curriculum design maps every skill to existing problem-engine patterns", () => {
  for (const skill of e1SkillMap.skills) {
    assert.equal(Array.isArray(skill.patterns), true, `${skill.id} patterns must be an array`);
    assert.equal(skill.patterns.length > 0, true, `${skill.id} patterns must not be empty`);

    for (const patternId of skill.patterns) {
      assert.equal(patternCatalog.has(patternId), true, `${skill.id} -> missing pattern ${patternId}`);
    }
  }
});

test("E1 curriculum design has a single root and no prerequisite cycles", () => {
  const roots = e1SkillMap.skills.filter((skill) => !skill.prerequisite || skill.prerequisite.length === 0);
  assert.deepEqual(roots.map((skill) => skill.id), ["E1_NUMBER_1_TO_10"]);

  const visited = new Set();
  for (const skillId of skillIds) {
    visit(skillId, new Set(), visited);
  }
  assert.equal(visited.size, e1SkillMap.skills.length);
});

test("E1 curriculum design keeps the intended branch structure", () => {
  assert.deepEqual(skillById.get("E1_NUMBER_1_TO_20")?.prerequisite, ["E1_NUMBER_1_TO_10"]);
  assert.deepEqual(skillById.get("E1_NUMBER_ORDER")?.prerequisite, ["E1_NUMBER_1_TO_20"]);
  assert.deepEqual(skillById.get("E1_NUMBER_COMPARE")?.prerequisite, ["E1_NUMBER_1_TO_20"]);

  assert.deepEqual(skillById.get("E1_ADD_BASIC")?.prerequisite, ["E1_NUMBER_1_TO_20"]);
  assert.deepEqual(skillById.get("E1_ADD_10")?.prerequisite, ["E1_ADD_BASIC"]);
  assert.deepEqual(skillById.get("E1_ADD_CARRY")?.prerequisite, ["E1_ADD_10"]);

  assert.deepEqual(skillById.get("E1_SUB_BASIC")?.prerequisite, ["E1_ADD_BASIC"]);
  assert.deepEqual(skillById.get("E1_SUB_BORROW")?.prerequisite, ["E1_SUB_BASIC"]);

  assert.deepEqual(skillById.get("E1_ADD_WORD")?.prerequisite, ["E1_ADD_BASIC"]);
  assert.deepEqual(skillById.get("E1_SUB_WORD")?.prerequisite, ["E1_SUB_BASIC"]);
});

test("E1 curriculum design keeps word problems and number concepts separate", () => {
  const numberSkills = e1SkillMap.skills.filter((skill) => skill.id.includes("NUMBER_"));
  const wordSkills = e1SkillMap.skills.filter((skill) => skill.id.endsWith("_WORD"));

  assert.deepEqual(
    numberSkills.map((skill) => skill.id),
    ["E1_NUMBER_1_TO_10", "E1_NUMBER_1_TO_20", "E1_NUMBER_ORDER", "E1_NUMBER_COMPARE"]
  );
  assert.deepEqual(
    wordSkills.map((skill) => skill.id),
    ["E1_ADD_WORD", "E1_SUB_WORD"]
  );
});
