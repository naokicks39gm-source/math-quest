type AnswerFormat = {
  kind: "int" | "dec" | "frac" | "pair" | "expr";
};

type ExampleItem = {
  prompt: string;
  prompt_tex?: string;
  answer: string;
};

type GenerationParams = {
  pattern_id?: string;
  a_digits?: number;
  b_digits?: number;
  carry?: boolean | null;
  borrow?: boolean | null;
  decimal_places?: number;
  quotient_digits?: number;
};

type TypeDef = {
  type_id: string;
  answer_format: AnswerFormat;
  example_items: ExampleItem[];
  generation_params?: GenerationParams;
};

export type QuestEntry = {
  item: ExampleItem;
  type: TypeDef;
};

type BuildParams = {
  source: QuestEntry[];
  poolSize: number;
  quizSize: number;
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

const shuffle = <T,>(list: T[]) => {
  const copied = [...list];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
};

const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

const pow10 = (d: number) => 10 ** Math.max(1, d - 1);
const minByDigits = (d: number) => pow10(d);
const maxByDigits = (d: number) => 10 ** d - 1;

const stripDecimal = (value: number) => {
  const s = value.toFixed(6);
  return s.replace(/\.?0+$/, "");
};

const reduceFraction = (num: number, den: number) => {
  const sign = den < 0 ? -1 : 1;
  const n = num * sign;
  const d = den * sign;
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
};

const asMixed = (num: number, den: number) => {
  const { n, d } = reduceFraction(num, den);
  const whole = Math.floor(Math.abs(n) / d) * Math.sign(n);
  const rem = Math.abs(n) % d;
  return rem === 0 ? `${whole}` : `${whole} ${rem}/${d}`;
};

export const entryKey = (entry: QuestEntry) =>
  `${entry.type.type_id}::${entry.item.prompt_tex ?? entry.item.prompt}::${entry.item.answer}`;

const pushEntry = (out: QuestEntry[], used: Set<string>, entry: QuestEntry) => {
  const key = entryKey(entry);
  if (used.has(key)) return false;
  used.add(key);
  out.push(entry);
  return true;
};

const parseDigitsFromPattern = (patternId: string, params?: GenerationParams) => {
  const match = patternId.match(/_(\d)D_(\d)D/);
  if (match) return { a: Number(match[1]), b: Number(match[2]) };
  if (params?.a_digits && params?.b_digits) return { a: params.a_digits, b: params.b_digits };
  return { a: 2, b: 2 };
};

const makeIntEntry = (type: TypeDef, a: number, op: string, b: number, answer: number): QuestEntry => ({
  type,
  item: {
    prompt: `${a} ${op} ${b} =`,
    prompt_tex: `${a} ${op} ${b} =`,
    answer: String(answer)
  }
});

const generateAddSubMul = (type: TypeDef, patternId: string, needed: number, used: Set<string>) => {
  const out: QuestEntry[] = [];
  const { a: aDigits, b: bDigits } = parseDigitsFromPattern(patternId, type.generation_params);
  const isAdd = patternId.startsWith("ADD_");
  const isSub = patternId.startsWith("SUB_");
  const isMul = patternId.startsWith("MUL_");
  const carry = type.generation_params?.carry;
  const borrow = type.generation_params?.borrow;
  const mulDan = patternId.match(/MUL_1D_1D_DAN_(\d)$/);
  const mulMix = patternId.match(/MUL_1D_1D_MIX_(\d)_(\d)$/);
  let attempts = 0;
  while (out.length < needed && attempts < 2000) {
    attempts += 1;
    let a = randInt(minByDigits(aDigits), maxByDigits(aDigits));
    let b = randInt(minByDigits(bDigits), maxByDigits(bDigits));
    if (isMul && mulDan) {
      a = Number(mulDan[1]);
      b = randInt(1, 9);
    } else if (isMul && mulMix) {
      a = randInt(Number(mulMix[1]), Number(mulMix[2]));
      b = randInt(1, 9);
    } else if (isMul) {
      a = randInt(minByDigits(aDigits), maxByDigits(aDigits));
      b = randInt(minByDigits(bDigits), maxByDigits(bDigits));
    }
    if (isAdd) {
      const hasCarry = (a % 10) + (b % 10) >= 10;
      if (carry === true && !hasCarry) continue;
      if (carry === false && hasCarry) continue;
      pushEntry(out, used, makeIntEntry(type, a, "+", b, a + b));
      continue;
    }
    if (isSub) {
      if (a <= b) continue;
      const hasBorrow = (a % 10) < (b % 10);
      if (borrow === true && !hasBorrow) continue;
      if (borrow === false && hasBorrow) continue;
      pushEntry(out, used, makeIntEntry(type, a, "-", b, a - b));
      continue;
    }
    if (isMul) {
      pushEntry(out, used, makeIntEntry(type, a, "×", b, a * b));
    }
  }
  return out;
};

const generateDivision = (type: TypeDef, patternId: string, needed: number, used: Set<string>) => {
  const out: QuestEntry[] = [];
  let attempts = 0;
  while (out.length < needed && attempts < 2000) {
    attempts += 1;
    if (patternId === "DIV_EQUAL_SHARE_BASIC") {
      const people = randInt(2, 9);
      const each = randInt(2, 9);
      const total = people * each;
      const item: QuestEntry = {
        type,
        item: {
          prompt: `${total}こを ${people}人で 同じ数に分けると 1人何こ？`,
          answer: String(each)
        }
      };
      pushEntry(out, used, item);
      continue;
    }

    const qDigitsMatch = patternId.match(/DIV_Q(\d)D_/);
    const qDigits = qDigitsMatch ? Number(qDigitsMatch[1]) : (type.generation_params?.quotient_digits ?? 1);
    const quotient = randInt(minByDigits(qDigits), maxByDigits(qDigits));
    const divisor = randInt(2, 9);
    const hasRem = patternId.endsWith("_REM");
    const rem = hasRem ? randInt(1, divisor - 1) : 0;
    const dividend = divisor * quotient + rem;
    const item: QuestEntry = {
      type,
      item: {
        prompt: `${dividend} ÷ ${divisor} =`,
        prompt_tex: `${dividend} \\div ${divisor} =`,
        answer: String(quotient)
      }
    };
    pushEntry(out, used, item);
  }
  return out;
};

const generateDecimal = (type: TypeDef, patternId: string, needed: number, used: Set<string>) => {
  const out: QuestEntry[] = [];
  const dpMatch = patternId.match(/_(\d)DP/);
  const dp = dpMatch ? Number(dpMatch[1]) : (type.generation_params?.decimal_places ?? 1);
  let attempts = 0;
  while (out.length < needed && attempts < 2000) {
    attempts += 1;
    const base = 10 ** dp;
    let item: QuestEntry | null = null;
    if (patternId.includes("DEC_ADD")) {
      const a = randInt(1, 40 * base) / base;
      const b = randInt(1, 40 * base) / base;
      item = {
        type,
        item: { prompt: `${a} + ${b} =`, prompt_tex: `${a} + ${b} =`, answer: stripDecimal(a + b) }
      };
    } else if (patternId.includes("DEC_SUB")) {
      const a = randInt(10, 50 * base) / base;
      const b = randInt(1, Math.max(1, Math.floor(a * base) - 1)) / base;
      item = {
        type,
        item: { prompt: `${a} - ${b} =`, prompt_tex: `${a} - ${b} =`, answer: stripDecimal(a - b) }
      };
    } else if (patternId.includes("DEC_MUL_INT")) {
      const a = randInt(1, 30 * base) / base;
      const b = randInt(2, 9);
      item = {
        type,
        item: { prompt: `${a} × ${b} =`, prompt_tex: `${a} \\times ${b} =`, answer: stripDecimal(a * b) }
      };
    } else if (patternId.includes("DEC_DIV_INT")) {
      const b = randInt(2, 9);
      const q = randInt(1, 20 * base) / base;
      const a = q * b;
      item = {
        type,
        item: { prompt: `${stripDecimal(a)} ÷ ${b} =`, prompt_tex: `${stripDecimal(a)} \\div ${b} =`, answer: stripDecimal(q) }
      };
    } else if (patternId.includes("DEC_MUL")) {
      const a = randInt(1, 20 * base) / base;
      const b = randInt(1, 20 * base) / base;
      item = {
        type,
        item: { prompt: `${a} × ${b} =`, prompt_tex: `${a} \\times ${b} =`, answer: stripDecimal(a * b) }
      };
    } else if (patternId.includes("DEC_DIV")) {
      const b = randInt(1, 9 * base) / base;
      const q = randInt(1, 9 * base) / base;
      const a = b * q;
      item = {
        type,
        item: { prompt: `${stripDecimal(a)} ÷ ${b} =`, prompt_tex: `${stripDecimal(a)} \\div ${b} =`, answer: stripDecimal(q) }
      };
    }
    if (item) pushEntry(out, used, item);
  }
  return out;
};

const generateFraction = (type: TypeDef, patternId: string, needed: number, used: Set<string>) => {
  const out: QuestEntry[] = [];
  let attempts = 0;
  while (out.length < needed && attempts < 2000) {
    attempts += 1;
    let item: QuestEntry | null = null;
    if (patternId === "FRAC_ADD_SAME") {
      const den = randInt(2, 9);
      const a = randInt(1, den - 1);
      const b = randInt(1, den - 1);
      const reduced = reduceFraction(a + b, den);
      item = { type, item: { prompt: `${a}/${den} + ${b}/${den} =`, prompt_tex: `${a}/${den} + ${b}/${den} =`, answer: `${reduced.n}/${reduced.d}` } };
    } else if (patternId === "FRAC_ADD_DIFF") {
      const den1 = randInt(2, 8);
      const den2 = randInt(2, 8);
      if (den1 === den2) continue;
      const a = randInt(1, den1 - 1);
      const b = randInt(1, den2 - 1);
      const reduced = reduceFraction(a * den2 + b * den1, den1 * den2);
      item = { type, item: { prompt: `${a}/${den1} + ${b}/${den2} =`, prompt_tex: `${a}/${den1} + ${b}/${den2} =`, answer: `${reduced.n}/${reduced.d}` } };
    } else if (patternId === "FRAC_MUL_INT") {
      const den = randInt(2, 9);
      const num = randInt(1, den - 1);
      const m = randInt(2, 9);
      const reduced = reduceFraction(num * m, den);
      item = { type, item: { prompt: `${num}/${den} × ${m} =`, prompt_tex: `${num}/${den} \\times ${m} =`, answer: `${reduced.n}/${reduced.d}` } };
    } else if (patternId === "FRAC_DIV_INT") {
      const den = randInt(2, 9);
      const num = randInt(1, den - 1);
      const d = randInt(2, 9);
      const reduced = reduceFraction(num, den * d);
      item = { type, item: { prompt: `${num}/${den} ÷ ${d} =`, prompt_tex: `${num}/${den} \\div ${d} =`, answer: `${reduced.n}/${reduced.d}` } };
    } else if (patternId === "FRAC_MUL_FRAC") {
      const aDen = randInt(2, 9);
      const bDen = randInt(2, 9);
      const aNum = randInt(1, aDen - 1);
      const bNum = randInt(1, bDen - 1);
      const reduced = reduceFraction(aNum * bNum, aDen * bDen);
      item = { type, item: { prompt: `${aNum}/${aDen} × ${bNum}/${bDen} =`, prompt_tex: `${aNum}/${aDen} \\times ${bNum}/${bDen} =`, answer: `${reduced.n}/${reduced.d}` } };
    } else if (patternId === "FRAC_DIV_FRAC") {
      const aDen = randInt(2, 9);
      const bDen = randInt(2, 9);
      const aNum = randInt(1, aDen - 1);
      const bNum = randInt(1, bDen - 1);
      const reduced = reduceFraction(aNum * bDen, aDen * bNum);
      item = { type, item: { prompt: `${aNum}/${aDen} ÷ ${bNum}/${bDen} =`, prompt_tex: `${aNum}/${aDen} \\div ${bNum}/${bDen} =`, answer: `${reduced.n}/${reduced.d}` } };
    } else if (patternId === "UNIT_FRAC_BASIC") {
      const den = randInt(2, 9);
      const add = randInt(1, den - 1);
      const reduced = reduceFraction(1 + add, den);
      item = { type, item: { prompt: `1/${den} + ${add}/${den} =`, prompt_tex: `1/${den} + ${add}/${den} =`, answer: `${reduced.n}/${reduced.d}` } };
    } else if (patternId === "FRAC_IMPROPER_MIXED") {
      const den = randInt(2, 9);
      const whole = randInt(1, 4);
      const rem = randInt(1, den - 1);
      const improper = whole * den + rem;
      item = { type, item: { prompt: `${improper}/${den} を 帯分数に`, answer: asMixed(improper, den) } };
    } else if (patternId === "FRAC_COMMON_DENOM_REDUCE") {
      const den = randInt(6, 18);
      const num = randInt(2, den - 1);
      item = {
        type,
        item: {
          prompt: `${num}/${den} を 約分`,
          answer: (() => {
            const reduced = reduceFraction(num, den);
            return `${reduced.n}/${reduced.d}`;
          })()
        }
      };
    }
    if (item) pushEntry(out, used, item);
  }
  return out;
};

const generateByPattern = (type: TypeDef, used: Set<string>, targetCount: number) => {
  const patternId = type.generation_params?.pattern_id ?? "";
  if (!patternId) return [];
  if (patternId.startsWith("ADD_") || patternId.startsWith("SUB_") || patternId.startsWith("MUL_")) {
    return generateAddSubMul(type, patternId, targetCount, used);
  }
  if (patternId.startsWith("DIV_")) {
    return generateDivision(type, patternId, targetCount, used);
  }
  if (patternId.startsWith("DEC_")) {
    return generateDecimal(type, patternId, targetCount, used);
  }
  if (patternId.startsWith("FRAC_") || patternId.startsWith("UNIT_FRAC_")) {
    return generateFraction(type, patternId, targetCount, used);
  }
  return [];
};

type ValueBucket = "small" | "medium" | "large";

type QuestionFeatures = {
  key: string;
  digits: Set<number>;
  numbers: number[];
  valueBucket: ValueBucket;
  patternId: string;
  dan: number | null;
  family: string;
};

const DIGIT_RE = /\d/g;
const NUMBER_RE = /-?\d+(?:\.\d+)?/g;

const toValueBucket = (values: number[]): ValueBucket => {
  const maxAbs = values.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
  if (maxAbs < 20) return "small";
  if (maxAbs < 100) return "medium";
  return "large";
};

const getPatternId = (entry: QuestEntry) => entry.type.generation_params?.pattern_id ?? "";

const getDanFromPatternId = (patternId: string): number | null => {
  const match = patternId.match(/MUL_1D_1D_DAN_(\d)$/);
  return match ? Number(match[1]) : null;
};

const featureFromEntry = (entry: QuestEntry): QuestionFeatures => {
  const key = entryKey(entry);
  const raw = `${entry.item.prompt} ${entry.item.answer}`;
  const digits = new Set<number>();
  for (const ch of raw.match(DIGIT_RE) ?? []) digits.add(Number(ch));
  const numbers = (raw.match(NUMBER_RE) ?? []).map((n) => Number(n)).filter((n) => Number.isFinite(n));
  const patternId = getPatternId(entry);
  const dan = getDanFromPatternId(patternId);
  const valueBucket = toValueBucket(numbers);
  const family = dan !== null ? `${patternId}:DAN_${dan}` : `${patternId}:${valueBucket}`;
  return { key, digits, numbers, valueBucket, patternId, dan, family };
};

export const extractQuestionFeatures = (entry: QuestEntry) => featureFromEntry(entry);

const getFeatures = (entry: QuestEntry, cache: Map<string, QuestionFeatures>) => {
  const key = entryKey(entry);
  const cached = cache.get(key);
  if (cached) return cached;
  const next = featureFromEntry(entry);
  cache.set(key, next);
  return next;
};

const countMap = <T,>(values: T[]) => {
  const map = new Map<T, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return map;
};

const scoreByFeatures = (features: QuestionFeatures[]) => {
  if (features.length === 0) return 0;

  const digitFreq = new Map<number, number>();
  for (const f of features) {
    for (const d of f.digits) digitFreq.set(d, (digitFreq.get(d) ?? 0) + 1);
  }
  const uniqueDigits = digitFreq.size;
  let repeatedDigitPenalty = 0;
  for (const count of digitFreq.values()) {
    if (count > 2) repeatedDigitPenalty += (count - 2) * 3;
  }

  const buckets = new Set(features.map((f) => f.valueBucket)).size;
  const patternFreq = countMap(features.map((f) => f.patternId || "UNKNOWN"));
  let duplicatePatternPenalty = 0;
  for (const count of patternFreq.values()) {
    if (count > 1) duplicatePatternPenalty += (count - 1) * 5;
  }

  const danOnly = features.filter((f) => f.dan !== null).map((f) => f.dan as number);
  const danFreq = countMap(danOnly);
  let duplicateDanPenalty = 0;
  for (const count of danFreq.values()) {
    if (count > 1) duplicateDanPenalty += (count - 1) * 9;
  }

  const primaryValues = features.map((f) => f.numbers[0] ?? 0).sort((a, b) => a - b);
  let proximityPenalty = 0;
  for (let i = 1; i < primaryValues.length; i += 1) {
    const diff = Math.abs(primaryValues[i] - primaryValues[i - 1]);
    if (diff <= 5) proximityPenalty += 4;
    else if (diff <= 10) proximityPenalty += 2;
  }

  return (
    uniqueDigits * 8 +
    buckets * 4 -
    repeatedDigitPenalty -
    duplicatePatternPenalty -
    duplicateDanPenalty -
    proximityPenalty
  );
};

const adjacentPenaltyByFeatures = (features: QuestionFeatures[]) => {
  let penalty = 0;
  for (let i = 1; i < features.length; i += 1) {
    const prev = features[i - 1];
    const curr = features[i];
    if (prev.patternId && prev.patternId === curr.patternId) penalty += 40;
    if (prev.dan !== null && curr.dan !== null && prev.dan === curr.dan) penalty += 50;
    if (prev.family === curr.family) penalty += 35;
  }
  return penalty;
};

const pairContrastScore = (a: QuestionFeatures, b: QuestionFeatures) => {
  let score = 0;
  if (a.patternId !== b.patternId) score += 5;
  if (a.valueBucket !== b.valueBucket) score += 3;
  if (a.dan !== b.dan) score += 4;
  const av = a.numbers[0] ?? 0;
  const bv = b.numbers[0] ?? 0;
  score += Math.min(6, Math.abs(av - bv) / 8);
  return score;
};

export const reorderAvoidAdjacentSameFamily = (entries: QuestEntry[]) => {
  if (entries.length <= 2) return entries;
  const cache = new Map<string, QuestionFeatures>();
  const remaining = [...entries];
  const ordered: QuestEntry[] = [];

  const seed = shuffle(remaining).shift();
  if (!seed) return entries;
  ordered.push(seed);
  remaining.splice(remaining.indexOf(seed), 1);

  while (remaining.length > 0) {
    const prevFeature = getFeatures(ordered[ordered.length - 1], cache);
    let bestIndex = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const candidateFeature = getFeatures(remaining[i], cache);
      let score = pairContrastScore(prevFeature, candidateFeature);
      if (prevFeature.patternId === candidateFeature.patternId) score -= 100;
      if (prevFeature.dan !== null && candidateFeature.dan !== null && prevFeature.dan === candidateFeature.dan) {
        score -= 120;
      }
      if (prevFeature.family === candidateFeature.family) score -= 80;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    if (bestIndex < 0) break;
    ordered.push(remaining[bestIndex]);
    remaining.splice(bestIndex, 1);
  }
  for (const leftover of remaining) ordered.push(leftover);
  return ordered;
};

const scoreEntriesWithCache = (entries: QuestEntry[], cache: Map<string, QuestionFeatures>) => {
  const features = entries.map((e) => getFeatures(e, cache));
  return scoreByFeatures(features) - adjacentPenaltyByFeatures(features);
};

export const scoreCandidateSet = (entries: QuestEntry[]) => {
  const cache = new Map<string, QuestionFeatures>();
  return scoreEntriesWithCache(entries, cache);
};

const pickDiverseQuizEntries = (stock: QuestEntry[], quizSize: number) => {
  if (quizSize <= 0) return [];
  if (stock.length <= quizSize) return reorderAvoidAdjacentSameFamily(stock);

  const attempts = 180;
  const cache = new Map<string, QuestionFeatures>();
  let best: QuestEntry[] = [];
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const sampled = shuffle(stock).slice(0, quizSize);
    const ordered = reorderAvoidAdjacentSameFamily(sampled);
    const score = scoreEntriesWithCache(ordered, cache);
    if (score > bestScore) {
      bestScore = score;
      best = ordered;
    }
  }

  if (best.length === quizSize) return best;
  return reorderAvoidAdjacentSameFamily(shuffle(stock).slice(0, quizSize));
};

