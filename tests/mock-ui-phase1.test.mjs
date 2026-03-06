import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const exists = (p) => fs.existsSync(path.join(process.cwd(), p));

test("mock ui phase1 files exist", () => {
  const mustExist = [
    "packages/problem-format/skillPracticeResponse.ts",
    "src/app/api/skill/[skillId]/route.ts",
    "src/app/mock-skills/page.tsx",
    "src/app/mock-skills/[skillId]/page.tsx",
    "src/app/mock-practice/page.tsx",
    "src/mock/dummySkills.ts",
    "packages/ui/SkillList.tsx",
    "packages/ui/SkillCard.tsx",
    "packages/ui/ProblemCard.tsx",
    "packages/ui/AnswerInput.tsx",
    "packages/ui/ResultView.tsx",
    "packages/ui/SessionResultView.tsx"
  ];

  for (const file of mustExist) {
    assert.equal(exists(file), true, `${file} is missing`);
  }
});

test("dummy data is populated for mock flow", () => {
  const skillsSource = read("src/mock/dummySkills.ts");

  assert.equal(skillsSource.includes('title: "10までのたし算"'), true);
  assert.equal(skillsSource.includes('title: "時計"'), true);
  assert.equal(skillsSource.includes('difficulty: "Easy"'), true);
  assert.equal(skillsSource.includes("problemCount: 5"), true);
  assert.equal(skillsSource.includes("typeIds: ["), true);
  assert.equal(skillsSource.includes('"E1.NA.ADD.ADD_1D_1D_NO"'), true);
  assert.equal(skillsSource.includes('"E1.ME.TIME.TIME_MIN"'), true);
});

test("mock pages avoid engine imports", () => {
  const sources = [
    read("src/app/api/skill/[skillId]/route.ts"),
    read("src/app/mock-skills/page.tsx"),
    read("src/app/mock-skills/[skillId]/page.tsx"),
    read("src/app/mock-practice/page.tsx"),
    read("src/mock/dummySkills.ts"),
    read("packages/ui/SkillList.tsx"),
    read("packages/ui/SkillCard.tsx"),
    read("packages/ui/ProblemCard.tsx"),
    read("packages/ui/AnswerInput.tsx"),
    read("packages/ui/ResultView.tsx"),
    read("packages/ui/SessionResultView.tsx")
  ].join("\n");

  assert.equal(sources.includes("skill-system"), false);
  assert.equal(sources.includes("learning-engine"), false);
});

test("mock practice supports a 5-question session and score view", () => {
  const source = read("src/app/mock-practice/page.tsx");
  const resultViewSource = read("packages/ui/SessionResultView.tsx");
  const responseTypeSource = read("packages/problem-format/skillPracticeResponse.ts");

  assert.equal(source.includes('import type { SkillPracticeProblem, SkillPracticeResponse } from "packages/problem-format/skillPracticeResponse";'), true);
  assert.equal(source.includes("type PracticeProblem = {"), false);
  assert.equal(source.includes("type SkillProblemsResponse = {"), false);
  assert.equal(source.includes("const TOTAL_QUESTIONS = 5;"), true);
  assert.equal(source.includes("Question {Math.min(currentIndex + 1, TOTAL_QUESTIONS)} / {TOTAL_QUESTIONS}"), true);
  assert.equal(source.includes("const [correctCount, setCorrectCount] = useState(0);"), true);
  assert.equal(source.includes("const [isSessionComplete, setIsSessionComplete] = useState(false);"), true);
  assert.equal(source.includes('fetch(`/api/skill/${encodeURIComponent(nextSkillId)}`'), true);
  assert.equal(source.includes('import { dummyProblems } from "@/mock/dummyProblems";'), false);
  assert.equal(source.includes('const [problems, setProblems] = useState<SkillPracticeProblem[]>([]);'), true);
  assert.equal(source.includes('const [loading, setLoading] = useState(true);'), true);
  assert.equal(source.includes('const [error, setError] = useState<string | null>(null);'), true);
  assert.equal(source.includes("Skill not found"), true);
  assert.equal(source.includes("Problems unavailable"), true);
  assert.equal(source.includes("fallback={<div>Loading...</div>}"), true);
  assert.equal(source.includes("if (currentIndex + 1 >= TOTAL_QUESTIONS) {"), true);
  assert.equal(source.includes("onRetry={handleRetry}"), true);
  assert.equal(source.includes("onBackToSkills={handleBackToSkills}"), true);
  assert.equal(resultViewSource.includes("Score"), true);
  assert.equal(resultViewSource.includes("{score} / {totalQuestions} correct"), true);
  assert.equal(resultViewSource.includes("Retry"), true);
  assert.equal(resultViewSource.includes("Back to Skills"), true);
  assert.equal(responseTypeSource.includes("export type SkillPracticeProblem = {"), true);
  assert.equal(responseTypeSource.includes("difficulty?: number"), true);
  assert.equal(responseTypeSource.includes("export type SkillPracticeResponse = {"), true);
});

test("mock skills route uses skill detail and practice start flow", () => {
  const skillsPageSource = read("src/app/mock-skills/page.tsx");
  const detailPageSource = read("src/app/mock-skills/[skillId]/page.tsx");

  assert.equal(skillsPageSource.includes('router.push(`/mock-skills/${encodeURIComponent(skill.id)}`);'), true);
  assert.equal(skillsPageSource.includes("詳細画面へ移動します"), true);
  assert.equal(detailPageSource.includes("Practice Start"), true);
  assert.equal(detailPageSource.includes("Difficulty"), true);
  assert.equal(detailPageSource.includes("問題数"), true);
  assert.equal(detailPageSource.includes('href={`/mock-practice?skillId=${encodeURIComponent(skill.id)}`}'), true);
});

test("skill api route generates 5 problems from existing stock", () => {
  const source = read("src/app/api/skill/[skillId]/route.ts");
  const formatIndexSource = read("packages/problem-format/index.ts");

  assert.equal(source.includes('import type { SkillPracticeResponse } from "packages/problem-format/skillPracticeResponse";'), true);
  assert.equal(source.includes("getCatalogGrades"), true);
  assert.equal(source.includes("buildTypeStock(type, STOCK_TARGET).entries"), true);
  assert.equal(source.includes("pickUniqueQuizFromStock(stock, QUIZ_SIZE, TARGET_DIFFICULTY).entries"), true);
  assert.equal(source.includes("if (picked.length !== QUIZ_SIZE) {"), true);
  assert.equal(source.includes("const response: SkillPracticeResponse = {"), true);
  assert.equal(source.includes("return Response.json(response);"), true);
  assert.equal(source.includes("question: entry.item.prompt_tex ?? entry.item.prompt"), true);
  assert.equal(source.includes("skillTitle"), false);
  assert.equal(source.includes("patternId:"), false);
  assert.equal(source.includes("typeId:"), false);
  assert.equal(formatIndexSource.includes("SkillPracticeProblem"), true);
  assert.equal(formatIndexSource.includes("SkillPracticeResponse"), true);
});
