export type AnswerFormat = {
  kind: "int" | "dec" | "frac" | "pair" | "expr";
};

type GradeOptions = {
  typeId?: string;
  expectedForm?: "mixed" | "improper" | "auto";
};

type Fraction = {
  num: number;
  den: number;
};

type MixedFraction = {
  whole: number;
  num: number;
  den: number;
};

type IntPair = [number, number];

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

const parseImproperFraction = (input: string): Fraction | null => {
  const normalized = input.replace(/\s+/g, "");
  const match = normalized.match(/^([+-]?\d+)\/([+-]?\d+)$/);
  if (!match) return null;
  const num = Number(match[1]);
  const den = Number(match[2]);
  if (!Number.isInteger(num) || !Number.isInteger(den) || den === 0) return null;
  return { num, den };
};

const parseMixedFraction = (input: string): MixedFraction | null => {
  const normalized = input.trim().replace(/\s+/g, " ");
  const match = normalized.match(/^([+-]?\d+)\s+(\d+)\/(\d+)$/);
  if (!match) return null;
  const whole = Number(match[1]);
  const num = Number(match[2]);
  const den = Number(match[3]);
  if (!Number.isInteger(whole) || !Number.isInteger(num) || !Number.isInteger(den) || den === 0) {
    return null;
  }
  if (num < 0 || den < 0 || num >= den) return null;
  return { whole, num, den };
};

const mixedToImproper = (whole: number, num: number, den: number): Fraction => {
  const sign = whole < 0 ? -1 : 1;
  const absWhole = Math.abs(whole);
  return {
    num: sign * (absWhole * den + num),
    den
  };
};

const improperToMixed = (num: number, den: number): MixedFraction => {
  const reduced = reduceFraction(num, den);
  const sign = reduced.num < 0 ? -1 : 1;
  const absNum = Math.abs(reduced.num);
  const whole = Math.floor(absNum / reduced.den);
  const rem = absNum % reduced.den;
  return {
    whole: sign * whole,
    num: rem,
    den: reduced.den
  };
};

const isReduced = (fraction: Fraction) => gcd(fraction.num, fraction.den) === 1;

const isSimplificationRequired = (typeId?: string) => {
  if (!typeId) return false;
  return /^(E[5-9]|E[1-9]\d|J\d|H\d)\./.test(typeId);
};

const parseIntPair = (input: string): IntPair | null => {
  const normalized = input.trim().replace(/\s+/g, "");
  const parts = normalized.split(/[,，]/);
  if (parts.length !== 2) return null;
  const a = Number(parts[0]);
  const b = Number(parts[1]);
  if (!Number.isInteger(a) || !Number.isInteger(b)) return null;
  return [a, b];
};

const sortIntPairAsc = (pair: IntPair): IntPair => (pair[0] <= pair[1] ? pair : [pair[1], pair[0]]);

const isQuadraticRootsPairType = (typeId?: string) => Boolean(typeId && /^H\d\.AL\.EQ\.QUAD_ROOTS$/.test(typeId));
const normalizeDecimalString = (value: number) => {
  if (!Number.isFinite(value)) return "";
  const safe = Number(value.toFixed(12));
  const raw = safe.toString();
  return raw.includes(".") ? raw.replace(/\.?0+$/, "") : raw;
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
  if (format.kind === "dec") {
    const value = Number(inputRaw);
    const target = Number(correctAnswer);
    const ok = Number.isFinite(value) && Number.isFinite(target) && Math.abs(value - target) <= 1e-9;
    return {
      ok,
      normalized: Number.isFinite(value) ? normalizeDecimalString(value) : ""
    };
  }
  if (format.kind === "frac") {
    const expectedForm = opts?.expectedForm ?? "auto";
    const userImproper = parseImproperFraction(inputRaw);
    const userMixed = parseMixedFraction(inputRaw);
    if (expectedForm === "mixed" && !userMixed) {
      return { ok: false, normalized: "" };
    }
    if (expectedForm === "improper" && !userImproper) {
      return { ok: false, normalized: "" };
    }
    const userAsImproper =
      userImproper ??
      (userMixed ? mixedToImproper(userMixed.whole, userMixed.num, userMixed.den) : null);
    if (!userAsImproper) {
      return { ok: false, normalized: "" };
    }

    if (isSimplificationRequired(opts?.typeId) && !isReduced(userAsImproper)) {
      const normalizedUser = reduceFraction(userAsImproper.num, userAsImproper.den);
      return {
        ok: false,
        normalized: `${normalizedUser.num}/${normalizedUser.den}`
      };
    }

    const correctInput = correctAnswer.trim();
    const correctImproper = parseImproperFraction(correctInput);
    const correctMixed = parseMixedFraction(correctInput);
    const correctAsImproper =
      correctImproper ??
      (correctMixed ? mixedToImproper(correctMixed.whole, correctMixed.num, correctMixed.den) : null);
    if (!correctAsImproper) {
      return { ok: false, normalized: "" };
    }
    const userReduced = reduceFraction(userAsImproper.num, userAsImproper.den);
    const correctReduced = reduceFraction(correctAsImproper.num, correctAsImproper.den);
    const sameValue = userReduced.num === correctReduced.num && userReduced.den === correctReduced.den;

    if (expectedForm === "mixed") {
      const mixed = improperToMixed(userReduced.num, userReduced.den);
      return {
        ok: sameValue,
        normalized: `${mixed.whole} ${mixed.num}/${mixed.den}`
      };
    }

    return {
      ok: sameValue,
      normalized: `${userReduced.num}/${userReduced.den}`
    };
  }
  if (format.kind === "pair") {
    const userPair = parseIntPair(inputRaw);
    const correctPair = parseIntPair(correctAnswer.trim());
    if (!userPair || !correctPair) {
      return { ok: false, normalized: "" };
    }
    const unordered = isQuadraticRootsPairType(opts?.typeId);
    if (unordered) {
      const userSorted = sortIntPairAsc(userPair);
      const correctSorted = sortIntPairAsc(correctPair);
      return {
        ok: userSorted[0] === correctSorted[0] && userSorted[1] === correctSorted[1],
        normalized: `${userSorted[0]},${userSorted[1]}`
      };
    }
    return {
      ok: userPair[0] === correctPair[0] && userPair[1] === correctPair[1],
      normalized: `${userPair[0]},${userPair[1]}`
    };
  }
  return { ok: false, normalized: "" };
};
