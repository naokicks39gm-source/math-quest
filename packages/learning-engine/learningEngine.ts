import skillsData from "packages/skill-system/skills.json";
import { generateRuntimeProblems } from "packages/problem-engine";
import { generateExplanation } from "packages/problem-explanation";
import { generateHint } from "packages/problem-hint";

import { updatePatternProgress as nextPatternProgress } from "./patternProgressTracker";
import { getNextRecommendedSkillId } from "./progression-engine";
import { updateSkillProgress } from "./skillProgressTracker";
import type { SkillProgress } from "./skillProgressTypes";
import type { Session, SessionHistoryEntry, SessionProblem } from "./sessionTypes";
import { attachLearningAids, buildSession } from "./sessionBuilder";
import { createLearningState, serializeState, updateXP, type LearningState } from "./studentStore";
import { PROGRESSION_UNLOCK_THRESHOLD, isSkillUnlocked, unlockNextSkills } from "./skill-unlock";
import { getWeakPatterns, resolveSkillPatterns, type WeakPattern } from "./weaknessAnalyzer";

type StartSessionOptions = {
  mode: "skill" | "adaptive";
  skillId?: string;
  carryoverHistory?: SessionHistoryEntry[];
  recentProblems?: string[];
};

type RecordAnswerInput = {
  correct: boolean;
  userAnswer?: string;
};

export type Recommendation =
  | { type: "adaptive"; reason: "weak_patterns"; weakPatterns: number }
  | { type: "skill"; skillId: string; reason: "next_skill" }
  | { type: "done"; reason: "all_mastered" };

export type SessionResult = {
  score: number;
  totalQuestions: number;
  difficultyBefore: number;
  difficultyAfter: number;
  weakPatternsDetected: number;
  skillProgressBefore: SkillProgress | null;
  skillProgressAfter: SkillProgress | null;
  skillXpBefore: number;
  skillXpAfter: number;
  requiredXP: number;
  cleared: boolean;
  newlyUnlockedSkillIds: string[];
  earnedXp: number;
  history: SessionHistoryEntry[];
  recentProblems: string[];
  recommendation: Recommendation;
};

type SkillDefinition = {
  id: string;
  prerequisite?: string[];
  difficulty: number;
  requiredXP?: number;
};

const WEAK_PATTERN_THRESHOLD = 2;

const skills = skillsData as SkillDefinition[];
const DEFAULT_REQUIRED_XP = 100;
const XP_BASE = 30;
const XP_COMBO_STEP = 5;
const XP_MAX_BONUS = 20;
const DIFFICULTY_MULTIPLIERS = {
  1: 1,
  2: 1.1,
  3: 1.25,
  4: 1.4,
  5: 1.6
} as const;

const getRequiredXP = (skillId: string) => skills.find((skill) => skill.id === skillId)?.requiredXP ?? DEFAULT_REQUIRED_XP;
const computeXpMastery = (skillId: string, skillXP: number) => Math.max(0, Math.min(skillXP / getRequiredXP(skillId), 1));
const clampSessionDifficulty = (difficulty: number) => Math.max(1, Math.min(5, Math.trunc(difficulty)));
const getDifficultyMultiplier = (difficulty: number) =>
  DIFFICULTY_MULTIPLIERS[clampSessionDifficulty(difficulty) as keyof typeof DIFFICULTY_MULTIPLIERS];
const computeAdaptiveXpGain = (combo: number, difficulty: number) => {
  const comboBonus = Math.min(Math.max(0, combo) * XP_COMBO_STEP, XP_MAX_BONUS);
  return Math.round((XP_BASE + comboBonus) * getDifficultyMultiplier(difficulty));
};

const isSkillMastered = (skillProgress: LearningState["skillProgress"], skillId: string) =>
  (skillProgress[skillId]?.mastery ?? 0) >= PROGRESSION_UNLOCK_THRESHOLD;

const resolveAdaptiveSkillId = (state: LearningState, requestedSkillId?: string) => {
  if (requestedSkillId) {
    return requestedSkillId;
  }

  const weakSkill = skills.find((skill) => {
    try {
      return isSkillUnlocked(state, skill.id) && getWeakPatterns(state, skill.id).length > 0;
    } catch {
      return false;
    }
  });

  if (weakSkill) {
    return weakSkill.id;
  }

  const activeSkill = state.session?.skillId;
  if (activeSkill && isSkillUnlocked(state, activeSkill)) {
    return activeSkill;
  }

  const firstAvailable = getNextRecommendedSkillId(state);

  if (!firstAvailable) {
    throw new Error("No supported skills available for adaptive session");
  }

  return firstAvailable;
};

