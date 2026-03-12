import { computeNumberDifficulty, getPatternMeta, resolvePatternFamily } from "packages/problem-engine";

import type { Rule } from "../types";

const MAX_PATTERN_DIFFICULTY_DELTA = 1;

export const difficultyMatchesPattern: Rule = ({ problem, pattern }) => {
  const actualDifficulty = problem.meta?.difficulty;
  const patternFamily = resolvePatternFamily(pattern.key);
  const expectedDifficulty =
    patternFamily?.startsWith("number_") ? computeNumberDifficulty(problem) : getPatternMeta(pattern.key)?.difficulty;

  if (typeof actualDifficulty !== "number") {
    return {
      valid: false,
      error: "missing difficulty",
      ruleName: "difficultyMatchesPattern"
    };
  }

  if (typeof expectedDifficulty !== "number") {
    return { valid: true };
  }

  return Math.abs(actualDifficulty - expectedDifficulty) <= MAX_PATTERN_DIFFICULTY_DELTA
    ? { valid: true }
    : {
        valid: false,
        error: "difficulty mismatch",
        ruleName: "difficultyMatchesPattern"
      };
};
