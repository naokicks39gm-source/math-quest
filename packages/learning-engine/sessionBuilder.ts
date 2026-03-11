import { generateProblems, getPatternMeta } from "packages/problem-engine";

import type { Session, SessionProblem } from "./sessionTypes";
import type { LearningState } from "./studentStore";
import { getWeakPatterns, resolveSkillPatterns } from "./weaknessAnalyzer";

const SESSION_SIZE = 5;
const SKILL_TARGET = 3;
const WEAK_TARGET = 2;
const PROBLEMS_PER_PATTERN = 20;
const MAX_PATTERN_PER_SESSION = 2;
export const SESSION_COOLDOWN_MS = 5 * 60 * 1000;
export const PRIORITY_WEIGHTS = {
  mastery: 0.5,
  recency: 0.3,
  difficulty: 0.2
} as const;
const RECENCY_WINDOW_MS = 60 * 60 * 1000;

const shuffle = <T>(items: T[]): T[] => {
  const copied = [...items];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copied[i];
    copied[i] = copied[j];
    copied[j] = temp;
  }
  return copied;
};

const clampDifficulty = (difficulty: number) => Math.max(1, Math.min(5, Math.trunc(difficulty)));

export const computeTargetDifficulty = (skillProgress: number) => {
  if (skillProgress < 0.2) return 1;
  if (skillProgress < 0.4) return 2;
  if (skillProgress < 0.6) return 3;
  if (skillProgress < 0.8) return 4;
  return 5;
};

export const computeRecencyScore = (lastSeenAt: number | undefined, nowMs: number) => {
  if (typeof lastSeenAt !== "number" || lastSeenAt <= 0) {
    return 1;
  }

  const elapsedMs = Math.max(0, nowMs - lastSeenAt);
  return Math.min(elapsedMs / RECENCY_WINDOW_MS, 1);
};

const RECENCY_PENALTY_INTERVAL_MS = 30 * 60 * 1000;
const RECENCY_PENALTY_SCORE = 100;

export const recencyPenalty = (patternKey: string, state: LearningState, nowMs: number) => {
  const lastSeenAt = state.patternProgress[patternKey]?.lastSeenAt;
  if (typeof lastSeenAt !== "number" || lastSeenAt <= 0) {
    return 0;
  }

  const delta = Math.max(0, nowMs - lastSeenAt);
  return delta < RECENCY_PENALTY_INTERVAL_MS ? RECENCY_PENALTY_SCORE : 0;
};

export const computeDifficultyScore = (patternDifficulty: number, studentDifficulty: number) =>
  Math.max(0, Math.min(1, 1 - Math.abs(patternDifficulty - studentDifficulty) / 4));

export const computePatternPriority = (patternKey: string, state: LearningState, nowMs: number, studentDifficulty: number) => {
  const progress = state.patternProgress[patternKey];
  const mastery = progress?.mastery ?? 0;
  const recencyScore = computeRecencyScore(progress?.lastSeenAt, nowMs);
  const patternDifficulty = getPatternMeta(patternKey)?.difficulty ?? studentDifficulty;
  const difficultyScore = computeDifficultyScore(patternDifficulty, studentDifficulty);

  return (
    (1 - mastery) * PRIORITY_WEIGHTS.mastery +
    recencyScore * PRIORITY_WEIGHTS.recency +
    difficultyScore * PRIORITY_WEIGHTS.difficulty
  );
};

const isPatternOnCooldown = (lastSeenAt: number | undefined, nowMs: number) =>
  typeof lastSeenAt === "number" && lastSeenAt > 0 && nowMs - lastSeenAt < SESSION_COOLDOWN_MS;

const partitionPatternKeysByCooldown = (state: LearningState, patternKeys: Set<string>, nowMs: number) => {
  const available = new Set<string>();
  const cooldown = new Set<string>();

  for (const patternKey of patternKeys) {
    if (isPatternOnCooldown(state.patternProgress[patternKey]?.lastSeenAt, nowMs)) {
      cooldown.add(patternKey);
    } else {
      available.add(patternKey);
    }
  }

  return { available, cooldown };
};

const uniqueByProblemId = (problems: SessionProblem[]): SessionProblem[] => {
  const used = new Set<string>();
  return problems.filter((problem) => {
    if (used.has(problem.problem.id)) {
      return false;
    }
    used.add(problem.problem.id);
    return true;
  });
};

