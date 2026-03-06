import { generateProblems, getPatternMeta } from "packages/problem-engine";

import type { Session, SessionProblem } from "./sessionTypes";
import type { LearningState } from "./studentStore";
import { getWeakPatterns, resolveSkillPatterns } from "./weaknessAnalyzer";

const SESSION_SIZE = 5;
const SKILL_TARGET = 3;
const WEAK_TARGET = 2;
const PROBLEMS_PER_PATTERN = 20;
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

const clampDifficulty = (difficulty: number) => Math.max(1, Math.min(4, Math.trunc(difficulty)));

const inDifficultyWindow = (difficulty: unknown, target: number) =>
  typeof difficulty === "number" && Math.abs(clampDifficulty(difficulty) - target) <= 1;

export const computeRecencyScore = (lastSeenAt: number | undefined, nowMs: number) => {
  if (typeof lastSeenAt !== "number" || lastSeenAt <= 0) {
    return 1;
  }

  const elapsedMs = Math.max(0, nowMs - lastSeenAt);
  return Math.min(elapsedMs / RECENCY_WINDOW_MS, 1);
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

const sortPatternsByPriority = (
  skillId: string,
  patternKeys: Set<string>,
  state: LearningState,
  nowMs: number,
  studentDifficulty: number
) =>
  shuffle(resolveSkillPatterns(skillId).filter((pattern) => patternKeys.has(pattern.key))).sort(
    (left, right) =>
      computePatternPriority(right.key, state, nowMs, studentDifficulty) -
      computePatternPriority(left.key, state, nowMs, studentDifficulty)
  );

const buildCandidates = (
  state: LearningState,
  skillId: string,
  patternKeys: Set<string>,
  source: "skill" | "weakness",
  studentDifficulty: number,
  nowMs: number
) => {
  const patterns = sortPatternsByPriority(skillId, patternKeys, state, nowMs, studentDifficulty);

  return uniqueByProblemId(
    patterns.flatMap((pattern) =>
      shuffle(generateProblems(pattern, PROBLEMS_PER_PATTERN))
        .filter((problem) => inDifficultyWindow(problem.meta?.difficulty, studentDifficulty))
        .map(
          (problem): SessionProblem => ({
            problem,
            skillId,
            patternKey: pattern.key,
            difficulty: clampDifficulty(problem.meta?.difficulty ?? studentDifficulty),
            source
          })
        )
    )
  );
};

const takeProblems = (candidates: SessionProblem[], count: number, usedPatternKeys: Set<string>) => {
  const selected: SessionProblem[] = [];

  for (const problem of candidates) {
    if (selected.length >= count) {
      break;
    }
    if (usedPatternKeys.has(problem.patternKey)) {
      continue;
    }
    usedPatternKeys.add(problem.patternKey);
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
    selected.push(problem);
  }

  return selected;
};

export function buildSession(
  state: LearningState,
  skillId: string,
  studentDifficulty: number,
  mode: "skill" | "adaptive" = "skill",
  now: () => number = Date.now
): Session {
  const targetDifficulty = clampDifficulty(studentDifficulty);
  const skillPatterns = resolveSkillPatterns(skillId);
  const weakPatterns = getWeakPatterns(state, skillId);
  const skillPatternKeys = new Set(skillPatterns.map((pattern) => pattern.key));
  const weakPatternKeys = new Set(weakPatterns.map((pattern) => pattern.patternKey));
  const usedPatternKeys = new Set<string>();
  const nowMs = now();

  const weakPatternBuckets = partitionPatternKeysByCooldown(state, weakPatternKeys, nowMs);
  const skillPatternBuckets = partitionPatternKeysByCooldown(state, skillPatternKeys, nowMs);

  const weaknessCandidates = buildCandidates(state, skillId, weakPatternBuckets.available, "weakness", targetDifficulty, nowMs);
  const skillCandidates = buildCandidates(state, skillId, skillPatternBuckets.available, "skill", targetDifficulty, nowMs);

  const selectedWeak = takeProblems(weaknessCandidates, WEAK_TARGET, usedPatternKeys);
  const selectedSkill = takeProblems(skillCandidates, SKILL_TARGET, usedPatternKeys);
  const selected = [...selectedSkill, ...selectedWeak];

  if (selected.length < SESSION_SIZE) {
    const fallback = takeProblems(skillCandidates, SESSION_SIZE - selected.length, usedPatternKeys);
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

  return {
    mode,
    skillId,
    startedDifficulty: targetDifficulty,
    problems: shuffle(selected).slice(0, SESSION_SIZE),
    index: 0,
    correct: 0,
    wrong: 0
  };
}
