import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const exists = (p) => fs.existsSync(path.join(process.cwd(), p));

test("learning practice ui and api files exist", () => {
  const mustExist = [
    "src/app/api/learning/session/[sessionId]/route.ts",
    "src/app/api/learning/session/start/route.ts",
    "src/app/api/learning/session/answer/route.ts",
    "src/app/api/learning/session/finish/route.ts",
    "src/app/api/skill/[skillId]/route.ts",
    "src/app/mock-skills/page.tsx",
    "src/app/mock-skills/[skillId]/page.tsx",
    "src/app/mock-practice/page.tsx",
    "src/app/review/page.tsx",
    "src/app/skills/page.tsx",
    "src/components/AppHeader.tsx",
    "src/components/QuestSettingsPanel.tsx",
    "src/lib/analytics.ts",
    "src/lib/learningSkillCatalog.ts",
    "src/lib/learningPatternCatalog.ts",
    "src/lib/resetProgress.ts",
    "src/lib/streak.ts",
    "src/lib/xp.ts",
    "packages/problem-format/learningSessionApi.ts",
    "packages/ui/SkillList.tsx",
    "packages/ui/SkillCard.tsx",
    "packages/ui/SkillProgressBar.tsx",
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
  const layoutSource = read("src/app/layout.tsx");
  const homeSource = read("src/app/page.tsx");
  const skillsPageSource = read("src/app/mock-skills/page.tsx");
  const detailPageSource = read("src/app/mock-skills/[skillId]/page.tsx");
  const progressPageSource = read("src/app/skills/page.tsx");
  const reviewPageSource = read("src/app/review/page.tsx");
  const analyticsSource = read("src/lib/analytics.ts");
  const headerSource = read("src/components/AppHeader.tsx");
  const resetSource = read("src/lib/resetProgress.ts");
  const catalogSource = read("src/lib/learningSkillCatalog.ts");
  const patternCatalogSource = read("src/lib/learningPatternCatalog.ts");
  const streakSource = read("src/lib/streak.ts");
  const xpSource = read("src/lib/xp.ts");

  assert.equal(layoutSource.includes('import AppHeader from "@/components/AppHeader";'), true);
  assert.equal(layoutSource.includes("<AppHeader />"), true);
  assert.equal(homeSource.includes("Math Quest"), true);
  assert.equal(homeSource.includes("Start Learning"), true);
  assert.equal(homeSource.includes("Review Weak Skills"), true);
  assert.equal(homeSource.includes('trackAnalyticsEvent("app_start")'), true);
  assert.equal(homeSource.includes('router.push("/skills")'), true);
  assert.equal(headerSource.includes('href="/skills"'), true);
  assert.equal(headerSource.includes('href="/review"'), true);
  assert.equal(headerSource.includes('pathname.startsWith(prefix)'), true);
  assert.equal(skillsPageSource.includes('import { practiceSkills } from "@/lib/learningSkillCatalog";'), true);
  assert.equal(skillsPageSource.includes("dummySkills"), false);
  assert.equal(detailPageSource.includes('import { getPracticeSkill } from "@/lib/learningSkillCatalog";'), true);
  assert.equal(detailPageSource.includes("dummySkills"), false);
  assert.equal(detailPageSource.includes('href={`/mock-practice?skillId=${encodeURIComponent(skill.id)}`}'), true);
  assert.equal(progressPageSource.includes('import { loadStateFromClient } from "packages/learning-engine/studentStore";'), true);
  assert.equal(progressPageSource.includes("state.skillProgress[skill.id]"), true);
  assert.equal(progressPageSource.includes('router.push(`/quest?skillId=${encodeURIComponent(skill.id)}`)'), true);
  assert.equal(progressPageSource.includes("mastery >= 0.75"), true);
  assert.equal(progressPageSource.includes("mastery > 0"), true);
  assert.equal(progressPageSource.includes('return "not_started";'), true);
  assert.equal(progressPageSource.includes("getSkillSortRank"), true);
  assert.equal(progressPageSource.includes("const getRecommendedSkill"), true);
  assert.equal(progressPageSource.includes("skill.patterns.length > 0"), true);
  assert.equal(progressPageSource.includes('.filter((skill) => (skill.mastery ?? 0) < 0.75 && skill.patterns.length > 0)'), true);
  assert.equal(progressPageSource.includes("Recommended"), true);
  assert.equal(progressPageSource.includes("Start Practice"), true);
  assert.equal(progressPageSource.includes(") : null}"), true);
  assert.equal(progressPageSource.includes('import { readDailyStreak, type DailyStreak } from "@/lib/streak";'), true);
  assert.equal(progressPageSource.includes('import { readXp, type StoredXp } from "@/lib/xp";'), true);
  assert.equal(progressPageSource.includes('trackAnalyticsEvent("skill_open")'), true);
  assert.equal(progressPageSource.includes("setXp(readXp());"), true);
  assert.equal(progressPageSource.includes("XP {xp.totalXp}"), true);
  assert.equal(progressPageSource.includes("🔥 {streak.streak} day streak"), true);
  assert.equal(progressPageSource.includes("left.mastery ?? 0"), true);
  assert.equal(progressPageSource.includes("right.mastery ?? 0"), true);
  assert.equal(progressPageSource.includes('leftBucket === "learning" && rightBucket === "learning"'), true);
  assert.equal(progressPageSource.includes("left.title.localeCompare"), true);
  assert.equal(reviewPageSource.includes('import { loadStateFromClient } from "packages/learning-engine/studentStore";'), true);
  assert.equal(reviewPageSource.includes('trackAnalyticsEvent("review_open")'), true);
  assert.equal(reviewPageSource.includes("progress.attempts >= 2 && progress.mastery < 0.7"), true);
  assert.equal(reviewPageSource.includes('router.push(`/quest?patternId=${encodeURIComponent(patternId)}`)'), true);
  assert.equal(reviewPageSource.includes("Weak Skills"), true);
  assert.equal(reviewPageSource.includes("Practice"), true);
  assert.equal(catalogSource.includes('import skillsData from "packages/skill-system/skills.json";'), true);
  assert.equal(patternCatalogSource.includes('import skillsData from "packages/skill-system/skills.json";'), true);
  assert.equal(patternCatalogSource.includes('import addBasicPatterns from "packages/problem-engine/patterns/E1/add-basic.json";'), true);
  assert.equal(patternCatalogSource.includes("title: pattern.template"), true);
  assert.equal(streakSource.includes('export const STREAK_STORAGE_KEY = "mq:streak";'), true);
  assert.equal(streakSource.includes("lastStudyDate"), true);
  assert.equal(streakSource.includes("current?.lastStudyDate === today"), true);
  assert.equal(streakSource.includes("current?.lastStudyDate === yesterday"), true);
  assert.equal(xpSource.includes('export const XP_STORAGE_KEY = "mq:xp";'), true);
  assert.equal(xpSource.includes("totalXp"), true);
  assert.equal(xpSource.includes("earnedXp = Math.max(0, Math.trunc(correctCount)) * 10"), true);
  assert.equal(resetSource.includes('window.localStorage.removeItem(XP_STORAGE_KEY);'), true);
  assert.equal(resetSource.includes('window.localStorage.removeItem(STREAK_STORAGE_KEY);'), true);
  assert.equal(resetSource.includes('window.localStorage.removeItem(LEARNING_SESSION_STORAGE_KEY);'), true);
  assert.equal(resetSource.includes('window.localStorage.removeItem(LEARNING_STATE_KEY);'), true);
  assert.equal(resetSource.includes("mq:analytics"), false);
  assert.equal(analyticsSource.includes('export const ANALYTICS_STORAGE_KEY = "mq:analytics";'), true);
  assert.equal(analyticsSource.includes('"app_start"'), true);
  assert.equal(analyticsSource.includes('"session_start"'), true);
  assert.equal(analyticsSource.includes('"session_finish"'), true);
  assert.equal(analyticsSource.includes('"skill_open"'), true);
  assert.equal(analyticsSource.includes('"review_open"'), true);
  assert.equal(analyticsSource.includes("event: AnalyticsEventName;"), true);
  assert.equal(analyticsSource.includes("timestamp: number;"), true);
  assert.equal(analyticsSource.includes("slice(-MAX_ANALYTICS_EVENTS)"), true);
  assert.equal(catalogSource.includes("grade: string"), true);
  assert.equal(catalogSource.includes("patterns: string[]"), true);
  assert.equal(catalogSource.includes("patterns: skill.patterns"), true);
  assert.equal(catalogSource.includes("grade: skill.grade"), true);
  assert.equal(catalogSource.includes("problemCount: 5"), true);
});

test("mock practice uses learning session lifecycle instead of runtime quiz generation", () => {
  const source = read("src/app/mock-practice/page.tsx");

  assert.equal(source.includes('fetch("/api/learning/session/start"'), true);
  assert.equal(source.includes('fetch("/api/learning/session/answer"'), true);
  assert.equal(source.includes('fetch("/api/learning/session/finish"'), true);
  assert.equal(source.includes('import { updateDailyStreak } from "@/lib/streak";'), true);
  assert.equal(source.includes('import { updateXpFromSession } from "@/lib/xp";'), true);
  assert.equal(source.includes('import { trackAnalyticsEvent } from "@/lib/analytics";'), true);
  assert.equal(source.includes("updateDailyStreak();"), true);
  assert.equal(source.includes("updateXpFromSession(summary.result.score);"), true);
  assert.equal(source.includes('trackAnalyticsEvent("session_finish")'), true);
  assert.equal(source.includes("earnedXp={resultSummary.result.score * 10}"), true);
  assert.equal(source.includes("sessionId"), true);
  assert.equal(source.includes("index: answerIndex"), true);
  assert.equal(source.includes("answer,"), true);
  assert.equal(source.includes("loadStateFromClient()"), true);
  assert.equal(source.includes("LEARNING_STATE_KEY"), true);
  assert.equal(source.includes("window.localStorage.setItem"), true);
  assert.equal(source.includes("sessionId,"), true);
  assert.equal(source.includes('session.problems[session.index]'), true);
  assert.equal(source.includes("displayedProblem.problem.question"), true);
  assert.equal(source.includes("displayedProblem.problem.answer"), true);
  assert.equal(source.includes("resultSummary"), true);
  assert.equal(source.includes('fetch(`/api/skill/${encodeURIComponent(nextSkillId)}`'), false);
  assert.equal(source.includes('fetch("/api/learning/recommendation"'), false);
});

test("quest and review support weak pattern practice flow", () => {
  const questSource = read("src/app/quest/page.tsx");
  const reviewSource = read("src/app/review/page.tsx");
  const settingsSource = read("src/components/QuestSettingsPanel.tsx");

  assert.equal(reviewSource.includes('router.push(`/quest?patternId=${encodeURIComponent(patternId)}`)'), true);
  assert.equal(questSource.includes('import { updateDailyStreak } from "@/lib/streak";'), true);
  assert.equal(questSource.includes('import { updateXpFromSession } from "@/lib/xp";'), true);
  assert.equal(questSource.includes('import { trackAnalyticsEvent } from "@/lib/analytics";'), true);
  assert.equal(questSource.includes('import { resetProgress } from "@/lib/resetProgress";'), true);
  assert.equal(questSource.includes('import QuestSettingsPanel from "@/components/QuestSettingsPanel";'), true);
  assert.equal(questSource.includes('const patternIdFromQuery = (params.get("patternId") ?? "").trim();'), true);
  assert.equal(questSource.includes("const hasPatternQuery = Boolean(patternIdFromQuery);"), true);
  assert.equal(questSource.includes('const patternEntry = getLearningPattern(patternIdFromQuery);'), true);
  assert.equal(questSource.includes("generateProblems(patternEntry.pattern, quizSize)"), true);
  assert.equal(questSource.includes('type_id: `REVIEW.${patternEntry.skillId}.${patternEntry.patternId}`'), true);
  assert.equal(questSource.includes("updateDailyStreak();"), true);
  assert.equal(questSource.includes("updateXpFromSession(data.result.score);"), true);
  assert.equal(questSource.includes('trackAnalyticsEvent("session_start")'), true);
  assert.equal(questSource.includes('trackAnalyticsEvent("session_finish")'), true);
  assert.equal(questSource.includes("sessionStartTrackedRef.current"), true);
  assert.equal(questSource.includes("earnedXp={learningResult.score * 10}"), true);
  assert.equal(questSource.includes('window.confirm("Reset progress? XP, streak, session, and learning state will be cleared.")'), true);
  assert.equal(questSource.includes("resetProgress();"), true);
  assert.equal(questSource.includes('router.push("/skills")'), true);
  assert.equal(questSource.includes("<QuestSettingsPanel"), true);
  assert.equal(settingsSource.includes("Reset Progress"), true);
  assert.equal(settingsSource.includes("XP / Streak / session / learning state"), true);
});

test("learning api routes delegate to learning engine with state in/out and old skill route is disabled", () => {
  const startSource = read("src/app/api/learning/session/start/route.ts");
  const answerSource = read("src/app/api/learning/session/answer/route.ts");
  const finishSource = read("src/app/api/learning/session/finish/route.ts");
  const resumeSource = read("src/app/api/learning/session/[sessionId]/route.ts");
  const oldSkillSource = read("src/app/api/skill/[skillId]/route.ts");
  const apiTypesSource = read("packages/problem-format/learningSessionApi.ts");
  const storeSource = read("packages/learning-engine/studentStore.ts");

  assert.equal(startSource.includes('import { serializeState, startSession } from "packages/learning-engine";'), true);
  assert.equal(answerSource.includes('import { recordAnswer, serializeState } from "packages/learning-engine";'), true);
  assert.equal(finishSource.includes('import { finishSession, serializeState } from "packages/learning-engine";'), true);
  assert.equal(resumeSource.includes("getLearningSessionById"), true);
  assert.equal(answerSource.includes("body.sessionId?.trim()"), true);
  assert.equal(answerSource.includes("typeof body.index !== \"number\""), true);
  assert.equal(answerSource.includes("Partial<LearningSessionAnswerRequest>"), true);
  assert.equal(answerSource.includes("learning_session_index_mismatch"), true);
  assert.equal(answerSource.includes("currentIndex !== body.index"), true);
  assert.equal(finishSource.includes("sessionId?: string"), true);
  assert.equal(exists("src/app/api/learning/recommendation/route.ts"), false);
  assert.equal(oldSkillSource.includes("learning_session_api_required"), true);
  assert.equal(oldSkillSource.includes("buildTypeStock"), false);
  assert.equal(oldSkillSource.includes("pickUniqueQuizFromStock"), false);
  assert.equal(apiTypesSource.includes("export type LearningSessionStartResponse = {"), true);
  assert.equal(apiTypesSource.includes("sessionId: string;"), true);
  assert.equal(apiTypesSource.includes("state: LearningState;"), true);
  assert.equal(apiTypesSource.includes("export type LearningSessionAnswerResponse = {"), true);
  assert.equal(apiTypesSource.includes("export type LearningSessionAnswerRequest = {"), true);
  assert.equal(apiTypesSource.includes("index: number;"), true);
  assert.equal(apiTypesSource.includes("answer: string;"), true);
  assert.equal(apiTypesSource.includes("export type LearningSessionFinishResponse = {"), true);
  assert.equal(apiTypesSource.includes("skillProgressBefore: LearningSkillProgress | null;"), true);
  assert.equal(apiTypesSource.includes("skillProgressAfter: LearningSkillProgress | null;"), true);
  assert.equal(apiTypesSource.includes("export type LearningSessionResumeResponse = {"), true);
  assert.equal(apiTypesSource.includes("result: SessionResult;"), true);
  assert.equal(storeSource.includes("version: number"), true);
  assert.equal(storeSource.includes("engineVersion: number"), true);
  assert.equal(storeSource.includes("const LEARNING_STATE_VERSION = 1"), true);
  assert.equal(storeSource.includes("const CURRENT_ENGINE_VERSION = 1"), true);
  assert.equal(storeSource.includes("value.version !== LEARNING_STATE_VERSION"), true);
  assert.equal(storeSource.includes("value.engineVersion !== CURRENT_ENGINE_VERSION"), true);
});

test("session result view shows difficulty swing weak patterns and continue actions", () => {
  const resultViewSource = read("packages/ui/SessionResultView.tsx");

  assert.equal(resultViewSource.includes("difficultyBefore"), true);
  assert.equal(resultViewSource.includes("difficultyAfter"), true);
  assert.equal(resultViewSource.includes("weakPatternsDetected"), true);
  assert.equal(resultViewSource.includes("skillName"), true);
  assert.equal(resultViewSource.includes("skillProgressBefore"), true);
  assert.equal(resultViewSource.includes("skillProgressAfter"), true);
  assert.equal(resultViewSource.includes("Skill Progress"), true);
  assert.equal(resultViewSource.includes("earnedXp"), true);
  assert.equal(resultViewSource.includes("+{earnedXp} XP"), true);
  assert.equal(resultViewSource.includes(">XP<"), true);
  assert.equal(resultViewSource.includes("delta > 0"), true);
  assert.equal(resultViewSource.includes("text-emerald-600"), true);
  assert.equal(resultViewSource.includes("text-slate-500"), true);
  assert.equal(resultViewSource.includes("onContinueLearning"), true);
  assert.equal(resultViewSource.includes("Difficulty"), true);
  assert.equal(resultViewSource.includes("Weak Patterns"), true);
  assert.equal(resultViewSource.includes("Continue Learning"), true);
  assert.equal(resultViewSource.includes("Next Action"), false);
});

test("skills ui components expose mastery progress and status", () => {
  const skillCardSource = read("packages/ui/SkillCard.tsx");
  const progressBarSource = read("packages/ui/SkillProgressBar.tsx");
  const uiIndexSource = read("packages/ui/index.ts");

  assert.equal(skillCardSource.includes('import SkillProgressBar from "packages/ui/SkillProgressBar";'), true);
  assert.equal(skillCardSource.includes('mastery >= 0.75 ? "mastered" : "learning"'), true);
  assert.equal(skillCardSource.includes("skill.grade"), true);
  assert.equal(skillCardSource.includes("Math.round(mastery * 100)"), true);
  assert.equal(progressBarSource.includes("type SkillProgressBarProps = {"), true);
  assert.equal(progressBarSource.includes("mastery: number;"), true);
  assert.equal(progressBarSource.includes("normalizedMastery * 100"), true);
  assert.equal(uiIndexSource.includes('export { default as SkillProgressBar } from "./SkillProgressBar";'), true);
});
