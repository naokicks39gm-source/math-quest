import skillsData from "packages/skill-system/skills.json";
import { generateRuntimeProblems } from "packages/problem-engine";

import { updateDifficulty } from "./difficultyController";
import { updatePatternProgress as nextPatternProgress } from "./patternProgressTracker";
import { getNextRecommendedSkillId } from "./progression-engine";
import { updateSkillProgress } from "./skillProgressTracker";
import type { SkillProgress } from "./skillProgressTypes";
import type { Session, SessionProblem } from "./sessionTypes";
import { buildSession } from "./sessionBuilder";
import { createLearningState, serializeState, updateXP, type LearningState } from "./studentStore";
import { PROGRESSION_UNLOCK_THRESHOLD, isSkillUnlocked, unlockNextSkills } from "./skill-unlock";
import { getWeakPatterns, resolveSkillPatterns, type WeakPattern } from "./weaknessAnalyzer";

type StartSessionOptions = {
  mode: "skill" | "adaptive";
  skillId?: string;
};

type RecordAnswerInput = {
  correct: boolean;
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

const getRequiredXP = (skillId: string) => skills.find((skill) => skill.id === skillId)?.requiredXP ?? DEFAULT_REQUIRED_XP;
const computeXpMastery = (skillId: string, skillXP: number) => Math.max(0, Math.min(skillXP / getRequiredXP(skillId), 1));

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

const advanceSession = (session: Session | undefined, correct: boolean): Session | undefined => {
  if (!session) {
    return undefined;
  }

  const currentProblem = session.problems[session.index];
  const nextIndex = correct && currentProblem ? session.index + 1 : session.index;

  return {
    ...session,
    index: Math.min(nextIndex, session.problems.length),
    correct: session.correct + (correct ? 1 : 0),
    wrong: session.wrong + (correct ? 0 : 1),
    attemptCount: correct ? 0 : session.attemptCount + 1
  };
};

const buildReplacementProblem = (state: LearningState, currentProblem: SessionProblem): SessionProblem => {
  const patterns = resolveSkillPatterns(currentProblem.skillId);
  const matchedPattern = patterns.find((pattern) => pattern.key === currentProblem.patternKey);

  if (!matchedPattern) {
    return currentProblem;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidates = generateRuntimeProblems(matchedPattern, 12).filter(
      (problem) => problem.id !== currentProblem.problem.id
    );
    const replacement = candidates[attempt] ?? candidates[0];
    if (replacement) {
      return {
        ...currentProblem,
        problem: replacement,
        difficulty: Math.max(1, Math.min(5, Math.trunc(replacement.meta?.difficulty ?? currentProblem.difficulty)))
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
  const session = {
    ...buildSession(currentState, skillId, currentState.student.difficulty, options.mode),
    skillProgressBefore: getSkillProgressSnapshot(currentState, skillId),
    skillXpBefore: currentState.skillXP[skillId] ?? 0,
    attemptCount: 0
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

  const student = updateXP(
    updateDifficulty(
      {
        ...currentState.student,
        solved: currentState.student.solved + 1,
        correct: currentState.student.correct + (result.correct ? 1 : 0)
      },
      result.correct
    ),
    result.correct ? 1 : 0
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

  const nextSkillXPValue = (currentState.skillXP[currentProblem.skillId] ?? 0) + (result.correct ? 10 : 0);
  const nextSkillMasteryValue = computeXpMastery(currentProblem.skillId, nextSkillXPValue);
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

  const nextSessionBase = advanceSession(currentState.session, result.correct);
  const nextSession =
    !result.correct && nextSessionBase
      ? {
          ...nextSessionBase,
          problems: nextSessionBase.problems.map((problem, index) =>
            index === nextSessionBase.index ? buildReplacementProblem(currentState, currentProblem) : problem
          )
        }
      : nextSessionBase;
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
    difficultyAfter: currentState.student.difficulty,
    weakPatternsDetected: countWeakPatterns(currentState),
    skillProgressBefore,
    skillProgressAfter,
    skillXpBefore,
    skillXpAfter,
    requiredXP,
    cleared,
    newlyUnlockedSkillIds,
    earnedXp: currentState.student.xpSession,
    recommendation
  };

  const nextState = serializeState({
    ...currentState,
    student: {
      ...currentState.student,
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