const getPatternCount = (patternCounts: Map<string, number>, patternKey: string) =>
  patternCounts.get(patternKey) ?? 0;

const computeMaxPatternPerSession = (resolvedPatternCount: number) =>
  Math.max(MAX_PATTERN_PER_SESSION, Math.ceil(SESSION_SIZE / Math.max(1, resolvedPatternCount)));

const canSelectPattern = (patternCounts: Map<string, number>, patternKey: string, maxPatternPerSession: number) =>
  getPatternCount(patternCounts, patternKey) < maxPatternPerSession;

const recordSelectedProblem = (patternCounts: Map<string, number>, problem: SessionProblem) => {
  patternCounts.set(problem.patternKey, getPatternCount(patternCounts, problem.patternKey) + 1);
};

const reorderProblemsWithPatternDiversity = (problems: SessionProblem[]): SessionProblem[] => {
  const remaining = [...problems];
  const ordered: SessionProblem[] = [];

  while (remaining.length > 0) {
    const previousPatternKey = ordered[ordered.length - 1]?.patternKey;
    const nextIndex = remaining.findIndex((problem) => problem.patternKey !== previousPatternKey);
    const index = nextIndex >= 0 ? nextIndex : 0;
    const [next] = remaining.splice(index, 1);
    ordered.push(next);
  }

  return ordered;
};

const sortPatternsByWeakness = <T extends { key: string }>(patterns: T[], state: LearningState) =>
  [...patterns].sort((left, right) => {
    const leftMastery = state.patternProgress[left.key]?.mastery ?? 0;
    const rightMastery = state.patternProgress[right.key]?.mastery ?? 0;
    return leftMastery - rightMastery;
  });

const sortPatternsByPriority = (
  skillId: string,
  patternKeys: Set<string>,
  state: LearningState,
  nowMs: number,
  studentDifficulty: number
) =>
  sortPatternsByWeakness(
    shuffle(resolveSkillPatterns(skillId).filter((pattern) => patternKeys.has(pattern.key))),
    state
  ).sort((left, right) => {
    const masteryDelta =
      (state.patternProgress[left.key]?.mastery ?? 0) - (state.patternProgress[right.key]?.mastery ?? 0);
    if (Math.abs(masteryDelta) > 0.05) {
      return masteryDelta;
    }

    const leftScore =
      computePatternPriority(left.key, state, nowMs, studentDifficulty) - recencyPenalty(left.key, state, nowMs);
    const rightScore =
      computePatternPriority(right.key, state, nowMs, studentDifficulty) - recencyPenalty(right.key, state, nowMs);

    return rightScore - leftScore;
  });

const buildCandidates = (
  state: LearningState,
  skillId: string,
  patternKeys: Set<string>,
  source: "skill" | "weakness",
  targetDifficulty: number,
  nowMs: number,
  options?: {
    ignoreDifficulty?: boolean;
  }
) => {
  const patterns = sortPatternsByPriority(skillId, patternKeys, state, nowMs, targetDifficulty);

  return uniqueByProblemId(
    patterns.flatMap((pattern) =>
      shuffle(generateProblems(pattern, PROBLEMS_PER_PATTERN))
        .filter((problem) => {
          if (options?.ignoreDifficulty) {
            return true;
          }
          if (typeof problem.meta?.difficulty !== "number") {
            return true;
          }
          return clampDifficulty(problem.meta.difficulty) <= targetDifficulty;
        })
        .map(
          (problem): SessionProblem => ({
            problem,
            skillId,
            patternKey: pattern.key,
            difficulty: clampDifficulty(problem.meta?.difficulty ?? targetDifficulty),
            source
          })
        )
    )
  );
};

const takeProblems = (
  candidates: SessionProblem[],
  count: number,
  usedPatternKeys: Set<string>,
  patternCounts: Map<string, number>,
  maxPatternPerSession: number
) => {
  const selected: SessionProblem[] = [];

  for (const problem of candidates) {
    if (selected.length >= count) {
      break;
    }
    if (usedPatternKeys.has(problem.patternKey)) {
      continue;
    }
    if (!canSelectPattern(patternCounts, problem.patternKey, maxPatternPerSession)) {
      continue;
    }
    usedPatternKeys.add(problem.patternKey);
    recordSelectedProblem(patternCounts, problem);
    selected.push(problem);
  }

  if (selected.length >= count) {
    return selected;
  }

  for (const problem of candidates) {
    if (selected.length >= count) {
      break;
    }
    if (selected.some((entry) => entry.problem.id === problem.problem.id)) {
      continue;
    }
    if (!canSelectPattern(patternCounts, problem.patternKey, maxPatternPerSession)) {
      continue;
    }
    recordSelectedProblem(patternCounts, problem);
    selected.push(problem);
  }

  return selected;
};

