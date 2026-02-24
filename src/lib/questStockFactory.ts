import {
  entryEquivalentKey,
  entryPromptKey,
  expandEntriesToAtLeast,
  reorderAvoidAdjacentSameFamily,
  type QuestEntry
} from "@/lib/questItemFactory";
import {
  generateFactorDiffSqEntries,
  generateFactorGcfEntries,
  generateFactorPerfSqEntries,
  generateFactorTrinomEntries
} from "@/lib/questGenerators/factorGcf";
import { generateExpRulesEntries, generateQuadRootsEntries, remixSecondaryExprFromSeed } from "@/lib/questGenerators/secondaryExpr";

type AnswerFormat = {
  kind: "int" | "dec" | "frac" | "pair" | "expr";
};

type ExampleItem = {
  prompt: string;
  prompt_tex?: string;
  answer: string;
};

type TypeDef = {
  type_id: string;
  answer_format: AnswerFormat;
  generation_params?: {
    pattern_id?: string;
    [key: string]: unknown;
  };
  example_items: ExampleItem[];
};

export type TypeStockReason = "INSUFFICIENT_GENERATABLE" | "NO_PATTERN" | "NO_SOURCE";
export type StockReasonDetail = "PATTERN_GENERATOR_MISSING" | "DEDUPE_COLLISION_HIGH" | "PARAM_RANGE_NARROW";

export type StockFailureClass = "NONE" | "GEN_FAIL" | "GEN_OK_PICK_FAIL";

export type TypeStockResult = {
  typeId: string;
  patternId?: string;
  entries: QuestEntry[];
  count: number;
  target: number;
  reason?: TypeStockReason;
  reasonDetail?: StockReasonDetail;
  failureClass: StockFailureClass;
  expandedCount: number;
  uniqueCount: number;
  generatedCount: number;
  buildMs: number;
};

export type PickMeta = {
  requested: number;
  availableBeforeDedupe: number;
  availableAfterDedupe: number;
  picked: number;
  dedupedOutCount: number;
  reason?: "EMPTY" | "SHORTAGE" | "DUP_GUARD_FAILED";
};

const shuffle = <T,>(list: T[]) => {
  const copied = [...list];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
};

const toQuestEntries = (type: TypeDef): QuestEntry[] =>
  type.example_items.map((item) => ({ item, type }));

const normalizeSignedOperand = (raw: string) => {
  const cleaned = raw.trim().replace(/[()]/g, "");
  if (!/^[+-]?\d+$/.test(cleaned)) return null;
  return Number(cleaned);
};

const toSignedParen = (value: number) => (value >= 0 ? `(+${value})` : `(${value})`);

const normalizeIntAddPrompt = (prompt: string) => {
  const body = String(prompt).replace(/\s*[=＝]\s*$/u, "").trim();
  const match = body.match(/^(.+?)\s*\+\s*(.+)$/u);
  if (!match) return null;
  const left = normalizeSignedOperand(match[1]);
  const right = normalizeSignedOperand(match[2]);
  if (left === null || right === null) return null;
  return `${toSignedParen(left)} + ${toSignedParen(right)} =`;
};

const normalizeIntSubPrompt = (prompt: string) => {
  const body = String(prompt).replace(/\s*[=＝]\s*$/u, "").trim();
  const match = body.match(/^(.+?)\s*-\s*(.+)$/u);
  if (!match) return null;
  const left = normalizeSignedOperand(match[1]);
  const right = normalizeSignedOperand(match[2]);
  if (left === null || right === null) return null;
  return `${toSignedParen(left)} - ${toSignedParen(right)} =`;
};

const normalizeJ1IntEntry = (entry: QuestEntry): QuestEntry => {
  const typeId = entry.type.type_id;
  if (typeId !== "J1.AL.INT.INT_ADD" && typeId !== "J1.AL.INT.INT_SUB") return entry;
  const normalizePrompt = typeId === "J1.AL.INT.INT_ADD" ? normalizeIntAddPrompt : normalizeIntSubPrompt;
  const normalizedPrompt = normalizePrompt(entry.item.prompt_tex ?? entry.item.prompt);
  if (!normalizedPrompt) return entry;
  return {
    ...entry,
    item: {
      ...entry.item,
      prompt: normalizedPrompt,
      prompt_tex: normalizedPrompt
    }
  };
};

