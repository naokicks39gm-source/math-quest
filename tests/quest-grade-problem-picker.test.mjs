import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/app/quest/page.tsx"), "utf8");

test("quest top picker uses one problem button with grade and problem sections", () => {
  assert.match(source, /問題を選ぶ/);
  assert.doesNotMatch(source, /同じ学年の問題を選ぶ/);
  assert.match(source, /<span>学年<\/span>/);
  assert.match(source, /<span>問題<\/span>/);
  assert.match(source, /const gradeOptions = useMemo/);
  assert.match(source, /const pickerGradeTypes = useMemo/);
  assert.match(source, /flatMap\(\(category\) =>/);
});

test("quest grade selection updates pending grade without immediate navigation", () => {
  assert.match(source, /const \[pendingGradeId, setPendingGradeId\] = useState\(\"\"\);/);
  assert.match(source, /setPendingGradeId\(grade\.gradeId\)/);
  assert.match(source, /const \[expandedGradeList, setExpandedGradeList\] = useState\(false\);/);
  assert.doesNotMatch(source, /selectFirstTypeInGrade/);
});

test("quest problem option selection navigates by type only", () => {
  assert.match(source, /router\.push\(`\/quest\?type=\$\{encodeURIComponent\(option\.typeId\)\}`\)/);
  assert.doesNotMatch(source, /router\.push\(`\/quest\?type=\$\{encodeURIComponent\(option\.typeId\)\}&category=/);
});
