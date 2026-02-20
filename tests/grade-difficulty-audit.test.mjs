import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(process.cwd(), p), "utf8"));
const gradeFiles = ["e1", "e2", "e3", "e4", "e5", "e6"].map(
  (id) => `src/content/grades/mathquest_${id}_types_v1.json`
);
const rawGrades = gradeFiles.flatMap((file) => readJson(file).grades ?? []);

const excludedTypeIds = new Set([
  "E1.ME.TIME.TIME_MIN",
  "E1.RE.CMP.CMP_SIGN",
  "E2.ME.TIME.TIME_MIN",
  "E2.RE.CMP.CMP_SIGN"
]);

const gradeOrder = ["E1", "E2", "E3", "E4", "E5", "E6"];

const keepByGrade = {
  E1: (p) =>
    p === "NUM_COMPARE_UP_TO_20" ||
    p === "NUM_DECOMP_10" ||
    p === "NUM_COMP_10" ||
    p.startsWith("ADD_1D_1D") ||
    p.startsWith("SUB_1D_1D") ||
    p.startsWith("ADD_2D_1D") ||
    p.startsWith("SUB_2D_1D") ||
    p === "MIXED_TO_20",
  E2: (p) =>
    p.startsWith("ADD_2D_2D") ||
    p.startsWith("SUB_2D_1D") ||
    p.startsWith("SUB_2D_2D") ||
    p.startsWith("MUL_1D_1D_") ||
    p === "DIV_EQUAL_SHARE_BASIC",
  E3: (p) =>
    p.startsWith("ADD_3D_3D") ||
    p.startsWith("SUB_3D_3D") ||
    p === "MUL_2D_1D_NO" ||
    p === "MUL_2D_1D_YES" ||
    p === "MUL_2D_2D" ||
    p === "DIV_Q1D_EXACT" ||
    p === "DIV_Q1D_REM" ||
    p === "DIV_Q2D_EXACT" ||
    p === "DIV_Q2D_REM" ||
    p === "DEC_ADD_1DP" ||
    p === "UNIT_FRAC_BASIC",
  E4: (p) =>
    p.startsWith("ADD_") ||
    p.startsWith("SUB_") ||
    p === "MUL_3D_1D" ||
    p === "DIV_3D_2D" ||
    p === "DIV_Q3D_EXACT" ||
    p === "DIV_Q3D_REM" ||
    p === "DEC_MUL_INT" ||
    p === "DEC_DIV_INT" ||
    p === "FRAC_IMPROPER_MIXED",
  E5: (p) =>
    p.startsWith("ADD_") ||
    p.startsWith("SUB_") ||
    (p.startsWith("MUL_") && p !== "MUL_2D_1D" && p !== "MUL_3D_1D") ||
    (p.startsWith("DIV_") &&
      p !== "DIV_Q1D_EXACT" &&
      p !== "DIV_Q1D_REM" &&
      p !== "DIV_Q2D_EXACT" &&
      p !== "DIV_Q2D_REM" &&
      p !== "DIV_Q3D_EXACT" &&
      p !== "DIV_Q3D_REM") ||
    p.startsWith("DEC_") ||
    p.startsWith("FRAC_"),
  E6: (p) =>
    p.startsWith("ADD_") ||
    p.startsWith("SUB_") ||
    (p.startsWith("MUL_") && p !== "MUL_2D_1D") ||
    p.startsWith("DIV_") ||
    p.startsWith("DEC_") ||
    p.startsWith("FRAC_")
};