const setLockedSkills = (skillProgress: LearningState["skillProgress"]) => {
  const next = { ...skillProgress };

  for (const skill of skills) {
    next[skill.id] = next[skill.id] ?? {
      skillId: skill.id,
      mastery: 0,
      mastered: false
    };
  }

  return next;
};

const buildReplacementProblem = (
  state: LearningState,
  currentProblem: SessionProblem,
  targetDifficulty: number
): SessionProblem => {
  const patterns = resolveSkillPatterns(currentProblem.skillId);
  const matchedPattern = patterns.find((pattern) => pattern.key === currentProblem.patternKey);

  if (!matchedPattern) {
    return currentProblem;
  }

  const recentProblems = state.session?.recentProblems ?? [];
  const recentQuestions = (state.session?.history ?? [])
    .slice(-5)
    .map((entry) => entry.question);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidates = generateRuntimeProblems(matchedPattern, 12).filter(
      (problem) =>
        problem.id !== currentProblem.problem.id &&
        problem.question !== currentProblem.problem.question &&
        !recentProblems.includes(problem.id) &&
        !recentQuestions.includes(problem.question) &&
        (typeof problem.meta?.difficulty !== "number" || clampSessionDifficulty(problem.meta.difficulty) <= targetDifficulty)
    );
    const replacement = candidates[attempt] ?? candidates[0];
    if (replacement) {
      return {
        ...currentProblem,
        problem: attachLearningAids({
          ...currentProblem,
          problem: replacement
        }).problem,
        difficulty: clampSessionDifficulty(replacement.meta?.difficulty ?? targetDifficulty)
      };
    }
  }

  return currentProblem;
};

const dedupeWeakPatterns = (patterns: WeakPattern[]): WeakPattern[] => {
  const next = new Map<string, WeakPattern>();

  for (const pattern of patterns) {
    if (!next.has(pattern.patternKey)) {
      next.set(pattern.patternKey, pattern);
    }
  }

  return [...next.values()];
};

const collectWeakPatterns = (state: LearningState) =>
  dedupeWeakPatterns(
    skills.flatMap((skill) => {
      try {
        return getWeakPatterns(state, skill.id);
      } catch {
        return [];
      }
    })
  );

const countWeakPatterns = (state: LearningState) => collectWeakPatterns(state).length;

const getSkillProgressSnapshot = (state: LearningState, skillId: string): SkillProgress =>
  state.skillProgress[skillId] ?? {
    skillId,
    mastery: 0,
    mastered: false
  };

const toHintText = (problem: SessionProblem) => generateHint(problem.problem).text;

const toExplanationText = (problem: SessionProblem) => {
  const explanation = generateExplanation(problem.problem);
  return [...explanation.steps, explanation.summary].filter((line) => line.trim().length > 0).join("\n");
};

export function getRecommendedSkill(state: LearningState): string | undefined {
  const currentState = serializeState(state);
  const unresolvedSkills = skills.filter((skill) => !isSkillMastered(currentState.skillProgress, skill.id));
  const unlockedCandidates = unresolvedSkills.filter((skill) => isSkillUnlocked(currentState, skill.id));
  return unlockedCandidates[0]?.id ?? unresolvedSkills[0]?.id;
}

export function startSession(state: LearningState, options: StartSessionOptions): { state: LearningState; session: Session } {
  const currentState = serializeState(state);

  if (options.mode === "skill" && !options.skillId) {
    throw new Error("skillId is required for skill sessions");
  }

  const skillId =
    options.mode === "adaptive" ? resolveAdaptiveSkillId(currentState, options.skillId) : (options.skillId as string);
  const carryoverSession: Session | undefined =
    options.carryoverHistory?.length || options.recentProblems?.length
      ? {
          mode: options.mode,
          skillId,
          startedDifficulty: clampSessionDifficulty(currentState.student.difficulty),
          currentDifficulty: clampSessionDifficulty(currentState.student.difficulty),
          skillProgressBefore: getSkillProgressSnapshot(currentState, skillId),
          skillXpBefore: currentState.skillXP[skillId] ?? 0,
          attemptCount: 0,
          currentHint: undefined,
          currentExplanation: undefined,
          combo: 0,
          failCount: 0,
          history: options.carryoverHistory ?? [],
          recentProblems: (options.recentProblems ?? []).slice(-5),
          problems: [],
          index: 0,
          correct: 0,
          wrong: 0
        }
      : currentState.session;
  const session = {
    ...buildSession(
      {
        ...currentState,
        session: carryoverSession
      },
      skillId,
      currentState.student.difficulty,
      options.mode
    ),
    skillProgressBefore: getSkillProgressSnapshot(currentState, skillId),
    skillXpBefore: currentState.skillXP[skillId] ?? 0,
    attemptCount: 0,
    currentHint: undefined,
    currentExplanation: undefined,
    history: options.carryoverHistory ?? carryoverSession?.history ?? [],
    recentProblems: (options.recentProblems ?? carryoverSession?.recentProblems ?? []).slice(-5)
  };
  const nextState = serializeState({
    ...currentState,
    session
  });

  return {
    state: nextState,
    session: nextState.session as Session
  };
}

