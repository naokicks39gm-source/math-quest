import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const questPath = path.join(process.cwd(), "src/app/quest/page.tsx");
const source = fs.readFileSync(questPath, "utf8");

test("quest uses random pool questions and next-level navigation", () => {
  assert.equal(source.includes("const TOTAL_QUESTIONS = 5;"), true);
  assert.equal(source.includes("const QUESTION_POOL_SIZE = 30;"), true);
  assert.equal(source.includes("buildRandomQuestionSet(poolCandidates, QUESTION_POOL_SIZE, quizSize)"), true);
  assert.equal(source.includes("const sameTypeAcrossGrades = allCategoryItems.filter("), true);
  assert.equal(source.includes("setStatus('cleared');"), true);
  assert.equal(source.includes("クリアー！"), true);
  assert.equal(source.includes("if (v + 1 >= totalQuizQuestions)"), true);
  assert.equal(source.includes("setQuestionResults((prev) => ({"), true);
  assert.equal(source.includes("correctAnswer?: string"), true);
  assert.equal(source.includes("everWrong: boolean"), true);
  assert.equal(source.includes("firstWrongAnswer?: string"), true);
  assert.equal(source.includes("const finalWrong = r.everWrong === true;"), true);
  assert.equal(source.includes("r.firstWrongAnswer ?? r.userAnswer"), true);
  assert.equal(source.includes("correct: !everWrong"), true);
  assert.equal(source.includes("if (isDrawingRef.current) return \"\";"), true);
  assert.equal(source.includes("学習終了"), true);
  assert.equal(source.includes("status === 'playing' && (inputMode === 'numpad' ? ("), true);
  assert.equal(source.includes("status === 'playing' && selectedPath"), true);
  assert.equal(source.includes("まちがえた もんだい"), false);
  assert.equal(source.includes("`/quest?type=${encodeURIComponent(next.typeId)}&category=${encodeURIComponent(next.categoryId)}`"), true);
});