const parseDigitsFromPattern = (patternId: string) => {
  const match = patternId.match(/_(\d)D_(\d)D/);
  if (!match) return { a: 1, b: 1 };
  return { a: Number(match[1]), b: Number(match[2]) };
};

const isE1Phase7To10Type = (typeId: string) =>
  typeId === "E1.NA.ADD.ADD_2D_1D_NO" ||
  typeId === "E1.NA.ADD.ADD_2D_1D_YES" ||
  typeId === "E1.NA.SUB.SUB_2D_1D_NO" ||
  typeId === "E1.NA.SUB.SUB_2D_1D_YES";

const isE1Phase7To10OperandsLimitedType = (typeId: string) =>
  typeId === "E1.NA.ADD.ADD_2D_1D_NO" ||
  typeId === "E1.NA.ADD.ADD_2D_1D_YES" ||
  typeId === "E1.NA.SUB.SUB_2D_1D_NO";

const isE1Phase7To10AnswerLimitedType = (typeId: string) =>
  typeId === "E1.NA.ADD.ADD_2D_1D_NO" ||
  typeId === "E1.NA.SUB.SUB_2D_1D_NO" ||
  typeId === "E1.NA.SUB.SUB_2D_1D_YES";

const minByDigits = (d: number) => 10 ** Math.max(0, d - 1);
const maxByDigits = (d: number) => 10 ** d - 1;

const derivePatternId = (type: TypeDef) => {
  const fromParams = String(type.generation_params?.pattern_id ?? "").trim();
  if (fromParams) return fromParams;
  const fallback = type.type_id.split(".").pop() ?? "";
  if (/^[A-Z]+_[0-9A-Z_]+$/u.test(fallback)) return fallback;
  return "";
};

const buildDeterministicAdd1D1D = (type: TypeDef, patternId: string) => {
  const out: QuestEntry[] = [];
  const needsNoCarry = patternId.endsWith("_NO");
  const needsCarry = patternId.endsWith("_YES");
  for (let a = 1; a <= 9; a += 1) {
    for (let b = a; b <= 9; b += 1) {
      const carry = a + b >= 10;
      if (needsNoCarry && carry) continue;
      if (needsCarry && !carry) continue;
      out.push({
        type,
        item: {
          prompt: `${a} + ${b} =`,
          prompt_tex: `${a} + ${b} =`,
          answer: String(a + b)
        }
      });
    }
  }
  return out;
};

