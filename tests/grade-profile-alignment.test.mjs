import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("grade profile defines concept tags and synthetic IDs for E1-E6 alignment", () => {
  const source = read("src/lib/gradeProfiles.ts");
  assert.match(source, /number_sense/);
  assert.match(source, /place_value/);
  assert.match(source, /column_algorithm/);
  assert.match(source, /large_place_value/);
  assert.match(source, /rational_number/);
  assert.match(source, /pre_algebra/);

  assert.match(source, /E2\.NA\.MUL\.MUL_1D_1D_DAN_1/);
  assert.match(source, /E2\.NA\.MUL\.MUL_1D_1D_DAN_9/);
  assert.match(source, /E2\.NA\.MUL\.MUL_1D_1D_MIX_1_9/);
  assert.doesNotMatch(source, /E2\.NA\.MUL\.MUL_1D_1D",/);
  assert.match(source, /E2\.NA\.DIV\.DIV_EQUAL_SHARE_BASIC/);
  assert.match(source, /E3\.NA\.MUL\.MUL_2D_1D_NO/);
  assert.match(source, /E3\.NA\.MUL\.MUL_2D_1D_YES/);
  assert.doesNotMatch(source, /p === "MUL_2D_1D"/);
  assert.match(source, /E3\.NA\.FRAC\.UNIT_FRAC_BASIC/);
  assert.match(source, /p === "DIV_Q1D_EXACT"/);
  assert.match(source, /p === "DIV_Q1D_REM"/);
  assert.match(source, /p === "MUL_3D_1D"/);
  assert.match(source, /E4\.NA\.DIV\.DIV_3D_2D/);
  assert.match(source, /p === "DIV_Q3D_EXACT"/);
  assert.match(source, /p === "DIV_Q3D_REM"/);
  assert.match(source, /E5\.NA\.MUL\.MUL_3D_2D/);
  assert.match(source, /p !== "MUL_3D_1D"/);
  assert.match(source, /p !== "DIV_Q1D_EXACT"/);
  assert.match(source, /p !== "DIV_Q2D_EXACT"/);
  assert.match(source, /p !== "DIV_Q3D_EXACT"/);
  assert.match(source, /E5\.NA\.FRAC\.FRAC_MUL_INT/);
  assert.match(source, /E6\.NA\.FRAC\.FRAC_MUL_FRAC/);
});

test("catalog applies NA grade profile and concept tags", () => {
  const catalogSource = read("src/lib/gradeCatalog.ts");
  assert.match(catalogSource, /applyGradeProfileToNaTypes/);
  assert.match(catalogSource, /NUMBER_AND_CALCULATION_CATEGORY_ID = "NA"/);
  assert.match(catalogSource, /buildCrossGradeDedupeKey/);
  assert.match(catalogSource, /seenNaKeys/);

  const typeSource = read("src/lib/elementaryContent.ts");
  assert.match(typeSource, /concept_tags\?: string\[\]/);
  assert.doesNotMatch(typeSource, /number_range_label\?: string/);
  assert.doesNotMatch(typeSource, /display_subtitle\?: string/);
});

test("grade profile keeps difficulty order without focus sort or number range labels", () => {
  const source = read("src/lib/gradeProfiles.ts");
  assert.doesNotMatch(source, /sortByFocus/);
  assert.doesNotMatch(source, /focusPatternIds/);
  assert.doesNotMatch(source, /numberRangeLabel/);
});
