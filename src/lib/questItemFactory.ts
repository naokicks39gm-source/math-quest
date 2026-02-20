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

type BuildFailureReason =
  | "EMPTY_SOURCE"
  | "INSUFFICIENT_TYPE_SOURCE"
  | "INSUFFICIENT_UNIQUE_PROMPTS";

export type BuildUniqueQuestSetResult = {
  entries: QuestEntry[];
  reason?: BuildFailureReason;
  stats: {
    buildMs: number;
    candidateCount: number;
    uniquePromptCount: number;
    uniqueEquivalentCount: number;
    finalSetSize: number;
    selectedTypeId: string;
  };
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

const pow10 = (d: number) => 10 ** Math.max(0, d - 1);
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

const stripTrailingEquals = (text: string) => text.replace(/\s*[=＝]\s*$/u, "");

export const normalizePromptForUniqueness = (prompt: string) =>
  stripTrailingEquals(prompt)
    .replace(/\\text\{[^}]*\}/g, "")
    .replace(/（れんしゅう[^）]*）/g, "")
    .replace(/\(practice[^)]*\)/gi, "")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/＋/g, "+")
    .replace(/－/g, "-")
    .replace(/ー/g, "-")
    .replace(/[(){}]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const COMMUTATIVE_OPS = new Set(["+", "×"]);

const parseBinaryExpression = (normalizedPrompt: string) => {
  const m = normalizedPrompt.match(/^(.+?)\s*([+\-×÷])\s*(.+)$/u);
  if (!m) return null;
  const left = m[1].trim();
  const op = m[2];
  const right = m[3].trim();
  if (!left || !right) return null;
  return { left, op, right };
};

export const toEquivalentExpressionKey = (prompt: string) => {
  const normalized = normalizePromptForUniqueness(prompt);
  const parsed = parseBinaryExpression(normalized);
  if (!parsed) return normalized;
  if (!COMMUTATIVE_OPS.has(parsed.op)) return `${parsed.left}${parsed.op}${parsed.right}`;
  const [a, b] = [parsed.left, parsed.right].sort();
  return `${a}${parsed.op}${b}`;
};

export const toAnswerKey = (answer: string) => answer.trim().replace(/\s+/g, " ");

export const entryPromptKey = (entry: QuestEntry) =>
  normalizePromptForUniqueness(entry.item.prompt_tex ?? entry.item.prompt);

export const entryEquivalentKey = (entry: QuestEntry) =>
  toEquivalentExpressionKey(entry.item.prompt_tex ?? entry.item.prompt);

export const entryKey = (entry: QuestEntry) => `${entryPromptKey(entry)}::${toAnswerKey(entry.item.answer)}`;

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
  if (patternId === "ADD_1D_1D_NO") {
    const all: QuestEntry[] = [];
    for (let a = 1; a <= 9; a += 1) {
      for (let b = a; b <= 9; b += 1) {
        if (a + b >= 10) continue;
        all.push(makeIntEntry(type, a, "+", b, a + b));
      }
    }
    for (const entry of shuffle(all)) {
      pushEntry(out, used, entry);
      if (out.length >= needed) break;
    }
    return out;
  }

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

const generateMixed = (type: TypeDef, patternId: string, needed: number, used: Set<string>) => {
  const out: QuestEntry[] = [];
  let attempts = 0;
  while (out.length < needed && attempts < 2000) {
    attempts += 1;
    let item: QuestEntry | null = null;
    if (patternId === "MIXED_TO_20") {
      const mode = randInt(0, 1);
      if (mode === 0) {
        const a = randInt(1, 19);
        const bMax = 20 - a;
        if (bMax < 1) continue;
        const b = randInt(1, bMax);
        item = {
          type,
          item: {
            prompt: `${a} + ${b} =`,
            prompt_tex: `${a} + ${b} =`,
            answer: String(a + b)
          }
        };
      } else {
        const a = randInt(2, 20);
        const b = randInt(1, a - 1);
        item = {
          type,
          item: {
            prompt: `${a} - ${b} =`,
            prompt_tex: `${a} - ${b} =`,
            answer: String(a - b)
          }
        };
      }
    } else if (patternId === "MIXED_DEC_FRAC") {
      const denCandidates = [2, 4, 5, 10];
      const den = denCandidates[randInt(0, denCandidates.length - 1)];
      const num = randInt(1, den - 1);
      const left = randInt(1, 20) / 10;
      const right = `${num}/${den}`;
      const reduced = reduceFraction(Math.round(left * den) + num, den);
      item = {
        type,
        item: {
          prompt: `${left} + ${right} =`,
          prompt_tex: `${left} + ${right} =`,
          answer: stripDecimal(reduced.n / reduced.d)
        }
      };
    } else if (patternId === "MIXED_EXPRESSION") {
      const mode = randInt(0, 2);
      if (mode === 0) {
        const a = randInt(8, 30);
        const b = randInt(2, 9);
        const c = randInt(2, 9);
        item = {
          type,
          item: {
            prompt: `${a} + ${b} × ${c} =`,
            prompt_tex: `${a} + ${b} \\times ${c} =`,
            answer: String(a + b * c)
          }
        };
      } else if (mode === 1) {
        const c = randInt(2, 9);
        const q = randInt(2, 12);
        const b = randInt(2, 9);
        const a = q * c + b;
        item = {
          type,
          item: {
            prompt: `(${a} - ${b}) ÷ ${c} =`,
            prompt_tex: `(${a} - ${b}) \\div ${c} =`,
            answer: String(q)
          }
        };
      } else {
        const b = randInt(2, 9);
        const q = randInt(2, 12);
        const a = b * q;
        const c = randInt(1, 9);
        item = {
          type,
          item: {
            prompt: `${a} ÷ ${b} + ${c} =`,
            prompt_tex: `${a} \\div ${b} + ${c} =`,
            answer: String(q + c)
          }
        };
      }
    }
    if (item) pushEntry(out, used, item);
  }
  return out;
};

const generateNumberFoundation = (type: TypeDef, patternId: string, needed: number, used: Set<string>) => {
  const out: QuestEntry[] = [];
  let attempts = 0;
  while (out.length < needed && attempts < 2000) {
    attempts += 1;
    let item: QuestEntry | null = null;
    if (patternId === "NUM_COMPARE_UP_TO_20") {
      const a = randInt(0, 20);
      let b = randInt(0, 20);
      if (a === b) {
        b = (b + 1) % 21;
      }
      const prompt = `${a}と${b}、どちらが大きい？`;
      item = {
        type,
        item: {
          prompt,
          answer: String(Math.max(a, b))
        }
      };
    } else if (patternId === "NUM_DECOMP_10") {
      const left = randInt(0, 10);
      const right = 10 - left;
      item = {
        type,
        item: {
          prompt: `10 は${left}と？でできます。`,
          answer: String(right)
        }
      };
    } else if (patternId === "NUM_COMP_10") {
      const left = randInt(0, 10);
      const right = 10 - left;
      item = {
        type,
        item: {
          prompt: `${left} + ${right} =`,
          answer: "10"
        }
      };
    }
    if (item) pushEntry(out, used, item);
  }
  return out;
};

const generateSecondaryBySeedVariants = (type: TypeDef, needed: number, used: Set<string>) => {
  const out: QuestEntry[] = [];
  const seed = type.example_items ?? [];
  if (seed.length === 0) return out;

  const parseBinarySeed = (text: string) => {
    const normalized = normalizePromptForUniqueness(text);
    const body = stripTrailingEquals(normalized);
    const m = body.match(/^(-?\d+(?:\.\d+)?)\s*([+\-×÷])\s*(-?\d+(?:\.\d+)?)$/);
    if (!m) return null;
    const a = Number(m[1]);
    const op = m[2];
    const b = Number(m[3]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return { a, op, b };
  };

  const countDecimalPlaces = (value: number) => {
    const raw = String(value);
    const idx = raw.indexOf(".");
    return idx < 0 ? 0 : raw.length - idx - 1;
  };

  const makeBinaryEntry = (a: number, op: string, b: number) => {
    if (op === "+") {
      const answer = stripDecimal(a + b);
      return { prompt: `${a} + ${b} =`, prompt_tex: `${a} + ${b} =`, answer };
    }
    if (op === "-") {
      if (a <= b) return null;
      const answer = stripDecimal(a - b);
      return { prompt: `${a} - ${b} =`, prompt_tex: `${a} - ${b} =`, answer };
    }
    if (op === "×") {
      const answer = stripDecimal(a * b);
      return { prompt: `${a} × ${b} =`, prompt_tex: `${a} \\times ${b} =`, answer };
    }
    if (op === "÷") {
      if (b === 0) return null;
      const quotient = a / b;
      if (!Number.isFinite(quotient)) return null;
      const decimalPlaces = Math.max(countDecimalPlaces(a), countDecimalPlaces(b));
      const answer = decimalPlaces > 0 ? stripDecimal(quotient) : String(Math.trunc(quotient));
      return { prompt: `${a} ÷ ${b} =`, prompt_tex: `${a} \\div ${b} =`, answer };
    }
    return null;
  };

  let round = 1;
  while (out.length < needed && round <= 30) {
    for (let i = 0; i < seed.length && out.length < needed; i += 1) {
      const base = seed[i];
      const parsed = parseBinarySeed(base.prompt_tex ?? base.prompt);
      if (!parsed) continue;
      const delta = round + i + 1;
      let a = parsed.a;
      let b = parsed.b;
      if (parsed.op === "+") {
        a = parsed.a + delta;
        b = parsed.b + ((delta % 3) + 1);
      } else if (parsed.op === "-") {
        a = parsed.a + delta + 2;
        b = Math.max(1, parsed.b + (delta % 2));
        if (a <= b) a = b + delta + 1;
      } else if (parsed.op === "×") {
        a = parsed.a + (delta % 7) + 1;
        b = parsed.b + (delta % 5) + 1;
      } else if (parsed.op === "÷") {
        const divisor = Math.max(1, Math.trunc(Math.abs(parsed.b)) + (delta % 4));
        const quotient = Math.max(1, Math.trunc(Math.abs(Number(base.answer) || parsed.a / parsed.b || 2)) + (delta % 6));
        a = divisor * quotient;
        b = divisor;
      }
      const binary = makeBinaryEntry(a, parsed.op, b);
      if (!binary) continue;
      pushEntry(out, used, {
        type,
        item: {
          prompt: binary.prompt,
          prompt_tex: binary.prompt_tex,
          answer: binary.answer
        }
      });
    }
    round += 1;
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
  if (patternId.startsWith("MIXED_")) {
    return generateMixed(type, patternId, targetCount, used);
  }
  if (patternId.startsWith("NUM_")) {
    return generateNumberFoundation(type, patternId, targetCount, used);
  }
  if (/^(J[1-3]|H[1-3])\./.test(type.type_id)) {
    return generateSecondaryBySeedVariants(type, targetCount, used);
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

const isDev = process.env.NODE_ENV !== "production";

const logBuildStats = (label: string, stats: BuildUniqueQuestSetResult["stats"], reason?: BuildFailureReason) => {
  if (!isDev) return;
  console.debug(`[quest-set] ${label}`, {
    ...stats,
    reason
  });
};

export const scoreCandidateSet = (entries: QuestEntry[]) => {
  const cache = new Map<string, QuestionFeatures>();
  return scoreEntriesWithCache(entries, cache);
};

const uniqueByPromptAndEquivalent = (entries: QuestEntry[]) => {
  const unique: QuestEntry[] = [];
  const promptKeys = new Set<string>();
  const equivalentKeys = new Set<string>();
  for (const entry of entries) {
    const promptKey = entryPromptKey(entry);
    const equivalentKey = entryEquivalentKey(entry);
    if (promptKeys.has(promptKey)) continue;
    if (equivalentKeys.has(equivalentKey)) continue;
    unique.push(entry);
    promptKeys.add(promptKey);
    equivalentKeys.add(equivalentKey);
  }
  return unique;
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
  while (unique.length < minCount && guard < 200) {
    guard += 1;
    for (const type of types) {
      const needed = minCount - unique.length;
      if (needed <= 0) break;
      const generated = generateByPattern(type, used, Math.min(needed, 24));
      for (const item of generated) {
        pushEntry(unique, used, item);
      }
    }
    if (types.length === 0) break;
  }
  return unique;
};

export const buildUniqueQuestSet = ({ source, poolSize, quizSize }: BuildParams): BuildUniqueQuestSetResult => {
  const startedAt = Date.now();
  const selectedTypeId = source[0]?.type.type_id ?? "";
  const emptyStats: BuildUniqueQuestSetResult["stats"] = {
    buildMs: 0,
    candidateCount: 0,
    uniquePromptCount: 0,
    uniqueEquivalentCount: 0,
    finalSetSize: 0,
    selectedTypeId
  };

  if (source.length === 0 || quizSize <= 0 || !selectedTypeId) {
    const stats = { ...emptyStats, buildMs: Date.now() - startedAt };
    logBuildStats("failed", stats, "EMPTY_SOURCE");
    return { entries: [], reason: "EMPTY_SOURCE", stats };
  }

  const typedSource = source.filter((entry) => entry.type.type_id === selectedTypeId);
  if (typedSource.length === 0) {
    const stats = { ...emptyStats, buildMs: Date.now() - startedAt };
    logBuildStats("failed", stats, "INSUFFICIENT_TYPE_SOURCE");
    return { entries: [], reason: "INSUFFICIENT_TYPE_SOURCE", stats };
  }

  const expanded = expandEntriesToAtLeast(typedSource, Math.max(poolSize, quizSize * 4));
  const uniquePool = uniqueByPromptAndEquivalent(expanded);
  const uniquePromptCount = new Set(uniquePool.map((e) => entryPromptKey(e))).size;
  const uniqueEquivalentCount = new Set(uniquePool.map((e) => entryEquivalentKey(e))).size;

  if (uniquePool.length < quizSize) {
    const stats = {
      buildMs: Date.now() - startedAt,
      candidateCount: expanded.length,
      uniquePromptCount,
      uniqueEquivalentCount,
      finalSetSize: uniquePool.length,
      selectedTypeId
    };
    logBuildStats("failed", stats, "INSUFFICIENT_UNIQUE_PROMPTS");
    return { entries: [], reason: "INSUFFICIENT_UNIQUE_PROMPTS", stats };
  }

  const ordered = reorderAvoidAdjacentSameFamily(shuffle(uniquePool)).slice(0, quizSize);
  const final = uniqueByPromptAndEquivalent(ordered).slice(0, quizSize);
  const reason = final.length === quizSize ? undefined : "INSUFFICIENT_UNIQUE_PROMPTS";
  const stats = {
    buildMs: Date.now() - startedAt,
    candidateCount: expanded.length,
    uniquePromptCount,
    uniqueEquivalentCount,
    finalSetSize: final.length,
    selectedTypeId
  };
  logBuildStats(reason ? "failed" : "success", stats, reason);
  return { entries: reason ? [] : final, reason, stats };
};