const buildPatternFallbackEntries = (type: TypeDef, patternId: string, targetCount: number) => {
  if (patternId.startsWith("ADD_1D_1D_")) {
    return buildDeterministicAdd1D1D(type, patternId).slice(0, targetCount);
  }
  if (patternId.startsWith("NUM_")) {
    const out: QuestEntry[] = [];
    for (let i = 0; i < targetCount; i += 1) {
      if (patternId === "NUM_COMPARE_UP_TO_20") {
        const a = i % 21;
        let b = (i * 13 + 5) % 21;
        if (a === b) b = (b + 1) % 21;
        out.push({
          type,
          item: {
            prompt: `${a}と${b}、どちらが大きい？`,
            answer: String(Math.max(a, b))
          }
        });
        continue;
      }
      if (patternId === "NUM_DECOMP_10") {
        const left = (i % 9) + 1;
        const right = 10 - left;
        out.push({
          type,
          item: {
            prompt: `10 は${left}と？でできます。`,
            answer: String(right)
          }
        });
        continue;
      }
      if (patternId === "NUM_COMP_10") {
        const left = i % 11;
        const right = 10 - left;
        out.push({
          type,
          item: {
            prompt: `${left} + ${right} =`,
            prompt_tex: `${left} + ${right} =`,
            answer: "10"
          }
        });
      }
    }
    return out;
  }
  if (patternId === "MIXED_TO_20") {
    const out: QuestEntry[] = [];
    const addPairs: Array<[number, number]> = [];
    const subPairs: Array<[number, number]> = [];

    // Build a broad deterministic catalog for <= 20 mixed add/sub.
    for (let a = 1; a <= 9; a += 1) {
      for (let b = a; b <= 10; b += 1) {
        if (a + b <= 20) addPairs.push([a, b]);
      }
    }
    for (let a = 11; a <= 20; a += 1) {
      for (let b = 1; b <= 10; b += 1) {
        if (a > b) subPairs.push([a, b]);
      }
    }

    const maxRounds = Math.max(addPairs.length, subPairs.length);
    for (let i = 0; i < maxRounds && out.length < targetCount; i += 1) {
      if (addPairs.length > 0 && out.length < targetCount) {
        const [a, b] = addPairs[(i * 11) % addPairs.length];
        out.push({
          type,
          item: {
            prompt: `${a} + ${b} =`,
            prompt_tex: `${a} + ${b} =`,
            answer: String(a + b)
          }
        });
      }
      if (subPairs.length > 0 && out.length < targetCount) {
        const [a, b] = subPairs[(i * 7) % subPairs.length];
        out.push({
          type,
          item: {
            prompt: `${a} - ${b} =`,
            prompt_tex: `${a} - ${b} =`,
            answer: String(a - b)
          }
        });
      }
    }
    return out;
  }
  if (
    patternId.startsWith("INT_") ||
    patternId.startsWith("LIN_") ||
    patternId === "SYS_EQ" ||
    patternId === "POW_INT" ||
    patternId === "SQRT_VAL" ||
    patternId === "EXPAND" ||
    patternId.startsWith("FACTOR_") ||
    patternId === "QUAD_VERTEX" ||
    patternId === "MEAN" ||
    patternId === "COMB" ||
    patternId === "DICE_PROB" ||
    patternId === "POLY_ANGLE_SUM" ||
    patternId === "CIRCLE"
  ) {
    const out: QuestEntry[] = [];
    const asSigned = (n: number) => (n < 0 ? `(${n})` : String(n));
    const asSignedWithPlus = (n: number) => (n >= 0 ? `(+${n})` : `(${n})`);
    const reduced = (a: number, b: number) => {
      const gcd = (x: number, y: number): number => {
        let m = Math.abs(x);
        let n = Math.abs(y);
        while (n !== 0) {
          const r = m % n;
          m = n;
          n = r;
        }
        return m || 1;
      };
      const g = gcd(a, b);
      return { n: a / g, d: b / g };
    };
    for (let i = 0; i < targetCount; i += 1) {
      if (patternId === "INT_ADD") {
        const signVariants: Array<[1 | -1, 1 | -1]> = [
          [1, 1],
          [-1, 1],
          [1, -1],
          [-1, -1]
        ];
        const [aSign, bSign] = signVariants[i % signVariants.length];
        const signedA = (((i * 2) % 10) + 1) * aSign;
        const signedB = (((i * 3) % 10) + 1) * bSign;
        out.push({ type, item: { prompt: `${asSignedWithPlus(signedA)} + ${asSignedWithPlus(signedB)} =`, answer: String(signedA + signedB) } });
        continue;
      }
      if (patternId === "INT_SUB") {
        const a = (i % 21) - 10;
        const b = ((i * 3) % 21) - 10;
        out.push({ type, item: { prompt: `${asSignedWithPlus(a)} - ${asSignedWithPlus(b)} =`, answer: String(a - b) } });
        continue;
      }
      if (patternId === "INT_MUL") {
        const a = (i % 13) - 6;
        const b = ((i * 2) % 13) - 6;
        out.push({ type, item: { prompt: `${asSigned(a)} × ${asSigned(b)} =`, prompt_tex: `${asSigned(a)} \\times ${asSigned(b)} =`, answer: String(a * b) } });
        continue;
      }
      if (patternId === "INT_DIV") {
        const b = (i % 11) - 5 || 2;
        const q = ((i * 2) % 15) - 7;
        const a = b * q;
        out.push({ type, item: { prompt: `${asSigned(a)} ÷ ${asSigned(b)} =`, prompt_tex: `${asSigned(a)} \\div ${asSigned(b)} =`, answer: String(q) } });
        continue;
      }
      if (patternId === "LIN_EQ") {
        const x = (i % 17) - 8;
        const a = (i % 7) + 1;
        const b = (i % 19) - 9;
        const c = a * x + b;
        out.push({ type, item: { prompt: `${a}x ${b >= 0 ? "+" : "-"} ${Math.abs(b)} = ${c}`, answer: String(x) } });
        continue;
      }
      if (patternId === "LIN_FUNC_PARAMS") {
        const a = (i % 9) - 4 || 2;
        const b = (i % 15) - 7;
        const x1 = (i % 9) - 4;
        const x2 = ((i + 3) % 9) - 4;
        const y1 = a * x1 + b;
        const y2 = a * x2 + b;
        out.push({ type, item: { prompt: `点 (${x1},${y1}), (${x2},${y2}) を通る一次関数 y=ax+b の a,b`, answer: `${a},${b}` } });
        continue;
      }
      if (patternId === "LIN_INEQ") {
        const a = (i % 7) + 1;
        const x = (i % 15) - 7;
        const b = (i % 11) - 5;
        const c = a * x + b + 1;
        out.push({ type, item: { prompt: `${a}x ${b >= 0 ? "+" : "-"} ${Math.abs(b)} < ${c}`, answer: `x < ${(c - b) / a}` } });
        continue;
      }
      if (patternId === "SYS_EQ") {
        const x = (i % 13) - 6;
        const y = ((i * 2) % 13) - 6;
        out.push({ type, item: { prompt: `x+y=${x + y}, x-y=${x - y}`, answer: `${x},${y}` } });
        continue;
      }
      if (patternId === "POW_INT") {
        const a = (i % 9) - 4;
        const n = (i % 3) + 2;
        out.push({ type, item: { prompt: `${asSigned(a)}^${n} =`, answer: String(a ** n) } });
        continue;
      }
      if (patternId === "SQRT_VAL") {
        const base = (i % 15) + 1;
        out.push({ type, item: { prompt: `√${base * base} =`, answer: String(base) } });
        continue;
      }
      if (patternId === "EXPAND") {
        const p = (i % 8) + 1;
        const q = ((i + 2) % 8) + 1;
        out.push({ type, item: { prompt: `(x+${p})(x+${q})`, answer: `x^2+${p + q}x+${p * q}` } });
        continue;
      }
      if (patternId === "FACTOR_GCF") {
        const g = (i % 8) + 2;
        const a = (i % 7) + 2;
        const b = (i % 6) + 1;
        out.push({ type, item: { prompt: `${g * a}x + ${g * b}`, answer: `${g}(${a}x+${b})` } });
        continue;
      }
      if (patternId === "FACTOR_DIFF_SQ") {
        const k = (i % 10) + 2;
        out.push({ type, item: { prompt: `x^2 - ${k * k}`, answer: `(x-${k})(x+${k})` } });
        continue;
      }
      if (patternId === "FACTOR_PERF_SQ") {
        const k = (i % 10) + 2;
        out.push({ type, item: { prompt: `x^2 + ${2 * k}x + ${k * k}`, answer: `(x+${k})^2` } });
        continue;
      }
      if (patternId === "FACTOR_TRINOM") {
        const p = (i % 8) + 1;
        const q = ((i + 3) % 8) + 1;
        out.push({ type, item: { prompt: `x^2 + ${p + q}x + ${p * q}`, answer: `(x+${p})(x+${q})` } });
        continue;
      }
      if (patternId === "QUAD_VERTEX") {
        const h = (i % 13) - 6;
        const k = ((i * 2) % 13) - 6;
        out.push({ type, item: { prompt: `y=(x${h >= 0 ? "-" : "+"}${Math.abs(h)})^2${k >= 0 ? "+" : ""}${k} の頂点`, answer: `${h},${k}` } });
        continue;
      }
      if (patternId === "MEAN") {
        const a = (i % 15) + 1;
        const b = ((i + 3) % 15) + 1;
        const c = ((i + 6) % 15) + 1;
        out.push({ type, item: { prompt: `${a}, ${b}, ${c} の平均`, answer: ((a + b + c) / 3).toFixed(6).replace(/\.?0+$/, "") } });
        continue;
      }
      if (patternId === "COMB") {
        const n = (i % 7) + 4;
        const r = Math.min(3, (i % 3) + 1);
        const comb = (x: number, y: number) => {
          let num = 1;
          let den = 1;
          for (let k = 1; k <= y; k += 1) {
            num *= (x - k + 1);
            den *= k;
          }
          return Math.round(num / den);
        };
        out.push({ type, item: { prompt: `${n}C${r} =`, answer: String(comb(n, r)) } });
        continue;
      }
      if (patternId === "DICE_PROB") {
        const threshold = (i % 5) + 2;
        const fav = 7 - threshold;
        const r = reduced(fav, 6);
        out.push({ type, item: { prompt: `サイコロ1個で ${threshold} 以上が出る確率`, answer: `${r.n}/${r.d}` } });
        continue;
      }
      if (patternId === "POLY_ANGLE_SUM") {
        const n = (i % 10) + 3;
        out.push({ type, item: { prompt: `${n}角形の内角の和`, answer: String((n - 2) * 180) } });
        continue;
      }
      if (patternId === "CIRCLE") {
        const radius = (i % 12) + 1;
        if (i % 2 === 0) {
          out.push({ type, item: { prompt: `半径${radius}の円の円周(π=3.14)`, answer: (2 * 3.14 * radius).toFixed(6).replace(/\.?0+$/, "") } });
        } else {
          out.push({ type, item: { prompt: `半径${radius}の円の面積(π=3.14)`, answer: (3.14 * radius * radius).toFixed(6).replace(/\.?0+$/, "") } });
        }
        continue;
      }
    }
    return out.slice(0, targetCount);
  }
  if (!(patternId.startsWith("ADD_") || patternId.startsWith("SUB_") || patternId.startsWith("MUL_"))) {
    if (patternId.startsWith("DEC_")) {
      const out: QuestEntry[] = [];
      const dpMatch = patternId.match(/_(\d)DP/);
      const dp = dpMatch ? Number(dpMatch[1]) : 1;
      const base = 10 ** dp;
      const asDec = (value: number) => value.toFixed(dp).replace(/\.?0+$/, "");
      const push = (prompt: string, prompt_tex: string, answer: string) =>
        out.push({ type, item: { prompt, prompt_tex, answer } });

      for (let i = 0; i < targetCount; i += 1) {
        if (patternId.includes("DEC_MUL_INT")) {
          const left = asDec((i + 2) / base + (i % 5));
          const right = String((i % 8) + 2);
          const answer = asDec(Number(left) * Number(right));
          push(`${left} × ${right} =`, `${left} \\times ${right} =`, answer);
          continue;
        }
        if (patternId.includes("DEC_DIV_INT")) {
          const divisor = (i % 8) + 2;
          const quotient = asDec((i + 3) / base + (i % 4));
          const dividend = asDec(Number(quotient) * divisor);
          push(`${dividend} ÷ ${divisor} =`, `${dividend} \\div ${divisor} =`, quotient);
          continue;
        }
        if (patternId.includes("DEC_ADD")) {
          const a = asDec((i + 2) / base + (i % 7));
          const b = asDec((i + 3) / base + ((i + 2) % 6));
          push(`${a} + ${b} =`, `${a} + ${b} =`, asDec(Number(a) + Number(b)));
          continue;
        }
        if (patternId.includes("DEC_SUB")) {
          const a = asDec((i + 12) / base + (i % 9));
          const b = asDec((i + 2) / base + ((i + 1) % 5));
          if (Number(a) <= Number(b)) continue;
          push(`${a} - ${b} =`, `${a} - ${b} =`, asDec(Number(a) - Number(b)));
          continue;
        }
        if (patternId.includes("DEC_MUL")) {
          const a = asDec((i + 2) / base + (i % 5));
          const b = asDec((i + 4) / base + ((i + 2) % 5));
          push(`${a} × ${b} =`, `${a} \\times ${b} =`, asDec(Number(a) * Number(b)));
          continue;
        }
        if (patternId.includes("DEC_DIV")) {
          const b = asDec((i + 2) / base + ((i + 1) % 4));
          if (Number(b) === 0) continue;
          const q = asDec((i + 5) / base + ((i + 3) % 5));
          const a = asDec(Number(b) * Number(q));
          push(`${a} ÷ ${b} =`, `${a} \\div ${b} =`, q);
        }
      }
      return out;
    }
    return [] as QuestEntry[];
  }

  const out: QuestEntry[] = [];
  const { a: aDigits, b: bDigits } = parseDigitsFromPattern(patternId);
  const isAdd = patternId.startsWith("ADD_");
  const isSub = patternId.startsWith("SUB_");
  const isMul = patternId.startsWith("MUL_");
  const needsNo = patternId.endsWith("_NO");
  const needsYes = patternId.endsWith("_YES");
  const limitOperandsTo20 =
    isE1Phase7To10OperandsLimitedType(type.type_id) && (patternId.startsWith("ADD_2D_1D_") || patternId.startsWith("SUB_2D_1D_"));
  const limitAnswerTo20 =
    isE1Phase7To10AnswerLimitedType(type.type_id) && (patternId.startsWith("ADD_2D_1D_") || patternId.startsWith("SUB_2D_1D_"));

  let attempts = 0;
  const maxAttempts = 20000;
  while (out.length < targetCount && attempts < maxAttempts) {
    attempts += 1;
    const a = minByDigits(aDigits) + Math.floor(Math.random() * (maxByDigits(aDigits) - minByDigits(aDigits) + 1));
    const b = minByDigits(bDigits) + Math.floor(Math.random() * (maxByDigits(bDigits) - minByDigits(bDigits) + 1));
    if (limitOperandsTo20 && (a > 20 || b > 20)) continue;
    if (isAdd) {
      const carry = (a % 10) + (b % 10) >= 10;
      if (needsNo && carry) continue;
      if (needsYes && !carry) continue;
      const sum = a + b;
      if (limitAnswerTo20 && sum > 20) continue;
      out.push({
        type,
        item: { prompt: `${a} + ${b} =`, prompt_tex: `${a} + ${b} =`, answer: String(sum) }
      });
      continue;
    }
    if (isSub) {
      if (a <= b) continue;
      const borrow = (a % 10) < (b % 10);
      if (needsNo && borrow) continue;
      if (needsYes && !borrow) continue;
      const diff = a - b;
      if (limitAnswerTo20 && (diff < 0 || diff > 20)) continue;
      out.push({
        type,
        item: { prompt: `${a} - ${b} =`, prompt_tex: `${a} - ${b} =`, answer: String(diff) }
      });
      continue;
    }
    if (isMul) {
      out.push({
        type,
        item: { prompt: `${a} × ${b} =`, prompt_tex: `${a} × ${b} =`, answer: String(a * b) }
      });
    }
  }
  return out;
};