export function recordAnswer(state: LearningState, result: RecordAnswerInput): { state: LearningState; session: Session } {
  const currentState = serializeState(state);
  const session = currentState.session;
  if (!session) {
    throw new Error("session_not_found");
  }

  const currentProblem = session.problems[session.index];
  if (!currentProblem) {
    throw new Error("session_problem_not_found");
  }

  const nextAttemptCount = result.correct ? 0 : session.attemptCount + 1;
  const nextCombo = result.correct ? session.combo + 1 : 0;
  const rawFailCount = result.correct ? 0 : session.failCount + 1;
  const loweredDifficulty = !result.correct && rawFailCount >= 2;
  const nextFailCount = result.correct ? 0 : loweredDifficulty ? 0 : rawFailCount;
  const nextDifficulty = result.correct
    ? clampSessionDifficulty(session.currentDifficulty + (nextCombo >= 3 ? 1 : 0))
    : clampSessionDifficulty(session.currentDifficulty - (loweredDifficulty ? 1 : 0));
  const xpGain = result.correct ? computeAdaptiveXpGain(nextCombo, session.currentDifficulty) : 0;
  const student = updateXP(
    {
      ...currentState.student,
      difficulty: nextDifficulty,
      solved: currentState.student.solved + 1,
      correct: currentState.student.correct + (result.correct ? 1 : 0)
    },
    xpGain
  );

  const patternProgress = {
    ...currentState.patternProgress,
    [currentProblem.patternKey]: nextPatternProgress(
      currentProblem.patternKey,
      result.correct,
      currentState.patternProgress[currentProblem.patternKey]
    )
  };

  const patternMasteries = resolveSkillPatterns(currentProblem.skillId)
    .map((pattern) => patternProgress[pattern.key]?.mastery)
    .filter((mastery): mastery is number => mastery !== undefined);

  const nextSkillXPValue = (currentState.skillXP[currentProblem.skillId] ?? 0) + xpGain;
  const nextSkillMasteryValue = computeXpMastery(currentProblem.skillId, nextSkillXPValue);
  const nextHistoryEntry: SessionHistoryEntry = {
    problemId: currentProblem.problem.id,
    question: currentProblem.problem.question,
    userAnswer: result.userAnswer ?? "",
    correctAnswer: currentProblem.problem.answer,
    isCorrect: result.correct,
    attemptCount: nextAttemptCount
  };
  const nextRecentProblems = [...session.recentProblems.filter((problemId) => problemId !== currentProblem.problem.id), currentProblem.problem.id].slice(-5);
  const skillProgress = setLockedSkills({
    ...currentState.skillProgress,
    [currentProblem.skillId]: {
      ...updateSkillProgress(
        currentState.skillProgress[currentProblem.skillId],
        currentProblem.skillId,
        patternMasteries
      ),
      mastery: nextSkillMasteryValue,
      mastered: nextSkillXPValue >= getRequiredXP(currentProblem.skillId)
    }
  });

  const nextSessionBase: Session = {
    ...session,
    currentDifficulty: nextDifficulty,
    combo: nextCombo,
    failCount: nextFailCount,
    attemptCount: nextAttemptCount,
    currentHint: result.correct ? undefined : session.currentHint,
    currentExplanation: result.correct ? undefined : session.currentExplanation,
    history: [...session.history, nextHistoryEntry],
    recentProblems: nextRecentProblems,
    index: Math.min(result.correct ? session.index + 1 : session.index, session.problems.length),
    correct: session.correct + (result.correct ? 1 : 0),
    wrong: session.wrong + (result.correct ? 0 : 1)
  };
  const replacementProblem = result.correct ? null : buildReplacementProblem(currentState, currentProblem, nextDifficulty);
  const nextSession =
    !result.correct && replacementProblem
      ? {
          ...nextSessionBase,
          currentHint: nextAttemptCount === 1 ? toHintText(replacementProblem) : undefined,
          currentExplanation: nextAttemptCount >= 2 ? toExplanationText(replacementProblem) : undefined,
          problems: nextSessionBase.problems.map((problem, index) =>
            index === nextSessionBase.index ? replacementProblem : problem
          )
        }
      : {
          ...nextSessionBase,
          currentHint: undefined,
          currentExplanation: undefined
        };
  const nextState = serializeState({
    ...currentState,
    student,
    patternProgress,
    skillProgress,
    skillMastery: {
      ...currentState.skillMastery,
      [currentProblem.skillId]: nextSkillMasteryValue
    },
    skillXP: {
      ...currentState.skillXP,
      [currentProblem.skillId]: nextSkillXPValue
    },
    unlockedSkills: currentState.unlockedSkills,
    session: nextSession
  });

  return {
    state: nextState,
    session: nextState.session as Session
  };
}

