import type { Rule } from "../types";

const pass = { valid: true } as const;

const readBinaryOperands = (variables: Record<string, number> | undefined) => {
  const a = variables?.a;
  const b = variables?.b;
  return typeof a === "number" && typeof b === "number" ? [a, b] as const : undefined;
};

export const singleDigitOperands: Rule = ({ problem }) => {
  const operands = readBinaryOperands(problem.variables);
  if (!operands) {
    return {
      valid: false,
      error: "missing arithmetic operands"
    };
  }

  return operands.every((value) => value >= 0 && value <= 9)
    ? pass
    : {
        valid: false,
        error: "not single digit"
      };
};

export const twoDigitOperands: Rule = ({ problem }) => {
  const operands = readBinaryOperands(problem.variables);
  if (!operands) {
    return {
      valid: false,
      error: "missing arithmetic operands"
    };
  }

  return operands.every((value) => value >= 10 && value <= 99)
    ? pass
    : {
        valid: false,
        error: "not two digit"
      };
};