const filterE1Add2D1DYesToTwoDigits = (entries: QuestEntry[], typeId: string, patternId?: string) => {
  if (!(typeId.startsWith("E1.") && patternId === "ADD_2D_1D_YES")) return entries;
  return entries.filter((entry) => {
    const answer = Number(entry.item.answer);
    return Number.isFinite(answer) && answer < 100;
  });
};

const filterE1Phase7To10To20Range = (entries: QuestEntry[], typeId: string) => {
  if (!isE1Phase7To10Type(typeId)) return entries;
  const limitOperandsTo20 = isE1Phase7To10OperandsLimitedType(typeId);
  const limitAnswerTo20 = isE1Phase7To10AnswerLimitedType(typeId);
  return entries.filter((entry) => {
    const prompt = entry.item.prompt_tex ?? entry.item.prompt;
    const nums = String(prompt).match(/\d+(?:\.\d+)?/g) ?? [];
    if (nums.length < 2) return false;
    const a = Number(nums[0]);
    const b = Number(nums[1]);
    const answer = Number(entry.item.answer);
    if (!(Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(answer))) return false;
    if (limitOperandsTo20 && (a > 20 || b > 20)) return false;
    if (limitAnswerTo20 && (answer < 0 || answer > 20)) return false;
    return true;
  });
};

