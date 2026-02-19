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

export type TypeStockResult = {
  typeId: string;
  entries: QuestEntry[];
  count: number;
  target: number;
  reason?: TypeStockReason;
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
      entries: [],
      count: 0,
      target: targetCount,
      reason: "NO_SOURCE",
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
  const ordered = reorderAvoidAdjacentSameFamily(shuffle(unique)).slice(0, targetCount);
  const entries = uniqueByPromptAndEquivalent(ordered).slice(0, targetCount);
  const reason = entries.length >= targetCount
    ? undefined
    : hasPattern
      ? "INSUFFICIENT_GENERATABLE"
      : "NO_PATTERN";

  return {
    typeId: type.type_id,
    entries,
    count: entries.length,
    target: targetCount,
    reason,
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
  const picked = shuffle(deduped).slice(0, Math.min(requested, availableAfterDedupe));
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