export function finishSession(state: LearningState): { state: LearningState; result: SessionResult } {
  const currentState = serializeState(state);
  const session = currentState.session;
  if (!session) {
    throw new Error("session_not_found");
  }

  const sessionSkillId = session.skillId;
  const skillProgressBefore = sessionSkillId
    ? (session.skillProgressBefore ?? getSkillProgressSnapshot(currentState, sessionSkillId))
    : null;
  const skillProgressAfter = sessionSkillId ? getSkillProgressSnapshot(currentState, sessionSkillId) : null;
  const skillXpBefore = session.skillXpBefore ?? (sessionSkillId ? currentState.skillXP[sessionSkillId] ?? 0 : 0);
  const skillXpAfter = sessionSkillId ? currentState.skillXP[sessionSkillId] ?? 0 : 0;
  const requiredXP = sessionSkillId ? getRequiredXP(sessionSkillId) : DEFAULT_REQUIRED_XP;
  const cleared = skillXpAfter >= requiredXP;
  const unlockedSkills =
    sessionSkillId && cleared
      ? unlockNextSkills(currentState, sessionSkillId)
      : currentState.unlockedSkills;
  const newlyUnlockedSkillIds = unlockedSkills.filter((skillId) => !currentState.unlockedSkills.includes(skillId));
  const recommendedState = serializeState({
    ...currentState,
    skillMastery: sessionSkillId
      ? {
          ...currentState.skillMastery,
          [sessionSkillId]: computeXpMastery(sessionSkillId, skillXpAfter)
        }
      : currentState.skillMastery,
    skillProgress: sessionSkillId
      ? {
          ...currentState.skillProgress,
          [sessionSkillId]: {
            skillId: sessionSkillId,
            mastery: computeXpMastery(sessionSkillId, skillXpAfter),
            mastered: cleared
          }
        }
      : currentState.skillProgress,
    unlockedSkills
  });
  const recommendation = recommendNextAction(recommendedState);
  const result: SessionResult = {
    score: session.correct,
    totalQuestions: session.problems.length,
    difficultyBefore: session.startedDifficulty,
    difficultyAfter: session.currentDifficulty,
    weakPatternsDetected: countWeakPatterns(currentState),
    skillProgressBefore,
    skillProgressAfter,
    skillXpBefore,
    skillXpAfter,
    requiredXP,
    cleared,
    newlyUnlockedSkillIds,
    earnedXp: currentState.student.xpSession,
    history: session.history,
    recentProblems: session.recentProblems,
    recommendation
  };

  const nextState = serializeState({
    ...currentState,
    student: {
      ...currentState.student,
      difficulty: session.currentDifficulty,
      xpSession: cleared ? 0 : currentState.student.xpSession
    },
    skillProgress: sessionSkillId
      ? {
          ...currentState.skillProgress,
          [sessionSkillId]: {
            skillId: sessionSkillId,
            mastery: computeXpMastery(sessionSkillId, skillXpAfter),
            mastered: cleared
          }
        }
      : currentState.skillProgress,
    skillMastery: sessionSkillId
      ? {
          ...currentState.skillMastery,
          [sessionSkillId]: computeXpMastery(sessionSkillId, skillXpAfter)
        }
      : currentState.skillMastery,
    unlockedSkills,
    session: undefined
  });

  return {
    state: nextState,
    result
  };
}

export function recommendNextAction(state: LearningState): Recommendation {
  const currentState = serializeState(state);
  const supportedSkills = skills.filter((skill) => {
    try {
      return isSkillUnlocked(currentState, skill.id) && getWeakPatterns(currentState, skill.id).length >= 0;
    } catch {
      return false;
    }
  });
  const weakPatterns = dedupeWeakPatterns(supportedSkills.flatMap((skill) => getWeakPatterns(currentState, skill.id)));

  if (weakPatterns.length >= WEAK_PATTERN_THRESHOLD) {
    return {
      type: "adaptive",
      reason: "weak_patterns",
      weakPatterns: weakPatterns.length
    };
  }

  const nextSkillId =
    getRecommendedSkill({
      ...currentState,
      skillProgress: setLockedSkills(currentState.skillProgress)
    }) ??
    getNextRecommendedSkillId({
      ...currentState,
      skillProgress: setLockedSkills(currentState.skillProgress)
    });

  if (nextSkillId) {
    return {
      type: "skill",
      skillId: nextSkillId,
      reason: "next_skill"
    };
  }

  return {
    type: "done",
    reason: "all_mastered"
  };
}

export function createInitialLearningState(): LearningState {
  return createLearningState();
}
