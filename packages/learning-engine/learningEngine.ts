import skillsData from "packages/skill-system/skills.json";

import { updateDifficulty } from "./difficultyController";
import { updatePatternProgress as nextPatternProgress } from "./patternProgressTracker";
import { getNextRecommendedSkillId } from "./progression-engine";
import { updateSkillProgress } from "./skillProgressTracker";
import type { SkillProgress } from "./skillProgressTypes";
import type { Session } from "./sessionTypes";
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
  recommendation: Recommendation;
};

type SkillDefinition = {
  id: string;
  prerequisite?: string[];
};

const WEAK_PATTERN_THRESHOLD = 2;

const skills = skillsData as SkillDefinition[];

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
  const nextIndex = currentProblem ? session.index + 1 : session.index;

  return {
    ...session,
    index: Math.min(nextIndex, session.problems.length),
    correct: session.correct + (correct ? 1 : 0),
    wrong: session.wrong + (correct ? 0 : 1)
  };
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

export function startSession(state: LearningState, options: StartSessionOptions): { state: LearningState; session: Session } {
  const currentState = serializeState(state);

  if (options.mode === "skill" && !options.skillId) {
    throw new Error("skillId is required for skill sessions");
  }

  const skillId =
    options.mode === "adaptive" ? resolveAdaptiveSkillId(currentState, options.skillId) : (options.skillId as string);
  const session = {
    ...buildSession(currentState, skillId, currentState.student.difficulty, options.mode),
    skillProgressBefore: getSkillProgressSnapshot(currentState, skillId)
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

  const skillProgress = setLockedSkills({
    ...currentState.skillProgress,
    [currentProblem.skillId]: updateSkillProgress(
      currentState.skillProgress[currentProblem.skillId],
      currentProblem.skillId,
      patternMasteries
    )
  });

  const nextSession = advanceSession(currentState.session, result.correct);
  const nextState = serializeState({
    ...currentState,
    student,
    patternProgress,
    skillProgress,
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
  const unlockedSkills =
    sessionSkillId && (skillProgressAfter?.mastery ?? 0) >= PROGRESSION_UNLOCK_THRESHOLD
      ? unlockNextSkills(currentState, sessionSkillId)
      : currentState.unlockedSkills;
  const recommendedState = serializeState({
    ...currentState,
    unlockedSkills
  });
  const recommendation = recommendNextAction(recommendedState);
  console.log("skillMastery", skillProgressAfter?.mastery ?? 0);
  console.log("studentXP", currentState.student.xpTotal);
  const result: SessionResult = {
    score: session.correct,
    totalQuestions: session.problems.length,
    difficultyBefore: session.startedDifficulty,
    difficultyAfter: currentState.student.difficulty,
    weakPatternsDetected: countWeakPatterns(currentState),
    skillProgressBefore,
    skillProgressAfter,
    recommendation
  };

  const nextState = serializeState({
    ...currentState,
    student: {
      ...currentState.student,
      xpSession: 0
    },
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

  const nextSkillId = getNextRecommendedSkillId({
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
