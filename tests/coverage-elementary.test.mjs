import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(process.cwd(), p), "utf8"));
const gradeFiles = ["e1", "e2", "e3", "e4", "e5", "e6"].map(
  (id) => `src/content/grades/mathquest_${id}_types_v1.json`
);
const raw = {
  grades: gradeFiles.flatMap((file) => readJson(file).grades ?? [])
};

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
      { gradeId: "E1", typeCount: 7 },
      { gradeId: "E2", typeCount: 6 },
      { gradeId: "E3", typeCount: 37 },
      { gradeId: "E4", typeCount: 39 },
      { gradeId: "E5", typeCount: 43 },
      { gradeId: "E6", typeCount: 45 }
    ]
  );

  const e1 = raw.grades.find((grade) => grade.grade_id === "E1");
  assert.ok(e1, "E1 grade must exist");
  const e1Na = e1.categories.find((category) => category.category_id === "NA");
  assert.ok(e1Na, "E1.NA must exist");
  const ids = new Set(e1Na.types.map((type) => type.type_id));
  assert.ok(ids.has("E1.NA.SUB.SUB_1D_1D_ANY"));
  assert.equal(ids.has("E1.NA.SUB.SUB_1D_1D_NO"), false);
  assert.equal(ids.has("E1.NA.SUB.SUB_1D_1D_YES"), false);
});
