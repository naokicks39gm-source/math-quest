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
