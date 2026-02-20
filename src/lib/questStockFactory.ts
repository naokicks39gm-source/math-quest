import {
  entryEquivalentKey,
  entryPromptKey,
  expandEntriesToAtLeast,
  reorderAvoidAdjacentSameFamily,
  type QuestEntry
} from "@/lib/questItemFactory";

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

export type StockFailureClass = "NONE" | "GEN_FAIL" | "GEN_OK_PICK_FAIL";

export type TypeStockResult = {
  typeId: string;
  patternId?: string;
  entries: QuestEntry[];
  count: number;
  target: number;
  reason?: TypeStockReason;
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

const parseDigitsFromPattern = (patternId: string) => {
  const match = patternId.match(/_(\d)D_(\d)D/);
  if (!match) return { a: 1, b: 1 };
  return { a: Number(match[1]), b: Number(match[2]) };
};

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

  let attempts = 0;
  const maxAttempts = 20000;
  while (out.length < targetCount && attempts < maxAttempts) {
    attempts += 1;
    const a = minByDigits(aDigits) + Math.floor(Math.random() * (maxByDigits(aDigits) - minByDigits(aDigits) + 1));
    const b = minByDigits(bDigits) + Math.floor(Math.random() * (maxByDigits(bDigits) - minByDigits(bDigits) + 1));
    if (isAdd) {
      const carry = (a % 10) + (b % 10) >= 10;
      if (needsNo && carry) continue;
      if (needsYes && !carry) continue;
      out.push({
        type,
        item: { prompt: `${a} + ${b} =`, prompt_tex: `${a} + ${b} =`, answer: String(a + b) }
      });
      continue;
    }
    if (isSub) {
      if (a <= b) continue;
      const borrow = (a % 10) < (b % 10);
      if (needsNo && borrow) continue;
      if (needsYes && !borrow) continue;
      out.push({
        type,
        item: { prompt: `${a} - ${b} =`, prompt_tex: `${a} - ${b} =`, answer: String(a - b) }
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

const getGradeIdFromTypeId = (typeId: string) => typeId.split(".")[0] ?? "";

const isFrozenElementaryGrade = (gradeId: string) => /^(E1|E2|E3|E4)$/.test(gradeId);

const uniqueByPromptAndEquivalent = (entries: QuestEntry[]) => {
  const unique: QuestEntry[] = [];
  const promptKeys = new Set<string>();
  const equivalentKeys = new Set<string>();
  for (const entry of entries) {
    const promptKey = entryPromptKey(entry);
    const equivalentKey = entryEquivalentKey(entry);
    if (promptKeys.has(promptKey)) continue;
    if (equivalentKeys.has(equivalentKey)) continue;
    promptKeys.add(promptKey);
    equivalentKeys.add(equivalentKey);
    unique.push(entry);
  }
  return unique;
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
  const normalizedSeed = normalizedType.example_items.map((item) => ({ item, type: normalizedType }));
  const expanded = expandEntriesToAtLeast(normalizedSeed, targetCount);
  let unique = uniqueByPromptAndEquivalent(expanded);
  if (hasPattern && patternId.startsWith("ADD_1D_1D_")) {
    // 1けた+1けたは列挙可能なので、常に決定的候補を混ぜて候補不足を防ぐ。
    const deterministic = buildDeterministicAdd1D1D(normalizedType, patternId);
    unique = uniqueByPromptAndEquivalent([...deterministic, ...unique]);
  }
  if (unique.length < Math.min(5, targetCount) && hasPattern) {
    const fallbackEntries = buildPatternFallbackEntries(normalizedType, patternId, targetCount);
    unique = uniqueByPromptAndEquivalent([...unique, ...fallbackEntries]);
  }
  if (unique.length < Math.min(5, targetCount)) {
    const gradeId = getGradeIdFromTypeId(type.type_id);
    if (!isFrozenElementaryGrade(gradeId)) {
      // Keep non-frozen grades extensible via questItemFactory generators without altering displayed text.
      const reExpanded = expandEntriesToAtLeast(unique, Math.max(5, targetCount));
      unique = uniqueByPromptAndEquivalent(reExpanded);
    }
  }
  const ordered = reorderAvoidAdjacentSameFamily(shuffle(unique)).slice(0, targetCount);
  const entries = uniqueByPromptAndEquivalent(ordered).slice(0, targetCount);
  const reason = entries.length >= targetCount
    ? undefined
    : hasPattern
      ? "INSUFFICIENT_GENERATABLE"
      : "NO_PATTERN";
  const failureClass: StockFailureClass = entries.length >= Math.min(5, targetCount) ? "NONE" : "GEN_FAIL";
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[stock-build]", {
      typeId: type.type_id,
      patternId: hasPattern ? patternId : "",
      seedCount: normalizedSeed.length,
      expandedCount: expanded.length,
      uniqueCount: unique.length,
      finalCount: entries.length,
      reason,
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
