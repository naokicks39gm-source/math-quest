export const trimTrailingEquationEquals = (text: string) => text.replace(/\s*[=＝]\s*$/u, "");

export const ensureTrailingEquationEquals = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return /[=＝]\s*$/u.test(trimmed) ? trimmed : `${trimmed} =`;
};

export const formatPrompt = (prompt?: string, keepEquals = false, forceEquals = false) => {
  const cleaned = (prompt ?? "").replace(/を計算しなさい。$/g, "");
  const base = keepEquals ? cleaned.trim() : trimTrailingEquationEquals(cleaned);
  return forceEquals ? ensureTrailingEquationEquals(base) : base;
};