const topUpWithRandomSkillPatterns = (
  selected: SessionProblem[],
  skillId: string,
  studentDifficulty: number,
  patternCounts: Map<string, number>,
  maxPatternPerSession: number
) => {
  const resolvedPatterns = shuffle(resolveSkillPatterns(skillId));
  if (resolvedPatterns.length === 0) {
    return;
  }

  let patternIndex = 0;
  let attempts = 0;
  const maxAttempts = Math.max(SESSION_SIZE * 4, resolvedPatterns.length * 2);

  while (selected.length < SESSION_SIZE && attempts < maxAttempts) {
    const pattern = resolvedPatterns[patternIndex % resolvedPatterns.length];
    if (!canSelectPattern(patternCounts, pattern.key, maxPatternPerSession)) {
      patternIndex += 1;
      attempts += 1;
      continue;
    }
    const generated = shuffle(generateProblems(pattern, PROBLEMS_PER_PATTERN)).map(
      (problem): SessionProblem => ({
        problem,
        skillId,
        patternKey: pattern.key,
        difficulty: clampDifficulty(problem.meta?.difficulty ?? studentDifficulty),
        source: "skill"
      })
    );

    const uniqueBatch = generated.filter(
      (candidate) => !selected.some((entry) => entry.problem.id === candidate.problem.id)
    );
    const additions = uniqueBatch.length > 0 ? uniqueBatch : generated;

    for (const problem of additions) {
      if (selected.length >= SESSION_SIZE) {
        break;
      }
      if (!canSelectPattern(patternCounts, problem.patternKey, maxPatternPerSession)) {
        continue;
      }
      recordSelectedProblem(patternCounts, problem);
      selected.push(problem);
    }

    patternIndex += 1;
    attempts += 1;
  }
};

const hasSameProblemSet = (left: SessionProblem[], right: SessionProblem[]) => {
  if (left.length !== right.length) {
    return false;
  }

  const leftIds = [...left.map((problem) => problem.problem.id)].sort();
  const rightIds = [...right.map((problem) => problem.problem.id)].sort();
  return leftIds.every((id, index) => id === rightIds[index]);
};

