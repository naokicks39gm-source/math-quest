import type { Rule } from "../types";

const pass = { valid: true } as const;

const readSubOperands = (operator: string, variables: Record<string, number> | undefined) => {
  if (operator !== "-") {
    return undefined;
  }

  const a = variables?.a;
  const b = variables?.b;
  return typeof a === "number" && typeof b === "number" ? [a, b] as const : undefined;
};

export const noBorrow: Rule = ({ problem, pattern }) => {
  const operands = readSubOperands(pattern.template.includes("-") ? "-" : "", problem.variables);
  if (!operands) {
    return {
      valid: false,
      error: "missing subtraction operands"
    };
  }

  return operands[0] % 10 >= operands[1] % 10
    ? pass
    : {
        valid: false,
        error: "borrow detected"
      };
};

export const mustBorrow: Rule = ({ problem, pattern }) => {
  const operands = readSubOperands(pattern.template.includes("-") ? "-" : "", problem.variables);
  if (!operands) {
    return {
      valid: false,
      error: "missing subtraction operands"
    };
  }

  return operands[0] % 10 < operands[1] % 10
    ? pass
    : {
        valid: false,
        error: "no borrow"
      };
};