const getGradeIdFromTypeId = (typeId: string) => typeId.split(".")[0] ?? "";

const isFrozenElementaryGrade = (gradeId: string) => /^(E1|E2|E3|E4)$/.test(gradeId);

const normalizeStockText = (text: string) =>
  String(text)
    .replace(/\s*[=＝]\s*$/u, "")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/＋/g, "+")
    .replace(/－/g, "-")
    .replace(/ー/g, "-")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, "")
    .trim();

export const canonicalStockKey = (entry: QuestEntry) => {
  const prompt = normalizeStockText(entry.item.prompt_tex ?? entry.item.prompt);
  const answer = normalizeStockText(entry.item.answer);
  const equivalent = normalizeStockText(entryEquivalentKey(entry));
  return `${equivalent}::${prompt}::${answer}`;
};

const uniqueByPromptAndEquivalent = (entries: QuestEntry[]) => {
  const unique: QuestEntry[] = [];
  const promptKeys = new Set<string>();
  const equivalentKeys = new Set<string>();
  const stockKeys = new Set<string>();
  for (const entry of entries) {
    const promptKey = entryPromptKey(entry);
    const equivalentKey = entryEquivalentKey(entry);
    const stockKey = canonicalStockKey(entry);
    if (promptKeys.has(promptKey)) continue;
    if (equivalentKeys.has(equivalentKey)) continue;
    if (stockKeys.has(stockKey)) continue;
    promptKeys.add(promptKey);
    equivalentKeys.add(equivalentKey);
    stockKeys.add(stockKey);
    unique.push(entry);
  }
  return unique;
};