const buildSessionOnce = (
  state: LearningState,
  skillId: string,
  studentDifficulty: number,
  mode: "skill" | "adaptive" = "skill",
  now: () => number = Date.now
): Session => {
  const skillProgress = state.skillProgress[skillId]?.mastery ?? 0;
  const targetDifficulty = computeTargetDifficulty(skillProgress);
  console.log("targetDifficulty", targetDifficulty);
  const skillPatterns = resolveSkillPatterns(skillId);
  const maxPatternPerSession = computeMaxPatternPerSession(skillPatterns.length);
  console.log(
    "weakPatterns",
    skillPatterns.map((pattern) => ({
      id: pattern.key,
      mastery: state.patternProgress[pattern.key]?.mastery ?? 0
    }))
  );
  console.log(
    "patternRecency",
    skillPatterns.map((pattern) => ({
      id: pattern.key,
      lastSeenAt: state.patternProgress[pattern.key]?.lastSeenAt ?? null
    }))
  );
  const weakPatterns = getWeakPatterns(state, skillId);
  const skillPatternKeys = new Set(skillPatterns.map((pattern) => pattern.key));
  const weakPatternKeys = new Set(weakPatterns.map((pattern) => pattern.patternKey));
  const usedPatternKeys = new Set<string>();
  const patternCounts = new Map<string, number>();
  const nowMs = now();

  const weakPatternBuckets = partitionPatternKeysByCooldown(state, weakPatternKeys, nowMs);
  const skillPatternBuckets = partitionPatternKeysByCooldown(state, skillPatternKeys, nowMs);

  const weaknessCandidates = buildCandidates(state, skillId, weakPatternBuckets.available, "weakness", targetDifficulty, nowMs);
  const skillCandidates = buildCandidates(state, skillId, skillPatternBuckets.available, "skill", targetDifficulty, nowMs);

  const selectedWeak = takeProblems(weaknessCandidates, WEAK_TARGET, usedPatternKeys, patternCounts, maxPatternPerSession);
  const selectedSkill = takeProblems(skillCandidates, SKILL_TARGET, usedPatternKeys, patternCounts, maxPatternPerSession);
  const selected = [...selectedSkill, ...selectedWeak];

  if (selected.length < SESSION_SIZE) {
    const fallback = takeProblems(skillCandidates, SESSION_SIZE - selected.length, usedPatternKeys, patternCounts, maxPatternPerSession);
    selected.push(...fallback);
  }

  if (selected.length < SESSION_SIZE) {
    const cooldownWeaknessCandidates = buildCandidates(
      state,
      skillId,
      weakPatternBuckets.cooldown,
      "weakness",
      targetDifficulty,
      nowMs
    );
    const cooldownSkillCandidates = buildCandidates(state, skillId, skillPatternBuckets.cooldown, "skill", targetDifficulty, nowMs);
    const cooldownCombined = uniqueByProblemId([...cooldownSkillCandidates, ...cooldownWeaknessCandidates]);
    for (const problem of cooldownCombined) {
      if (selected.length >= SESSION_SIZE) {
        break;
      }
      if (selected.some((entry) => entry.problem.id === problem.problem.id)) {
        continue;
      }
      if (!canSelectPattern(patternCounts, problem.patternKey, maxPatternPerSession)) {
        continue;
      }
      recordSelectedProblem(patternCounts, problem);
      selected.push(problem);
    }
  }

  if (selected.length < SESSION_SIZE) {
    const combined = uniqueByProblemId([
      ...skillCandidates,
      ...weaknessCandidates,
      ...buildCandidates(state, skillId, skillPatternBuckets.cooldown, "skill", targetDifficulty, nowMs),
      ...buildCandidates(state, skillId, weakPatternBuckets.cooldown, "weakness", targetDifficulty, nowMs)
    ]);
    for (const problem of combined) {
      if (selected.length >= SESSION_SIZE) {
        break;
      }
      if (selected.some((entry) => entry.problem.id === problem.problem.id)) {
        continue;
      }
      selected.push(problem);
    }
  }

  if (selected.length < SESSION_SIZE) {
    const relaxedCombined = uniqueByProblemId([
      ...buildCandidates(state, skillId, skillPatternKeys, "skill", targetDifficulty, nowMs, { ignoreDifficulty: true }),
      ...buildCandidates(state, skillId, weakPatternKeys, "weakness", targetDifficulty, nowMs, { ignoreDifficulty: true })
    ]);
    for (const problem of relaxedCombined) {
      if (selected.length >= SESSION_SIZE) {
        break;
      }
      if (selected.some((entry) => entry.problem.id === problem.problem.id)) {
        continue;
      }
      if (!canSelectPattern(patternCounts, problem.patternKey, maxPatternPerSession)) {
        continue;
      }
      recordSelectedProblem(patternCounts, problem);
      selected.push(problem);
    }
  }

  if (selected.length < SESSION_SIZE) {
    topUpWithRandomSkillPatterns(selected, skillId, targetDifficulty, patternCounts, maxPatternPerSession);
  }

  const patternUsage = Object.fromEntries(patternCounts);
  console.log("patternUsage", patternUsage);
  const orderedProblems = reorderProblemsWithPatternDiversity(shuffle(selected)).slice(0, SESSION_SIZE);

  return {
    mode,
    skillId,
    startedDifficulty: targetDifficulty,
    problems: orderedProblems,
    index: 0,
    correct: 0,
    wrong: 0
  };
};

const MAX_REBUILD_ATTEMPTS = 6;

export function buildSession(
  state: LearningState,
  skillId: string,
  studentDifficulty: number,
  mode: "skill" | "adaptive" = "skill",
  now: () => number = Date.now
): Session {
  const previousProblems = state.session?.skillId === skillId ? state.session.problems : undefined;
  let session = buildSessionOnce(state, skillId, studentDifficulty, mode, now);

  if (!previousProblems || previousProblems.length === 0) {
    return session;
  }

  for (let attempt = 1; attempt < MAX_REBUILD_ATTEMPTS; attempt += 1) {
    if (!hasSameProblemSet(session.problems, previousProblems)) {
      return session;
    }
    session = buildSessionOnce(state, skillId, studentDifficulty, mode, now);
  }

  return session;
}
