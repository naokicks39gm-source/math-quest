import type { QuestEntry } from "@/lib/questItemFactory";

type StockTypeLike = QuestEntry["type"];

const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

const pickVar = (type: StockTypeLike) => {
  const params = (type.generation_params ?? {}) as Record<string, unknown>;
  const rawVars = params.vars;
  const vars = Array.isArray(rawVars)
    ? rawVars.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
  return vars[0] ?? "x";
};

const absNum = (value: number) => Math.abs(value);

const formatPowerPlain = (name: string, degree: number) => {
  if (degree <= 0) return "";
  if (degree === 1) return name;
  return `${name}^${degree}`;
};

const formatPowerTex = (name: string, degree: number) => {
  if (degree <= 0) return "";
  if (degree === 1) return name;
  return `${name}^{${degree}}`;
};

const formatFactorPlain = (coefficient: number, name: string, degree: number) => {
  const abs = absNum(coefficient);
  const variable = formatPowerPlain(name, degree);
  if (!variable) return `${abs}`;
  if (abs === 1) return variable;
  return `${abs}${variable}`;
};

const formatFactorTex = (coefficient: number, name: string, degree: number) => {
  const abs = absNum(coefficient);
  const variable = formatPowerTex(name, degree);
  if (!variable) return `${abs}`;
  if (abs === 1) return variable;
  return `${abs}${variable}`;
};

const formatTermPlain = (coefficient: number, name: string, degree: number) => {
  const abs = Math.abs(coefficient);
  const sign = coefficient < 0 ? "-" : "";
  const variable = formatPowerPlain(name, degree);
  if (!variable) return `${sign}${abs}`;
  if (abs === 1) return `${sign}${variable}`;
  return `${sign}${abs}${variable}`;
};

const formatTermTex = (coefficient: number, name: string, degree: number) => {
  const abs = Math.abs(coefficient);
  const sign = coefficient < 0 ? "-" : "";
  const variable = formatPowerTex(name, degree);
  if (!variable) return `${sign}${abs}`;
  if (abs === 1) return `${sign}${variable}`;
  return `${sign}${abs}${variable}`;
};

export const generateFactorGcfEntries = (type: StockTypeLike, targetCount: number, maxAttempts = 4000): QuestEntry[] => {
  const out: QuestEntry[] = [];
  const seen = new Set<string>();
  const variable = pickVar(type);
  let attempts = 0;

  while (out.length < targetCount && attempts < maxAttempts) {
    attempts += 1;
    const g = randInt(2, 12);
    const left = randInt(1, 9);
    const right = randInt(1, 9);
    const p = randInt(1, 4);
    const sign = Math.random() < 0.5 ? -1 : 1;
    const degreeA = p;
    const degreeB = Math.max(0, p - 1);
    const c1 = g * left;
    const c2 = sign * g * right;

    const leftTermPlain = formatTermPlain(c1, variable, degreeA);
    const rightTermPlain = formatTermPlain(c2, variable, degreeB);
    const leftTermTex = formatTermTex(c1, variable, degreeA);
    const rightTermTex = formatTermTex(c2, variable, degreeB);
    const rightSep = c2 < 0 ? "" : "+";

    const prompt = `${leftTermPlain}${rightSep}${rightTermPlain} =`;
    const promptTex = `${leftTermTex}${rightSep}${rightTermTex} =`;
    const outerPower = formatPowerPlain(variable, degreeB);
    const inside = `${left}${variable}${sign < 0 ? "-" : "+"}${right}`;
    const answer = `${g}${outerPower}(${inside})`;
    const key = `${prompt}::${answer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      type,
      item: {
        prompt,
        prompt_tex: promptTex,
        answer
      }
    });
  }
  return out;
};

const joinSignedTerms = (parts: string[]) => {
  if (parts.length < 1) return "";
  return parts
    .map((term, index) => {
      if (index === 0) return term;
      return term.startsWith("-") ? term : `+${term}`;
    })
    .join("");
};

export const generateFactorDiffSqEntries = (type: StockTypeLike, targetCount: number, maxAttempts = 5000): QuestEntry[] => {
  const out: QuestEntry[] = [];
  const seen = new Set<string>();
  const variable = pickVar(type);
  let attempts = 0;
  while (out.length < targetCount && attempts < maxAttempts) {
    attempts += 1;
    const leftCoef = randInt(1, 8);
    const rightCoef = randInt(1, 8);
    const leftPow = randInt(1, 3);
    const rightPow = randInt(0, leftPow);
    const leftSqCoef = leftCoef ** 2;
    const rightSqCoef = rightCoef ** 2;
    const leftSqPow = leftPow * 2;
    const rightSqPow = rightPow * 2;
    const prompt = `${formatTermPlain(leftSqCoef, variable, leftSqPow)}-${formatTermPlain(rightSqCoef, variable, rightSqPow)} =`;
    const promptTex = `${formatTermTex(leftSqCoef, variable, leftSqPow)}-${formatTermTex(rightSqCoef, variable, rightSqPow)} =`;
    const leftFactor = formatFactorPlain(leftCoef, variable, leftPow);
    const rightFactor = formatFactorPlain(rightCoef, variable, rightPow);
    const answer = `(${leftFactor}-${rightFactor})(${leftFactor}+${rightFactor})`;
    const key = `${prompt}::${answer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      type,
      item: {
        prompt,
        prompt_tex: promptTex,
        answer
      }
    });
  }
  return out;
};

