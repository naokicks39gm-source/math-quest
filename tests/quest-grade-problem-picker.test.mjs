import test from "node:test";
import assert from "node:assert/strict";
import { readQuestSource } from "./helpers/quest-source.mjs";

const source = readQuestSource();

test("quest top picker uses one problem button with grade and problem sections", () => {
  assert.match(source, /問題を選ぶ/);
  assert.doesNotMatch(source, /同じ学年の問題を選ぶ/);
  assert.match(source, /<span>学年<\/span>/);
  assert.match(source, /<span>問題<\/span>/);
  assert.match(source, /const gradeOptions = grades\.map/);
  assert.match(source, /const pickerGradeTypes = \(\(\) =>/);
  assert.match(source, /currentGradeOptionRef: useRef<HTMLButtonElement \| null>\(null\),/);
  assert.match(source, /currentProblemOptionRef: useRef<HTMLButtonElement \| null>\(null\),/);
  assert.match(source, /problemOptionsScrollRef: useRef<HTMLDivElement \| null>\(null\),/);
  assert.match(source, /ref=\{isPickedGrade \? currentGradeOptionRef : null\}/);
  assert.match(source, /ref=\{isCurrent \? currentProblemOptionRef : null\}/);
  assert.match(source, /ref=\{problemOptionsScrollRef\}/);
  assert.match(source, /pickerGradeTypes\.map\(\(option: any\) =>/);
  assert.match(source, /grade\.categories\.flatMap/);
});

test("quest grade selection updates pending grade without immediate navigation", () => {
  assert.match(source, /const \[pendingGradeId, setPendingGradeId\] = useState\(\"\"\);/);
  assert.match(source, /setPendingGradeId\(grade\.gradeId\)/);
  assert.match(source, /const \[expandedGradeList, setExpandedGradeList\] = useState\(false\);/);
  assert.doesNotMatch(source, /selectFirstTypeInGrade/);
});

test("quest problem option selection navigates by type only", () => {
  assert.match(source, /router\.push\(`\/quest\?type=\$\{encodeURIComponent\(option\.typeId\)\}`\)/);
  assert.match(source, /router\.push\(`\/quest\?type=\$\{encodeURIComponent\(next\.typeId\)\}&category=\$\{encodeURIComponent\(next\.categoryId\)\}`\)/);
});
