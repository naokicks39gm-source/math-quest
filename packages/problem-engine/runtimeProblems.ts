import { generateProblems, type GeneratedProblem, type PatternDSL } from "./dsl-engine";
import { computeNumberDifficulty } from "./difficulty/numberDifficulty";

const NUMBER_COMPARE_PATTERN_KEYS = new Set(["E1-NUM-COMPARE-01"]);
const NUMBER_ORDER_PATTERN_KEYS = new Set(["E1-NUM-ORDER-01"]);

const withRuntimeMeta = (problem: GeneratedProblem, difficulty?: number): GeneratedProblem => ({
  ...problem,
  meta: {
    ...problem.meta,
    source: problem.meta?.source ?? "runtime-pattern",
    ...(typeof difficulty === "number" ? { difficulty } : {})
  }
});

const normalizeNumberCompareAnswer = (problem: GeneratedProblem): GeneratedProblem => {
  const a = problem.variables?.a;
  const b = problem.variables?.b;
  const difficulty = computeNumberDifficulty(problem);
  if (typeof a !== "number" || typeof b !== "number" || a === b) {
    return withRuntimeMeta(problem, difficulty);
  }

  return withRuntimeMeta(
    {
      ...problem,
      question: `${a} と ${b}\nどちらが小さい？`,
      answer: String(Math.min(a, b))
    },
    difficulty
  );
};

const normalizeNumberOrderProblem = (problem: GeneratedProblem): GeneratedProblem => {
  const a = problem.variables?.a;
  const b = problem.variables?.b;
  const difficulty = computeNumberDifficulty(problem);
  if (typeof a !== "number" || typeof b !== "number" || a === b) {
    return withRuntimeMeta(problem, difficulty);
  }

  return withRuntimeMeta(
    {
      ...problem,
      question: `${a} と ${b}\nどちらが小さい？`,
      answer: String(Math.min(a, b))
    },
    difficulty
  );
};

const normalizeGeneratedProblem = (problem: GeneratedProblem): GeneratedProblem => {
  if (problem.patternKey && NUMBER_COMPARE_PATTERN_KEYS.has(problem.patternKey)) {
    return normalizeNumberCompareAnswer(problem);
  }
  if (problem.patternKey && NUMBER_ORDER_PATTERN_KEYS.has(problem.patternKey)) {
    return normalizeNumberOrderProblem(problem);
  }

  const difficulty = computeNumberDifficulty(problem);
  return withRuntimeMeta(problem, difficulty);
};

export const generateRuntimeProblem = (pattern: PatternDSL): GeneratedProblem =>
  normalizeGeneratedProblem(generateProblems(pattern, 1)[0]);

export const generateRuntimeProblems = (pattern: PatternDSL, count: number): GeneratedProblem[] =>
  generateProblems(pattern, count).map(normalizeGeneratedProblem);
