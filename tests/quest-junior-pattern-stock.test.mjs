import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const factorySource = fs.readFileSync(path.join(root, "src/lib/questItemFactory.ts"), "utf8");
const stockSource = fs.readFileSync(path.join(root, "src/lib/questStockFactory.ts"), "utf8");

const gradeFiles = [
  "src/content/grades/mathquest_j1_types_v1.json",
  "src/content/grades/mathquest_j2_types_v1.json",
  "src/content/grades/mathquest_j3_types_v1.json"
];

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));

const requiredPatterns = (() => {
  const set = new Set();
  for (const file of gradeFiles) {
    const json = readJson(file);
    for (const grade of json.grades ?? []) {
      for (const category of grade.categories ?? []) {
        for (const type of category.types ?? []) {
          const patternId = type.generation_params?.pattern_id ?? "";
          if (patternId) set.add(patternId);
        }
      }
    }
  }
  return [...set].sort();
})();

test("junior-high patterns are all handled in quest item factory generator", () => {
  assert.equal(factorySource.includes("generateJuniorHighByPattern"), true);
  for (const patternId of requiredPatterns) {
    assert.equal(
      factorySource.includes(`patternId === \"${patternId}\"`) || factorySource.includes(`patternId.startsWith(\"${patternId.split("_")[0]}_\")`),
      true,
      `missing generator branch for ${patternId}`
    );
  }
});

test("junior-high patterns are covered by stock fallback", () => {
  for (const patternId of requiredPatterns) {
    assert.equal(
      stockSource.includes(`patternId === \"${patternId}\"`) || stockSource.includes(`patternId.startsWith(\"${patternId.split("_")[0]}_\")`),
      true,
      `missing stock fallback branch for ${patternId}`
    );
  }
  assert.equal(stockSource.includes("return out.slice(0, targetCount);"), true);
});
