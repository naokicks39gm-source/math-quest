import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const datasetPath = path.join(process.cwd(), "src/content/mathquest_all_grades_types_v2.json");
const raw = JSON.parse(fs.readFileSync(datasetPath, "utf8"));

test("elementary number-and-calculation coverage is fixed", () => {
  const grades = raw.grades
    .filter((g) => /^E[1-6]$/.test(g.grade_id))
    .map((g) => ({
      gradeId: g.grade_id,
      categories: g.categories.filter((c) => c.category_id === "NA")
    }));

  assert.equal(grades.length, 6, "E1-E6 grades must exist");

  const counts = grades.map((g) => ({
    gradeId: g.gradeId,
    typeCount: g.categories.reduce((sum, c) => sum + c.types.length, 0)
  }));

  assert.deepEqual(
    counts,
    [
      { gradeId: "E1", typeCount: 6 },
      { gradeId: "E2", typeCount: 6 },
      { gradeId: "E3", typeCount: 37 },
      { gradeId: "E4", typeCount: 39 },
      { gradeId: "E5", typeCount: 43 },
      { gradeId: "E6", typeCount: 45 }
    ]
  );
});
