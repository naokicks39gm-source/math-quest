export type AnswerFormat = {
  kind: "int" | "dec" | "frac" | "pair" | "expr";
};

type GradeOptions = {
  typeId?: string;
};

type Fraction = {
  num: number;
  den: number;
};

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const r = x % y;
    x = y;
    y = r;
  }
  return x === 0 ? 1 : x;
};

const reduceFraction = (num: number, den: number): Fraction => {
  if (den < 0) {
    num *= -1;
    den *= -1;
  }
  const d = gcd(num, den);
  return { num: num / d, den: den / d };
};

const parseFraction = (input: string): Fraction | null => {
  const normalized = input.replace(/\s+/g, "");
  const match = normalized.match(/^([+-]?\d+)\/([+-]?\d+)$/);
  if (!match) return null;
  const num = Number(match[1]);
  const den = Number(match[2]);
  if (!Number.isInteger(num) || !Number.isInteger(den) || den === 0) return null;
  return { num, den };
};

const isReduced = (fraction: Fraction) => gcd(fraction.num, fraction.den) === 1;

const isSimplificationRequired = (typeId?: string) => {
  if (!typeId) return false;
  return /^(E[5-9]|E[1-9]\d|J\d|H\d)\./.test(typeId);
};

export const gradeAnswer = (
  userInput: string,
  correctAnswer: string,
  format: AnswerFormat,
  opts?: GradeOptions
) => {
  const inputRaw = userInput.trim();
  if (format.kind === "int") {
    const value = Number(inputRaw);
    const target = Number(correctAnswer);
    return {
      ok: Number.isFinite(value) && value === target,
      normalized: Number.isFinite(value) ? String(value) : ""
    };
  }
  if (format.kind === "frac") {
    const userFrac = parseFraction(inputRaw);
    const correctFrac = parseFraction(correctAnswer.trim());
    if (!userFrac || !correctFrac) {
      return { ok: false, normalized: "" };
    }
    if (isSimplificationRequired(opts?.typeId) && !isReduced(userFrac)) {
      const normalizedUser = reduceFraction(userFrac.num, userFrac.den);
      return {
        ok: false,
        normalized: `${normalizedUser.num}/${normalizedUser.den}`
      };
    }
    const userReduced = reduceFraction(userFrac.num, userFrac.den);
    const correctReduced = reduceFraction(correctFrac.num, correctFrac.den);
    return {
      ok: userReduced.num === correctReduced.num && userReduced.den === correctReduced.den,
      normalized: `${userReduced.num}/${userReduced.den}`
    };
  }
  return { ok: false, normalized: "" };
};
