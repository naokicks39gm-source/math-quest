import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const factorySource = fs.readFileSync(path.join(root, "src/lib/questItemFactory.ts"), "utf8");
const stockSource = fs.readFileSync(path.join(root, "src/lib/questStockFactory.ts"), "utf8");

const gradeFiles = ["e1", "e2", "e3", "e4", "e5", "e6", "j1", "j2", "j3", "h1", "h2", "h3"].map(
  (id) => `src/content/grades/mathquest_${id}_types_v1.json`
);

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const EXCLUDED_TYPE_IDS = new Set([
  "E1.ME.TIME.TIME_MIN",
  "E1.RE.CMP.CMP_SIGN",
  "E2.ME.TIME.TIME_MIN",
  "E2.RE.CMP.CMP_SIGN"
]);

const isPatternGeneratable = (patternId) => {
  if (!patternId) return false;
  return (
    patternId.startsWith("ADD_") ||
    patternId.startsWith("SUB_") ||
    patternId.startsWith("MUL_") ||
    patternId.startsWith("DIV_") ||
    patternId.startsWith("DEC_") ||
    patternId.startsWith("FRAC_") ||
    patternId.startsWith("UNIT_FRAC_") ||
    patternId.startsWith("MIXED_")
  );
};

test("E1-E4 behavior remains frozen while fallback exists for higher grades", () => {
  assert.equal(stockSource.includes("isFrozenElementaryGrade"), true);
  assert.equal(stockSource.includes("/^(E1|E2|E3|E4)$/"), true);
  assert.equal(stockSource.includes("if (!isFrozenElementaryGrade(gradeId))"), true);
});

test("E5-H3 types are covered by generator families or higher-grade fallback path", () => {
  const uncovered = [];

  for (const file of gradeFiles) {
    const json = readJson(file);
    for (const grade of json.grades ?? []) {
      const isHigher = /^(E5|E6|J[1-3]|H[1-3])$/.test(grade.grade_id);
      for (const category of grade.categories ?? []) {
        if (category.category_id !== "NA") continue;
        for (const type of category.types ?? []) {
          if ((type.example_items?.length ?? 0) === 0) continue;
          if (EXCLUDED_TYPE_IDS.has(type.type_id)) continue;
          const patternId = type.generation_params?.pattern_id ?? "";
          if (isPatternGeneratable(patternId)) continue;
          if (isHigher) continue;
          uncovered.push(`${grade.grade_id}:${type.type_id}:${patternId}`);
        }
      }
    }
  }

  assert.deepEqual(uncovered, []);
  assert.equal(factorySource.includes('patternId.startsWith("MIXED_")'), true);
  assert.equal(factorySource.includes("generateSecondaryBySeedVariants"), true);
  assert.equal(factorySource.includes("const label = `（れんしゅう"), false);
  assert.equal(stockSource.includes("const label = `（れんしゅう"), false);
});
