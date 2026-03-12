import { generateProblems, type GeneratedProblem, type PatternDSL } from "./dsl-engine";

const NUMBER_COMPARE_PATTERN_KEYS = new Set(["E1-NUM-COMPARE-01"]);

const normalizeNumberCompareAnswer = (problem: GeneratedProblem): GeneratedProblem => {
  const a = problem.variables?.a;
  const b = problem.variables?.b;
  if (typeof a !== "number" || typeof b !== "number" || a === b) {
    return problem;
  }

  return {
    ...problem,
    answer: a < b ? "LESS" : "GREATER",
    meta: {
      ...problem.meta,
      source: problem.meta?.source ?? "runtime-pattern"
    }
  };
};

const normalizeGeneratedProblem = (problem: GeneratedProblem): GeneratedProblem => {
  if (problem.patternKey && NUMBER_COMPARE_PATTERN_KEYS.has(problem.patternKey)) {
    return normalizeNumberCompareAnswer(problem);
  }
  return {
    ...problem,
    meta: {
      ...problem.meta,
      source: problem.meta?.source ?? "runtime-pattern"
    }
  };
};

export const generateRuntimeProblem = (pattern: PatternDSL): GeneratedProblem =>
  normalizeGeneratedProblem(generateProblems(pattern, 1)[0]);

export const generateRuntimeProblems = (pattern: PatternDSL, count: number): GeneratedProblem[] =>
  generateProblems(pattern, count).map(normalizeGeneratedProblem);
