import type { BatchRule } from "../types";

const DISTRIBUTION_MIN_UNIQUE_COUNT = 8;
const DISTRIBUTION_MIN_UNIQUE_RATIO = 0.005;

const normalizeVariables = (variables: Record<string, number> | undefined) => {
  if (!variables) {
    return "";
  }

  return Object.entries(variables)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
};

export const validateDistribution: BatchRule = ({ problems }) => {
  if (problems.length === 0) {
    return {
      valid: false,
      error: "empty problem batch",
      ruleName: "validateDistribution"
    };
  }

  const uniquePrompts = new Set(
    problems.map((problem) => `${problem.question}::${normalizeVariables(problem.variables)}`)
  );
  const uniqueCount = uniquePrompts.size;
  const uniqueRatio = uniqueCount / problems.length;

  if (uniqueCount < DISTRIBUTION_MIN_UNIQUE_COUNT || uniqueRatio < DISTRIBUTION_MIN_UNIQUE_RATIO) {
    return {
      valid: false,
      error: "low problem variety",
      ruleName: "validateDistribution"
    };
  }

  return { valid: true };
};
