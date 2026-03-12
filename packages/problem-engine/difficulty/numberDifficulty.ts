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

const computeCountDifficulty = (problem: GeneratedProblem) => {
  const n = typeof problem.variables?.n === "number" ? problem.variables.n : 0;
  return n <= 10 ? 1 : 2;
};

const computeOrderDifficulty = (problem: GeneratedProblem) => {
  const values = [problem.variables?.a, problem.variables?.b].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );
  const maxOperand = values.length > 0 ? Math.max(...values) : 0;
  return maxOperand <= 10 ? 1 : 2;
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
  const known =
    typeof problem.variables?.a === "number"
      ? problem.variables.a
      : typeof problem.variables?.known === "number"
        ? problem.variables.known
        : 0;
  if (known <= 5) {
    return 1;
  }
  return 2;
};

const computeLineDifficulty = (problem: GeneratedProblem) => {
  const start = typeof problem.variables?.start === "number" ? problem.variables.start : 0;
  const move = typeof problem.variables?.move === "number" ? problem.variables.move : 0;
  const total = start + move;
  return total <= 10 ? 1 : 2;
};

export const computeNumberDifficulty = (problem: GeneratedProblem) => {
  const patternFamily = resolvePatternFamily(problem.patternKey);

  if (patternFamily === "number_count") {
    return clampNumberDifficulty(computeCountDifficulty(problem), 2);
  }
  if (patternFamily === "number_order") {
    return clampNumberDifficulty(computeOrderDifficulty(problem), 2);
  }
  if (patternFamily === "number_compare") {
    return clampNumberDifficulty(computeCompareDifficulty(problem), 3);
  }
  if (patternFamily === "number_compose") {
    return clampNumberDifficulty(computeComposeDifficulty(problem), 2);
  }
  if (patternFamily === "number_decompose") {
    return clampNumberDifficulty(computeDecomposeDifficulty(problem), 2);
  }
  if (patternFamily === "number_line") {
    return clampNumberDifficulty(computeLineDifficulty(problem), 2);
  }
  return undefined;
};
