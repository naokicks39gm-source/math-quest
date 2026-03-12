import type { Rule } from "../types";

const pass = { valid: true } as const;

export const sumIs10: Rule = ({ problem }) => {
  const a = problem.variables?.a;
  const b = problem.variables?.b;

  if (typeof a !== "number" || typeof b !== "number") {
    return {
      valid: false,
      error: "missing arithmetic operands"
    };
  }

  return a + b === 10
    ? pass
    : {
        valid: false,
        error: "sum not 10"
      };
};
