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

const normalizeAnswer = (answer: string) => String(answer).trim();

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

  if (!question.includes("?") && !question.includes("くらべ") && !question.includes("どちらが小さい")) {
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

export const validateNumberCount: Rule = ({ problem }) => {
  if (resolvePatternFamily(problem.patternKey) !== "number_count") {
    return { valid: false, error: "wrong number pattern family" };
  }
  const n = typeof problem.variables?.n === "number" ? problem.variables.n : Number(problem.answer);
  const answer = Number(problem.answer);
  if (!isFiniteNumber(n) || !Number.isFinite(answer)) {
    return { valid: false, error: "count value missing" };
  }
  if (n < 0 || n > 20) {
    return { valid: false, error: "count range mismatch" };
  }
  return answer === n ? pass : { valid: false, error: "count answer mismatch" };
};

export const validateNumberOrder: Rule = ({ problem }) => {
  if (resolvePatternFamily(problem.patternKey) !== "number_order") {
    return { valid: false, error: "wrong number pattern family" };
  }
  const a = typeof problem.variables?.a === "number" ? problem.variables.a : undefined;
  const b = typeof problem.variables?.b === "number" ? problem.variables.b : undefined;
  const answer = String(problem.answer ?? "").replace(/\s+/gu, "");
  if (!isFiniteNumber(a) || !isFiniteNumber(b) || !answer) {
    return { valid: false, error: "order operands missing" };
  }
  if (a === b) {
    return { valid: false, error: "equal order unsupported" };
  }
  const expected = `[${Math.min(a, b)},${Math.max(a, b)}]`;
  return answer === expected ? pass : { valid: false, error: "order answer mismatch" };
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

  return composeLeft + composeRight === 10 && answer === 10
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
  const whole = typeof variables.whole === "number" ? variables.whole : parseLeadingNumbers(String(problem.question ?? ""))?.left;
  const known =
    typeof variables.a === "number"
      ? variables.a
      : typeof variables.known === "number"
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

  return decomposeWhole === 10 && decomposeKnown + answer === decomposeWhole
    ? pass
    : {
        valid: false,
        error: "decompose mismatch"
      };
};

export const validateNumberLine: Rule = ({ problem }) => {
  if (resolvePatternFamily(problem.patternKey) !== "number_line") {
    return { valid: false, error: "wrong number pattern family" };
  }
  const start = typeof problem.variables?.start === "number" ? problem.variables.start : undefined;
  const move = typeof problem.variables?.move === "number" ? problem.variables.move : undefined;
  const answer = Number(problem.answer);
  if (!isFiniteNumber(start) || !isFiniteNumber(move) || !Number.isFinite(answer)) {
    return { valid: false, error: "number line operands missing" };
  }
  if (start < 0 || start > 10 || move < 0 || move > 10) {
    return { valid: false, error: "number line range mismatch" };
  }
  if (move < 1) {
    return { valid: false, error: "number line move must be positive" };
  }
  return answer === start + move && answer <= 20
    ? pass
    : { valid: false, error: "number line answer mismatch" };
};
