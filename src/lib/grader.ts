export type AnswerFormat = {
  kind: "int" | "dec" | "frac" | "pair" | "expr";
};

export const gradeAnswer = (userInput: string, correctAnswer: string, format: AnswerFormat) => {
  const inputRaw = userInput.trim();
  if (format.kind === "int") {
    const value = Number(inputRaw);
    const target = Number(correctAnswer);
    return {
      ok: Number.isFinite(value) && value === target,
      normalized: Number.isFinite(value) ? String(value) : ""
    };
  }
  return { ok: false, normalized: "" };
};
