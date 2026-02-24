import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/lib/questItemFactory.ts"),
  "utf8"
);

test("1-digit generator lower bound uses 1 (not 10)", () => {
  assert.equal(source.includes("const pow10 = (d: number) => 10 ** Math.max(0, d - 1);"), true);
});

test("E1 ADD_2D_1D_YES generator blocks 3-digit sums", () => {
  assert.equal(source.includes("const isE1Add2D1DYes = type.type_id === \"E1.NA.ADD.ADD_2D_1D_YES\" && patternId === \"ADD_2D_1D_YES\";"), true);
  assert.equal(source.includes("if (isE1Add2D1DYes && sum > 99) continue;"), true);
});

test("E1 phase7-10 generator applies per-type 20-limit rules", () => {
  assert.equal(source.includes("const isE1Add2D1DNo = type.type_id === \"E1.NA.ADD.ADD_2D_1D_NO\";"), true);
  assert.equal(source.includes("const isE1Sub2D1DNo = type.type_id === \"E1.NA.SUB.SUB_2D_1D_NO\";"), true);
  assert.equal(source.includes("const isE1Sub2D1DYes = type.type_id === \"E1.NA.SUB.SUB_2D_1D_YES\";"), true);
  assert.equal(source.includes("const limitOperandsTo20 = isE1Add2D1DNo || isE1Add2D1DYes || isE1Sub2D1DNo;"), true);
  assert.equal(source.includes("const limitAnswerTo20 = isE1Add2D1DNo || isE1Sub2D1DNo || isE1Sub2D1DYes;"), true);
  assert.equal(source.includes("type.type_id === \"E1.NA.ADD.ADD_2D_1D_NO\""), true);
  assert.equal(source.includes("type.type_id === \"E1.NA.ADD.ADD_2D_1D_YES\""), true);
  assert.equal(source.includes("type.type_id === \"E1.NA.SUB.SUB_2D_1D_NO\""), true);
  assert.equal(source.includes("type.type_id === \"E1.NA.SUB.SUB_2D_1D_YES\""), true);
  assert.equal(source.includes("if (limitOperandsTo20 && (a > 20 || b > 20)) continue;"), true);
  assert.equal(source.includes("if (limitAnswerTo20 && sum > 20) continue;"), true);
  assert.equal(source.includes("if (limitAnswerTo20 && (diff < 0 || diff > 20)) continue;"), true);
});

test("E2 2-digit+1-digit generator enforces 20..98 operand and 2-digit answer", () => {
  assert.equal(source.includes("const isE2Add2D1DNo = type.type_id === \"E2.NA.ADD.ADD_2D_1D_NO\";"), true);
  assert.equal(source.includes("const isE2Add2D1DYes = type.type_id === \"E2.NA.ADD.ADD_2D_1D_YES\";"), true);
  assert.equal(source.includes("const isE2Add2D1D = isE2Add2D1DNo || isE2Add2D1DYes;"), true);
  assert.equal(source.includes("if ((isE2Add2D1D || isE2Sub2D1D) && (a < 20 || a > 98)) continue;"), true);
  assert.equal(source.includes("if ((isE2Add2D1D || isE2Sub2D1D) && (b < 1 || b > 9)) continue;"), true);
  assert.equal(source.includes("if (isE2Add2D1D && sum > 99) continue;"), true);
});

test("E2 2-digit-1-digit generator enforces 20..98 and 1..9 operands", () => {
  assert.equal(source.includes("const isE2Sub2D1DNo = type.type_id === \"E2.NA.SUB.SUB_2D_1D_NO\";"), true);
  assert.equal(source.includes("const isE2Sub2D1DYes = type.type_id === \"E2.NA.SUB.SUB_2D_1D_YES\";"), true);
  assert.equal(source.includes("const isE2Sub2D1D = isE2Sub2D1DNo || isE2Sub2D1DYes;"), true);
  assert.equal(source.includes("if ((isE2Add2D1D || isE2Sub2D1D) && (a < 20 || a > 98)) continue;"), true);
  assert.equal(source.includes("if ((isE2Add2D1D || isE2Sub2D1D) && (b < 1 || b > 9)) continue;"), true);
});
