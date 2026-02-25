import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const stockSource = fs.readFileSync(
  path.join(process.cwd(), "src/lib/questStockFactory.ts"),
  "utf8"
);
const profileSource = fs.readFileSync(
  path.join(process.cwd(), "src/lib/gradeProfiles.ts"),
  "utf8"
);

test("E2 has dan/mix multiplication types for Lv E2-9..E2-21", () => {
  assert.equal(profileSource.includes("E2.NA.MUL.MUL_1D_1D_DAN_1"), true);
  assert.equal(profileSource.includes("E2.NA.MUL.MUL_1D_1D_DAN_9"), true);
  assert.equal(profileSource.includes("E2.NA.MUL.MUL_1D_1D_MIX_1_3"), true);
  assert.equal(profileSource.includes("E2.NA.MUL.MUL_1D_1D_MIX_4_6"), true);
  assert.equal(profileSource.includes("E2.NA.MUL.MUL_1D_1D_MIX_7_9"), true);
  assert.equal(profileSource.includes("E2.NA.MUL.MUL_1D_1D_MIX_1_9"), true);
});

test("E2 dan/mix stock filter enforces classified range", () => {
  assert.equal(stockSource.includes("getE2MulDanFromTypeId"), true);
  assert.equal(stockSource.includes("getE2MulMixRangeFromTypeId"), true);
  assert.equal(stockSource.includes("left === dan"), true);
  assert.equal(stockSource.includes("left >= mixRange.min && left <= mixRange.max"), true);
});
