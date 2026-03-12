import type { GeneratedProblem } from "../dsl-engine";
import { resolvePatternFamily } from "../patternFamilyResolver";

const clampNumberDifficulty = (difficulty: number, maxDifficulty: number) =>
  Math.max(1, Math.min(maxDifficulty, Math.trunc(difficulty)));

const computeCompareDifficulty = (problem: GeneratedProblem) => {
  const values = [problem.variables?.a, problem.variables?.b].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );
  const maxOperand = values.length > 0 ? Math.max(...values) : 0;

  if (maxOperand <= 5) {
    return 1;
  }
  if (maxOperand <= 10) {
    return 2;
  }
  return 3;
};

const computeComposeDifficulty = (problem: GeneratedProblem) => {
  const a = typeof problem.variables?.a === "number" ? problem.variables.a : 0;
  const b = typeof problem.variables?.b === "number" ? problem.variables.b : 0;
  const sum = a + b;

  if (sum <= 5) {
    return 1;
  }
  return 2;
};

const computeDecomposeDifficulty = (problem: GeneratedProblem) => {
  const whole = typeof problem.variables?.whole === "number" ? problem.variables.whole : 0;

  if (whole <= 5) {
    return 1;
  }
  return 2;
};

export const computeNumberDifficulty = (problem: GeneratedProblem) => {
  const patternFamily = resolvePatternFamily(problem.patternKey);

  if (patternFamily === "number_compare") {
    return clampNumberDifficulty(computeCompareDifficulty(problem), 3);
  }
  if (patternFamily === "number_compose") {
    return clampNumberDifficulty(computeComposeDifficulty(problem), 2);
  }
  if (patternFamily === "number_decompose") {
    return clampNumberDifficulty(computeDecomposeDifficulty(problem), 2);
  }
  return undefined;
};
