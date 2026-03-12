import { evaluateAnswer, evaluateConstraints } from "packages/problem-engine";

import type { Rule } from "../types";

const pass = { valid: true } as const;

export const hasQuestion: Rule = ({ problem }) =>
  typeof problem.question === "string" && problem.question.trim()
    ? pass
    : {
        valid: false,
        error: "missing question"
      };

export const hasAnswer: Rule = ({ problem }) =>
  typeof problem.answer === "string" && problem.answer.trim()
    ? pass
    : {
        valid: false,
        error: "missing answer"
      };

export const hasDifficulty: Rule = ({ problem }) =>
  typeof problem.meta?.difficulty === "number"
    ? pass
    : {
        valid: false,
        error: "missing difficulty"
      };

export const patternKeyMatches: Rule = ({ problem, pattern }) =>
  problem.patternKey === pattern.key
    ? pass
    : {
        valid: false,
        error: "pattern key mismatch"
      };

export const constraintsSatisfied: Rule = ({ problem, pattern }) =>
  evaluateConstraints(pattern, problem.variables ?? {})
    ? pass
    : {
        valid: false,
        error: "constraint violation"
      };

export const mathCorrect: Rule = ({ problem, pattern }) => {
  const expected = evaluateAnswer(pattern.answer, problem.variables ?? {});
  return expected === problem.answer
    ? pass
    : {
        valid: false,
        error: "wrong answer"
      };
};
