import type { Rule } from "../types";

export const gradePedagogyRule: Rule = ({ problem, skill }) => {
  if (skill.grade !== "E1") {
    return { valid: true };
  }

  const numericAnswer = Number(problem.answer);
  if (Number.isFinite(numericAnswer) && numericAnswer < 0) {
    return {
      valid: false,
      error: "negative not allowed",
      ruleName: "gradePedagogyRule"
    };
  }

  return { valid: true };
};
