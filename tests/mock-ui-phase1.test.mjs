import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const exists = (p) => fs.existsSync(path.join(process.cwd(), p));

test("learning practice ui and api files exist", () => {
  const mustExist = [
    "src/app/api/learning/session/start/route.ts",
    "src/app/api/learning/session/answer/route.ts",
    "src/app/api/learning/session/finish/route.ts",
    "src/app/api/skill/[skillId]/route.ts",
    "src/app/mock-skills/page.tsx",
    "src/app/mock-skills/[skillId]/page.tsx",
    "src/app/mock-practice/page.tsx",
    "src/lib/learningSkillCatalog.ts",
    "packages/problem-format/learningSessionApi.ts",
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

test("skill list and detail pages use skill-system-based catalog", () => {
  const skillsPageSource = read("src/app/mock-skills/page.tsx");
  const detailPageSource = read("src/app/mock-skills/[skillId]/page.tsx");
  const catalogSource = read("src/lib/learningSkillCatalog.ts");

  assert.equal(skillsPageSource.includes('import { practiceSkills } from "@/lib/learningSkillCatalog";'), true);
  assert.equal(skillsPageSource.includes("dummySkills"), false);
  assert.equal(detailPageSource.includes('import { getPracticeSkill } from "@/lib/learningSkillCatalog";'), true);
  assert.equal(detailPageSource.includes("dummySkills"), false);
  assert.equal(detailPageSource.includes('href={`/mock-practice?skillId=${encodeURIComponent(skill.id)}`}'), true);
  assert.equal(catalogSource.includes('import skillsData from "packages/skill-system/skills.json";'), true);
  assert.equal(catalogSource.includes("problemCount: 5"), true);
});

test("mock practice uses learning session lifecycle instead of runtime quiz generation", () => {
  const source = read("src/app/mock-practice/page.tsx");

  assert.equal(source.includes('fetch("/api/learning/session/start"'), true);
  assert.equal(source.includes('fetch("/api/learning/session/answer"'), true);
  assert.equal(source.includes('fetch("/api/learning/session/finish"'), true);
  assert.equal(source.includes("loadStateFromClient()"), true);
  assert.equal(source.includes("LEARNING_STATE_KEY"), true);
  assert.equal(source.includes("window.localStorage.setItem"), true);
  assert.equal(source.includes("state: learningState"), true);
  assert.equal(source.includes('session.problems[session.index]'), true);
  assert.equal(source.includes("displayedProblem.problem.question"), true);
  assert.equal(source.includes("displayedProblem.problem.answer"), true);
  assert.equal(source.includes("resultSummary"), true);
  assert.equal(source.includes('fetch(`/api/skill/${encodeURIComponent(nextSkillId)}`'), false);
  assert.equal(source.includes('fetch("/api/learning/recommendation"'), false);
});

test("learning api routes delegate to learning engine with state in/out and old skill route is disabled", () => {
  const startSource = read("src/app/api/learning/session/start/route.ts");
  const answerSource = read("src/app/api/learning/session/answer/route.ts");
  const finishSource = read("src/app/api/learning/session/finish/route.ts");
  const oldSkillSource = read("src/app/api/skill/[skillId]/route.ts");
  const apiTypesSource = read("packages/problem-format/learningSessionApi.ts");
  const storeSource = read("packages/learning-engine/studentStore.ts");

  assert.equal(startSource.includes('import { serializeState, startSession } from "packages/learning-engine";'), true);
  assert.equal(answerSource.includes('import { recordAnswer, serializeState } from "packages/learning-engine";'), true);
  assert.equal(finishSource.includes('import { finishSession, serializeState } from "packages/learning-engine";'), true);
  assert.equal(exists("src/app/api/learning/recommendation/route.ts"), false);
  assert.equal(oldSkillSource.includes("learning_session_api_required"), true);
  assert.equal(oldSkillSource.includes("buildTypeStock"), false);
  assert.equal(oldSkillSource.includes("pickUniqueQuizFromStock"), false);
  assert.equal(apiTypesSource.includes("export type LearningSessionStartResponse = {"), true);
  assert.equal(apiTypesSource.includes("state: LearningState;"), true);
  assert.equal(apiTypesSource.includes("export type LearningSessionAnswerResponse = {"), true);
  assert.equal(apiTypesSource.includes("export type LearningSessionFinishResponse = {"), true);
  assert.equal(apiTypesSource.includes("result: SessionResult;"), true);
  assert.equal(storeSource.includes("version: number"), true);
  assert.equal(storeSource.includes("engineVersion: number"), true);
  assert.equal(storeSource.includes("const LEARNING_STATE_VERSION = 1"), true);
  assert.equal(storeSource.includes("const CURRENT_ENGINE_VERSION = 1"), true);
  assert.equal(storeSource.includes("value.version !== LEARNING_STATE_VERSION"), true);
  assert.equal(storeSource.includes("value.engineVersion !== CURRENT_ENGINE_VERSION"), true);
});

test("session result view shows difficulty swing weak patterns and recommendation", () => {
  const resultViewSource = read("packages/ui/SessionResultView.tsx");

  assert.equal(resultViewSource.includes("difficultyBefore"), true);
  assert.equal(resultViewSource.includes("difficultyAfter"), true);
  assert.equal(resultViewSource.includes("weakPatternsDetected"), true);
  assert.equal(resultViewSource.includes("recommendationLabel"), true);
  assert.equal(resultViewSource.includes("Difficulty"), true);
  assert.equal(resultViewSource.includes("Weak Patterns"), true);
  assert.equal(resultViewSource.includes("Next Action"), true);
});
