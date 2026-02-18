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

const getNaIds = (gradeId) => {
  const grade = raw.grades.find((g) => g.grade_id === gradeId);
  assert.ok(grade, `${gradeId} grade must exist`);
  const na = grade.categories.find((category) => category.category_id === "NA");
  assert.ok(na, `${gradeId}.NA must exist`);
  return new Set(na.types.map((type) => type.type_id));
};

test("elementary NA data has core type IDs needed for grade profiles", () => {
  const e1Ids = getNaIds("E1");
  assert.ok(e1Ids.has("E1.NA.SUB.SUB_1D_1D_ANY"));
  assert.ok(e1Ids.has("E1.NA.SUB.SUB_2D_2D_NO"));
  assert.ok(e1Ids.has("E1.NA.SUB.SUB_2D_2D_YES"));
  assert.ok(e1Ids.has("E1.NA.SUB.SUB_2D_2D_ANY"));

  const e2Ids = getNaIds("E2");
  assert.ok(e2Ids.has("E2.NA.ADD.ADD_2D_2D_NO"));
  assert.ok(e2Ids.has("E2.NA.ADD.ADD_2D_2D_YES"));
  assert.ok(e2Ids.has("E2.NA.ADD.ADD_2D_2D_ANY"));
  assert.equal(e2Ids.has("E2.NA.ADD.ADD_1D_1D_NO"), false);
  assert.equal(e2Ids.has("E2.NA.ADD.ADD_1D_1D_YES"), false);
  assert.equal(e2Ids.has("E2.NA.ADD.ADD_1D_1D_ANY"), false);

  const e3Ids = getNaIds("E3");
  assert.ok(e3Ids.has("E3.NA.MUL.MUL_2D_1D"));
  assert.ok(e3Ids.has("E3.NA.MUL.MUL_2D_2D"));
  assert.ok(e3Ids.has("E3.NA.DIV.DIV_Q2D_EXACT"));
  assert.ok(e3Ids.has("E3.NA.DIV.DIV_Q2D_REM"));
});