const syntheticPatternByGrade = {
  E1: [
    "NUM_COMPARE_UP_TO_20",
    "NUM_DECOMP_10",
    "NUM_COMP_10",
    "ADD_2D_1D_NO",
    "ADD_2D_1D_YES",
    "MIXED_TO_20"
  ],
  E2: [
    "SUB_2D_2D_NO",
    "SUB_2D_2D_YES",
    "SUB_2D_2D_ANY",
    "MUL_1D_1D_DAN_1",
    "MUL_1D_1D_DAN_2",
    "MUL_1D_1D_DAN_3",
    "MUL_1D_1D_DAN_4",
    "MUL_1D_1D_DAN_5",
    "MUL_1D_1D_DAN_6",
    "MUL_1D_1D_DAN_7",
    "MUL_1D_1D_DAN_8",
    "MUL_1D_1D_DAN_9",
    "MUL_1D_1D_MIX_1_3",
    "MUL_1D_1D_MIX_4_6",
    "MUL_1D_1D_MIX_7_9",
    "MUL_1D_1D_MIX_1_9",
    "DIV_EQUAL_SHARE_BASIC"
  ],
  E3: ["MUL_2D_1D_NO", "MUL_2D_1D_YES", "DEC_ADD_1DP", "UNIT_FRAC_BASIC"],
  E4: ["DIV_3D_2D", "DEC_MUL_INT", "DEC_DIV_INT", "FRAC_IMPROPER_MIXED"],
  E5: ["MUL_3D_2D", "DEC_SUB_2DP", "DEC_DIV_2DP", "FRAC_MUL_INT", "FRAC_DIV_INT"],
  E6: ["FRAC_MUL_FRAC", "FRAC_DIV_FRAC", "FRAC_COMMON_DENOM_REDUCE", "MIXED_DEC_FRAC", "MIXED_EXPRESSION"]
};

const firstGradeByPattern = () => {
  const seen = new Set();
  const first = {};
  for (const gradeId of gradeOrder) {
    const grade = rawGrades.find((g) => g.grade_id === gradeId);
    if (!grade) continue;
    const patterns = [];
    const keep = keepByGrade[gradeId];
    for (const category of grade.categories ?? []) {
      if (category.category_id !== "NA") continue;
      for (const type of category.types ?? []) {
        if ((type.example_items ?? []).length === 0 || excludedTypeIds.has(type.type_id)) continue;
        const pattern = type.generation_params?.pattern_id;
        if (!pattern) continue;
        if (keep(pattern)) patterns.push(pattern);
      }
    }
    patterns.push(...(syntheticPatternByGrade[gradeId] ?? []));
    for (const pattern of patterns) {
      if (seen.has(pattern)) continue;
      seen.add(pattern);
      first[pattern] = gradeId;
    }
  }
  return first;
};

test("difficulty audit keeps multiplication and division progression", () => {
  const first = firstGradeByPattern();

  assert.equal(first["SUB_2D_2D_NO"], "E2");
  assert.equal(first["SUB_2D_2D_YES"], "E2");
  assert.equal(first["ADD_2D_1D_NO"], "E1");
  assert.equal(first["ADD_2D_1D_YES"], "E1");

  assert.equal(first["MUL_1D_1D_DAN_1"], "E2");
  assert.equal(first["MUL_1D_1D_DAN_9"], "E2");
  assert.equal(first["MUL_1D_1D_MIX_1_9"], "E2");
  assert.equal(first["MUL_2D_1D_NO"], "E3");
  assert.equal(first["MUL_2D_1D_YES"], "E3");
  assert.equal(first["MUL_2D_2D"], "E3");
  assert.equal(first["MUL_3D_1D"], "E4");
  assert.equal(first["MUL_3D_2D"], "E5");

  assert.equal(first["DIV_EQUAL_SHARE_BASIC"], "E2");
  assert.equal(first["DIV_Q1D_EXACT"], "E3");
  assert.equal(first["DIV_Q1D_REM"], "E3");
  assert.equal(first["DIV_Q2D_EXACT"], "E3");
  assert.equal(first["DIV_Q2D_REM"], "E3");
  assert.equal(first["DIV_3D_2D"], "E4");
  assert.equal(first["DIV_Q3D_EXACT"], "E4");
  assert.equal(first["DIV_Q3D_REM"], "E4");
});