export const generateFactorPerfSqEntries = (type: StockTypeLike, targetCount: number, maxAttempts = 5000): QuestEntry[] => {
  const out: QuestEntry[] = [];
  const seen = new Set<string>();
  const variable = pickVar(type);
  let attempts = 0;
  while (out.length < targetCount && attempts < maxAttempts) {
    attempts += 1;
    const leftCoef = randInt(1, 7);
    const rightCoef = randInt(1, 7);
    const leftPow = randInt(1, 3);
    const rightPow = randInt(0, leftPow);
    const sign = Math.random() < 0.5 ? -1 : 1;
    const leftSqCoef = leftCoef ** 2;
    const rightSqCoef = rightCoef ** 2;
    const leftSqPow = leftPow * 2;
    const rightSqPow = rightPow * 2;
    const midCoef = 2 * leftCoef * rightCoef * sign;
    const midPow = leftPow + rightPow;
    const prompt = `${joinSignedTerms([
      formatTermPlain(leftSqCoef, variable, leftSqPow),
      formatTermPlain(midCoef, variable, midPow),
      formatTermPlain(rightSqCoef, variable, rightSqPow)
    ])} =`;
    const promptTex = `${joinSignedTerms([
      formatTermTex(leftSqCoef, variable, leftSqPow),
      formatTermTex(midCoef, variable, midPow),
      formatTermTex(rightSqCoef, variable, rightSqPow)
    ])} =`;
    const leftFactor = formatFactorPlain(leftCoef, variable, leftPow);
    const rightFactor = formatFactorPlain(rightCoef, variable, rightPow);
    const answer = sign < 0 ? `(${leftFactor}-${rightFactor})^2` : `(${leftFactor}+${rightFactor})^2`;
    const key = `${prompt}::${answer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      type,
      item: {
        prompt,
        prompt_tex: promptTex,
        answer
      }
    });
  }
  return out;
};

export const generateFactorTrinomEntries = (type: StockTypeLike, targetCount: number, maxAttempts = 6000): QuestEntry[] => {
  const out: QuestEntry[] = [];
  const seen = new Set<string>();
  const variable = pickVar(type);
  let attempts = 0;
  while (out.length < targetCount && attempts < maxAttempts) {
    attempts += 1;
    const m = randInt(1, 6);
    const n = randInt(1, 6);
    const a = randInt(-9, 9);
    const b = randInt(-9, 9);
    if (a === 0 || b === 0) continue;
    const quadCoef = m * n;
    const quadPow = 2;
    const midCoef = m * b + n * a;
    const constCoef = a * b;
    const prompt = `${joinSignedTerms([
      formatTermPlain(quadCoef, variable, quadPow),
      formatTermPlain(midCoef, variable, 1),
      formatTermPlain(constCoef, variable, 0)
    ])} =`;
    const promptTex = `${joinSignedTerms([
      formatTermTex(quadCoef, variable, quadPow),
      formatTermTex(midCoef, variable, 1),
      formatTermTex(constCoef, variable, 0)
    ])} =`;
    const leftLinear = `${formatFactorPlain(m, variable, 1)}${a < 0 ? "-" : "+"}${absNum(a)}`;
    const rightLinear = `${formatFactorPlain(n, variable, 1)}${b < 0 ? "-" : "+"}${absNum(b)}`;
    const answer = `(${leftLinear})(${rightLinear})`;
    const key = `${prompt}::${answer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      type,
      item: {
        prompt,
        prompt_tex: promptTex,
        answer
      }
    });
  }
  return out;
};

export const FACTOR_GENERATOR_SYMBOLS = {
  gcf: generateFactorGcfEntries,
  diffSq: generateFactorDiffSqEntries,
  perfSq: generateFactorPerfSqEntries,
  trinom: generateFactorTrinomEntries,
  texFactor: formatFactorTex
};
