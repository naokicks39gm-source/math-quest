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

test("E1 curriculum design defines the canonical 17-skill map", () => {
  assert.equal(e1SkillMap.grade, "E1");
  assert.equal(e1SkillMap.phase, "curriculum-design");
  assert.equal(e1SkillMap.skills.length, 17);
});

test("E1 curriculum design uses the agreed public shape only", () => {
  for (const skill of e1SkillMap.skills) {
    const keys = Object.keys(skill).sort();
    assert.equal(skill.id.startsWith("E1_"), true, skill.id);
    assert.equal(skill.grade, "E1", skill.id);

    const expectedKeys = skill.prerequisite
      ? ["grade", "id", "patterns", "prerequisite", "requiredXP", "title"]
      : ["grade", "id", "patterns", "requiredXP", "title"];
    assert.deepEqual(keys, expectedKeys, skill.id);
    assert.equal(skill.requiredXP, 100, skill.id);
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
  assert.deepEqual(roots.map((skill) => skill.id), ["E1_NUMBER_COUNT"]);

  const visited = new Set();
  for (const skillId of skillIds) {
    visit(skillId, new Set(), visited);
  }
  assert.equal(visited.size, e1SkillMap.skills.length);
});

test("E1 curriculum design keeps number concepts ahead of calculation skills", () => {
  assert.deepEqual(skillById.get("E1_NUMBER_ORDER")?.prerequisite, ["E1_NUMBER_COUNT"]);
  assert.deepEqual(skillById.get("E1_NUMBER_COMPARE")?.prerequisite, ["E1_NUMBER_ORDER"]);
  assert.deepEqual(skillById.get("E1_NUMBER_COMPOSE")?.prerequisite, ["E1_NUMBER_COMPARE"]);
  assert.deepEqual(skillById.get("E1_NUMBER_DECOMPOSE")?.prerequisite, ["E1_NUMBER_COMPOSE"]);
  assert.deepEqual(skillById.get("E1_NUMBER_LINE")?.prerequisite, ["E1_NUMBER_DECOMPOSE"]);

  assert.deepEqual(skillById.get("E1_ADD_ZERO")?.prerequisite, ["E1_NUMBER_LINE"]);
  assert.deepEqual(skillById.get("E1_ADD_ONE")?.prerequisite, ["E1_ADD_ZERO"]);
  assert.deepEqual(skillById.get("E1_ADD_DOUBLES")?.prerequisite, ["E1_ADD_ONE"]);
  assert.deepEqual(skillById.get("E1_ADD_NEAR_DOUBLES")?.prerequisite, ["E1_ADD_DOUBLES"]);

  assert.deepEqual(skillById.get("E1_ADD_BASIC")?.prerequisite, ["E1_ADD_NEAR_DOUBLES"]);
  assert.deepEqual(skillById.get("E1_ADD_10")?.prerequisite, ["E1_ADD_BASIC"]);
  assert.deepEqual(skillById.get("E1_ADD_CARRY")?.prerequisite, ["E1_ADD_10"]);

  assert.deepEqual(skillById.get("E1_SUB_BASIC")?.prerequisite, ["E1_ADD_CARRY"]);
  assert.deepEqual(skillById.get("E1_SUB_FACTS")?.prerequisite, ["E1_SUB_BASIC"]);
  assert.deepEqual(skillById.get("E1_SUB_BORROW")?.prerequisite, ["E1_SUB_FACTS"]);
  assert.deepEqual(skillById.get("E1_FACT_FAMILY")?.prerequisite, ["E1_SUB_BORROW"]);
});

test("E1 curriculum design keeps the intended skill families", () => {
  const numberSkills = e1SkillMap.skills.filter((skill) => skill.id.startsWith("E1_NUMBER_"));
  const prepSkills = e1SkillMap.skills.filter((skill) => skill.id.startsWith("E1_ADD_") && !["E1_ADD_BASIC", "E1_ADD_10", "E1_ADD_CARRY"].includes(skill.id));
  const basicAndAppliedSkills = e1SkillMap.skills.filter((skill) =>
    ["E1_ADD_BASIC", "E1_ADD_10", "E1_ADD_CARRY", "E1_SUB_BASIC", "E1_SUB_FACTS", "E1_SUB_BORROW", "E1_FACT_FAMILY"].includes(skill.id)
  );

  assert.deepEqual(
    numberSkills.map((skill) => skill.id),
    [
      "E1_NUMBER_COUNT",
      "E1_NUMBER_ORDER",
      "E1_NUMBER_COMPARE",
      "E1_NUMBER_COMPOSE",
      "E1_NUMBER_DECOMPOSE",
      "E1_NUMBER_LINE"
    ]
  );
  assert.deepEqual(
    prepSkills.map((skill) => skill.id),
    ["E1_ADD_ZERO", "E1_ADD_ONE", "E1_ADD_DOUBLES", "E1_ADD_NEAR_DOUBLES"]
  );
  assert.deepEqual(
    basicAndAppliedSkills.map((skill) => skill.id),
    ["E1_ADD_BASIC", "E1_ADD_10", "E1_SUB_BASIC", "E1_SUB_FACTS", "E1_FACT_FAMILY", "E1_ADD_CARRY", "E1_SUB_BORROW"]
  );
});