export const expandEntriesToAtLeast = (entries: QuestEntry[], minCount: number) => {
  const unique: QuestEntry[] = [];
  const used = new Set<string>();
  for (const entry of entries) {
    pushEntry(unique, used, entry);
  }
  if (unique.length >= minCount) return unique;

  const typeMap = new Map<string, TypeDef>();
  for (const entry of unique) {
    typeMap.set(entry.type.type_id, entry.type);
  }
  const types = [...typeMap.values()];
  let guard = 0;
  while (unique.length < minCount && guard < 30) {
    guard += 1;
    for (const type of types) {
      const needed = minCount - unique.length;
      if (needed <= 0) break;
      const generated = generateByPattern(type, used, Math.min(needed, 12));
      for (const item of generated) {
        pushEntry(unique, used, item);
      }
    }
    if (types.length === 0) break;
    if (guard > 5 && unique.length < minCount) {
      // Last fallback: reuse known examples with minor safe variation.
      for (const type of types) {
        for (const sample of type.example_items) {
          if (unique.length >= minCount) break;
          const entry: QuestEntry = {
            type,
            item: {
              prompt: `${sample.prompt} `,
              prompt_tex: sample.prompt_tex ? `${sample.prompt_tex} ` : undefined,
              answer: sample.answer
            }
          };
          pushEntry(unique, used, entry);
        }
      }
    }
  }
  return unique;
};

export const buildUniqueQuestSet = ({ source, poolSize, quizSize }: BuildParams): QuestEntry[] => {
  if (source.length === 0 || quizSize <= 0) return [];
  const deduped = expandEntriesToAtLeast(source, Math.max(poolSize, quizSize));
  const stock = deduped.length > poolSize ? shuffle(deduped).slice(0, poolSize) : deduped;
  return pickDiverseQuizEntries(stock, quizSize);
};
