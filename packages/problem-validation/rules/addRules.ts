import type { Rule } from "../types";

const pass = { valid: true } as const;

const readAddOperands = (operator: string, variables: Record<string, number> | undefined) => {
  if (operator !== "+") {
    return undefined;
  }

  const a = variables?.a;
  const b = variables?.b;
  return typeof a === "number" && typeof b === "number" ? [a, b] as const : undefined;
};

export const noCarry: Rule = ({ problem, pattern }) => {
  const operands = readAddOperands(pattern.template.includes("+") ? "+" : "", problem.variables);
  if (!operands) {
    return {
      valid: false,
      error: "missing addition operands"
    };
  }

  return operands[0] + operands[1] < 10
    ? pass
    : {
        valid: false,
        error: "carry detected"
      };
};

export const mustCarry: Rule = ({ problem, pattern }) => {
  const operands = readAddOperands(pattern.template.includes("+") ? "+" : "", problem.variables);
  if (!operands) {
    return {
      valid: false,
      error: "missing addition operands"
    };
  }

  return operands[0] % 10 + operands[1] % 10 >= 10
    ? pass
    : {
        valid: false,
        error: "no carry"
      };
};

export const addZero: Rule = ({ problem }) => {
  const operands = readAddOperands("+", problem.variables);
  if (!operands) {
    return { valid: false, error: "missing addition operands" };
  }
  return operands[1] === 0 ? pass : { valid: false, error: "second operand must be zero" };
};

export const addOne: Rule = ({ problem }) => {
  const operands = readAddOperands("+", problem.variables);
  if (!operands) {
    return { valid: false, error: "missing addition operands" };
  }
  return operands[1] === 1 ? pass : { valid: false, error: "second operand must be one" };
};

export const doubles: Rule = ({ problem }) => {
  const operands = readAddOperands("+", problem.variables);
  if (!operands) {
    return { valid: false, error: "missing addition operands" };
  }
  return operands[0] === operands[1] ? pass : { valid: false, error: "not doubles" };
};

export const nearDoubles: Rule = ({ problem }) => {
  const operands = readAddOperands("+", problem.variables);
  if (!operands) {
    return { valid: false, error: "missing addition operands" };
  }
  return operands[1] === operands[0] + 1 ? pass : { valid: false, error: "not near doubles" };
};