type StockGenerationStrategy = (type: TypeDef, patternId: string, targetCount: number) => QuestEntry[];

const STOCK_STRATEGIES: Record<string, StockGenerationStrategy> = {
  NUM_COMPARE_UP_TO_20: (type, patternId, targetCount) => buildPatternFallbackEntries(type, patternId, targetCount),
  NUM_DECOMP_10: (type, patternId, targetCount) => buildPatternFallbackEntries(type, patternId, targetCount),
  NUM_COMP_10: (type, patternId, targetCount) => buildPatternFallbackEntries(type, patternId, targetCount),
  MIXED_TO_20: (type, patternId, targetCount) => buildPatternFallbackEntries(type, patternId, targetCount),
  FACTOR_GCF: (type, _patternId, targetCount) => generateFactorGcfEntries(type, targetCount),
  FACTOR_DIFF_SQ: (type, _patternId, targetCount) => generateFactorDiffSqEntries(type, targetCount),
  FACTOR_PERF_SQ: (type, _patternId, targetCount) => generateFactorPerfSqEntries(type, targetCount),
  FACTOR_TRINOM: (type, _patternId, targetCount) => generateFactorTrinomEntries(type, targetCount),
  EXP_RULES: (type, _patternId, targetCount) => generateExpRulesEntries(type, targetCount),
  QUAD_ROOTS: (type, _patternId, targetCount) => generateQuadRootsEntries(type, targetCount)
};

