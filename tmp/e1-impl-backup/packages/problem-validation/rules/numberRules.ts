import { resolvePatternFamily } from "packages/problem-engine";
import type { Rule } from "../types";

const pass = { valid: true } as const;
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const parseLeadingNumbers = (question: string) => {
  const matches = String(question).match(/-?\d+/g) ?? [];
  if (matches.length < 2) {
    return null;
  }
  const [left, right] = matches.map(Number);
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return null;
  }
  return { left, right };
};

const normalizeAnswer = (answer: string) => String(answer).trim().toUpperCase();

export const validateNumberCompare: Rule = ({ problem }) => {
  if (resolvePatternFamily(problem.patternKey) !== "number_compare") {
    return {
      valid: false,
      error: "wrong number pattern family"
    };
  }

  const question = String(problem.question ?? "");
  const answer = normalizeAnswer(problem.answer ?? "");
  const variables = problem.variables ?? {};
  const left = typeof variables.a === "number" ? variables.a : parseLeadingNumbers(question)?.left;
  const right = typeof variables.b === "number" ? variables.b : parseLeadingNumbers(question)?.right;

  if (!question.includes("?") && !question.includes("くらべ") && !question.includes("どちらが大きい")) {
    return {
      valid: false,
      error: "not compare prompt"
    };
  }

  if (!isFiniteNumber(left) || !isFiniteNumber(right)) {
    return {
      valid: false,
      error: "compare operands missing"
    };
  }

  const compareLeft: number = left;
  const compareRight: number = right;

  if (compareLeft === compareRight) {
    return {
      valid: false,
      error: "equal comparison unsupported"
    };
  }

  if (!/^-?\d+$/u.test(answer)) {
    return {
      valid: false,
      error: "invalid compare answer"
    };
  }

  const expected = String(Math.min(compareLeft, compareRight));
  return answer === expected
    ? pass
    : {
        valid: false,
        error: "compare result mismatch"
      };
};

export const validateNumberCompose: Rule = ({ problem }) => {
  if (resolvePatternFamily(problem.patternKey) !== "number_compose") {
    return {
      valid: false,
      error: "wrong number pattern family"
    };
  }

  const variables = problem.variables ?? {};
  const question = String(problem.question ?? "");
  const parsed = parseLeadingNumbers(question);
  const left = typeof variables.a === "number" ? variables.a : parsed?.left;
  const right = typeof variables.b === "number" ? variables.b : parsed?.right;
  const answer = Number(problem.answer);

  if (!isFiniteNumber(left) || !isFiniteNumber(right)) {
    return {
      valid: false,
      error: "compose operands missing"
    };
  }

  const composeLeft: number = left;
  const composeRight: number = right;

  if (
    composeLeft < 0 ||
    composeLeft > 10 ||
    composeRight < 0 ||
    composeRight > 10 ||
    !Number.isFinite(answer) ||
    answer < 0 ||
    answer > 10
  ) {
    return {
      valid: false,
      error: "compose range mismatch"
    };
  }

  return composeLeft + composeRight === answer
    ? pass
    : {
        valid: false,
        error: "compose sum mismatch"
      };
};

export const validateNumberDecompose: Rule = ({ problem }) => {
  if (resolvePatternFamily(problem.patternKey) !== "number_decompose") {
    return {
      valid: false,
      error: "wrong number pattern family"
    };
  }

  const variables = problem.variables ?? {};
  const whole =
    typeof variables.whole === "number"
      ? variables.whole
      : parseLeadingNumbers(String(problem.question ?? ""))?.left;
  const known =
    typeof variables.known === "number"
      ? variables.known
      : parseLeadingNumbers(String(problem.question ?? ""))?.right;
  const answer = Number(problem.answer);

  if (!isFiniteNumber(whole) || !isFiniteNumber(known) || !Number.isFinite(answer)) {
    return {
      valid: false,
      error: "decompose operands missing"
    };
  }

  const decomposeWhole: number = whole;
  const decomposeKnown: number = known;

  if (decomposeWhole < 0 || decomposeKnown < 0 || answer < 0) {
    return {
      valid: false,
      error: "negative not allowed"
    };
  }

  return decomposeKnown + answer === decomposeWhole
    ? pass
    : {
        valid: false,
        error: "decompose mismatch"
      };
};
