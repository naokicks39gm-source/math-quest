import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/app/quest/page.tsx"), "utf8");

test("quest top picker uses one problem button with grade and problem sections", () => {
  assert.match(source, /問題を選ぶ/);
  assert.doesNotMatch(source, /同じ学年の問題を選ぶ/);
  assert.match(source, /text-\[10px\] font-bold text-slate-500">学年<\/div>/);
  assert.match(source, /text-\[10px\] font-bold text-slate-500">問題<\/div>/);
  assert.match(source, /const gradeOptions = useMemo/);
  assert.match(source, /const currentGradeCategories = useMemo/);
});

test("quest grade selection can navigate to first type in selected grade", () => {
  assert.match(source, /const selectFirstTypeInGrade = \(gradeId: string\) =>/);
  assert.match(source, /const category = grade\.categories\.find\(\(row\) => row\.types\.length > 0\)/);
  assert.match(source, /router\.push\(`\/quest\?type=\$\{encodeURIComponent\(type\.type_id\)\}&category=\$\{encodeURIComponent\(category\.category_id\)\}`\)/);
});

test("quest problem option selection route is preserved", () => {
  assert.match(source, /router\.push\(`\/quest\?type=\$\{encodeURIComponent\(option\.typeId\)\}&category=\$\{encodeURIComponent\(option\.categoryId\)\}`\)/);
});