export const buildTypeStock = (type: TypeDef, targetCount = 50): TypeStockResult => {
  const startedAt = Date.now();
  const seed = toQuestEntries(type);
  if (seed.length === 0) {
    return {
      typeId: type.type_id,
      patternId: derivePatternId(type) || undefined,
      entries: [],
      count: 0,
      target: targetCount,
      reason: "NO_SOURCE",
      reasonDetail: "PARAM_RANGE_NARROW",
      failureClass: "GEN_FAIL",
      expandedCount: 0,
      uniqueCount: 0,
      generatedCount: 0,
      buildMs: Date.now() - startedAt
    };
  }

  const patternId = derivePatternId(type);
  const hasPattern = Boolean(patternId);
  const normalizedType: TypeDef = hasPattern
    ? {
        ...type,
        generation_params: {
          ...(type.generation_params ?? {}),
          pattern_id: patternId
        }
      }
    : type;
  const normalizedSeed = normalizedType.example_items
    .map((item) => ({ item, type: normalizedType }))
    .map(normalizeJ1IntEntry);
  const expanded = expandEntriesToAtLeast(normalizedSeed, targetCount).map(normalizeJ1IntEntry);
  let unique = uniqueByPromptAndEquivalent(expanded);
  let reasonDetail: StockReasonDetail | undefined;
  const strategy = hasPattern ? STOCK_STRATEGIES[patternId] : undefined;
  if (hasPattern && strategy) {
    const generatedEntries = strategy(normalizedType, patternId, targetCount);
    unique = uniqueByPromptAndEquivalent([...generatedEntries, ...unique].map(normalizeJ1IntEntry));
  }
  if (hasPattern && !strategy && normalizedType.answer_format.kind === "expr") {
    const remixedExprEntries = remixSecondaryExprFromSeed(normalizedType, targetCount);
    unique = uniqueByPromptAndEquivalent([...remixedExprEntries, ...unique].map(normalizeJ1IntEntry));
  }
  if (hasPattern && patternId.startsWith("ADD_1D_1D_")) {
    // 1けた+1けたは列挙可能なので、常に決定的候補を混ぜて候補不足を防ぐ。
    const deterministic = buildDeterministicAdd1D1D(normalizedType, patternId);
    unique = uniqueByPromptAndEquivalent([...deterministic, ...unique].map(normalizeJ1IntEntry));
  }
  if (unique.length < Math.min(5, targetCount) && hasPattern) {
    const fallbackEntries = buildPatternFallbackEntries(normalizedType, patternId, targetCount);
    unique = uniqueByPromptAndEquivalent([...unique, ...fallbackEntries].map(normalizeJ1IntEntry));
  }
  if (unique.length < Math.min(5, targetCount)) {
    const gradeId = getGradeIdFromTypeId(type.type_id);
    if (!isFrozenElementaryGrade(gradeId)) {
      // Keep non-frozen grades extensible via questItemFactory generators without altering displayed text.
      const reExpanded = expandEntriesToAtLeast(unique, Math.max(5, targetCount)).map(normalizeJ1IntEntry);
      unique = uniqueByPromptAndEquivalent(reExpanded);
    }
  }
  unique = filterE1Add2D1DYesToTwoDigits(unique, type.type_id, hasPattern ? patternId : undefined);
  unique = filterE1Phase7To10To20Range(unique, type.type_id);
  const ordered = reorderAvoidAdjacentSameFamily(shuffle(unique).map(normalizeJ1IntEntry)).slice(0, targetCount);
  const entries = uniqueByPromptAndEquivalent(ordered).slice(0, targetCount);
  const reason = entries.length >= targetCount
    ? undefined
    : hasPattern
      ? "INSUFFICIENT_GENERATABLE"
      : "NO_PATTERN";
  if (reason === "INSUFFICIENT_GENERATABLE" && hasPattern) {
    if (!strategy && normalizedType.answer_format.kind !== "expr" && !patternId.startsWith("ADD_") && !patternId.startsWith("SUB_") && !patternId.startsWith("MUL_") && !patternId.startsWith("DIV_") && !patternId.startsWith("DEC_") && !patternId.startsWith("FRAC_") && !patternId.startsWith("UNIT_FRAC_") && !patternId.startsWith("MIXED_") && !patternId.startsWith("NUM_")) {
      reasonDetail = "PATTERN_GENERATOR_MISSING";
    } else if (unique.length > 0 && entries.length <= Math.max(1, Math.floor(targetCount / 5))) {
      reasonDetail = "DEDUPE_COLLISION_HIGH";
    } else {
      reasonDetail = "PARAM_RANGE_NARROW";
    }
  }
  const failureClass: StockFailureClass = entries.length >= Math.min(5, targetCount) ? "NONE" : "GEN_FAIL";
  if (process.env.NODE_ENV !== "production") {
    console.debug("[stock-build]", {
      typeId: type.type_id,
      patternId: hasPattern ? patternId : "",
      seedCount: normalizedSeed.length,
      expandedCount: expanded.length,
      uniqueCount: unique.length,
      finalCount: entries.length,
      reason,
      reasonDetail,
      failureClass,
      buildMs: Date.now() - startedAt
    });
  }

  return {
    typeId: type.type_id,
    patternId: hasPattern ? patternId : undefined,
    entries,
    count: entries.length,
    target: targetCount,
    reason,
    reasonDetail,
    failureClass,
    expandedCount: expanded.length,
    uniqueCount: unique.length,
    generatedCount: expanded.length,
    buildMs: Date.now() - startedAt
  };
};

export const buildStocksForTypes = (types: TypeDef[], targetCount = 50) => {
  const map = new Map<string, TypeStockResult>();
  for (const type of types) {
    map.set(type.type_id, buildTypeStock(type, targetCount));
  }
  return map;
};

export const pickUniqueQuizFromStock = (stock: QuestEntry[], quizSize = 5): { entries: QuestEntry[]; meta: PickMeta } => {
  const requested = Math.max(0, quizSize);
  const availableBeforeDedupe = stock.length;
  const deduped = uniqueByPromptAndEquivalent(stock);
  const availableAfterDedupe = deduped.length;
  const dedupedOutCount = Math.max(0, availableBeforeDedupe - availableAfterDedupe);
  if (availableAfterDedupe < 1 || requested < 1) {
    return {
      entries: [],
      meta: {
        requested,
        availableBeforeDedupe,
        availableAfterDedupe,
        picked: 0,
        dedupedOutCount,
        reason: "EMPTY"
      }
    };
  }
  let picked = shuffle(deduped).slice(0, Math.min(requested, availableAfterDedupe));
  if (picked.length < requested && availableBeforeDedupe >= requested) {
    const deterministic = [...deduped].sort((a, b) => entryPromptKey(a).localeCompare(entryPromptKey(b)));
    picked = deterministic.slice(0, Math.min(requested, deterministic.length));
  }
  return {
    entries: picked,
    meta: {
      requested,
      availableBeforeDedupe,
      availableAfterDedupe,
      picked: picked.length,
      dedupedOutCount,
      reason: picked.length < requested ? "SHORTAGE" : undefined
    }
  };
};
