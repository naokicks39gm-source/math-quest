import type { TypeDef } from "@/lib/elementaryContent";
import type { QuestEntry } from "@/lib/questItemFactory";

export type E1LevelId =
  | "E1-1"
  | "E1-2"
  | "E1-3"
  | "E1-4"
  | "E1-5"
  | "E1-6"
  | "E1-7"
  | "E1-8"
  | "E1-9"
  | "E1-10"
  | "E1-11"
  | "E1-12";

export type E1LevelOption = {
  levelId: E1LevelId;
  title: string;
};

export const E1_LEVEL_OPTIONS: E1LevelOption[] = [
  { levelId: "E1-1", title: "どちらが大きい" },
  { levelId: "E1-2", title: "10のぶんかい（基本）" },
  { levelId: "E1-3", title: "10のぶんかい（順不同）" },
  { levelId: "E1-4", title: "10をつくる（穴埋め）" },
  { levelId: "E1-5", title: "10になるひき算" },
  { levelId: "E1-6", title: "たし算（答え5まで）" },
  { levelId: "E1-7", title: "たし算（答え10まで）" },
  { levelId: "E1-8", title: "10をまたぐたし算" },
  { levelId: "E1-9", title: "ひき算（10まで）" },
  { levelId: "E1-10", title: "ひき算（20まで）" },
  { levelId: "E1-11", title: "2けた + 1けた" },
  { levelId: "E1-12", title: "2けた - 1けた" }
];

const E1_LEVEL_ID_SET = new Set<string>(E1_LEVEL_OPTIONS.map((entry) => entry.levelId));

const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

const ensureEquationSuffix = (text: string) =>
  /\s*[=＝]\s*$/u.test(text) ? text : `${text.trimEnd()} =`;

const dotLines = (count: number) => {
  const safe = Math.max(0, Math.floor(count));
  if (safe <= 10) return "●".repeat(safe);
  return `${"●".repeat(10)}\n${"●".repeat(safe - 10)}`;
};

const explanationAdd = (a: number, b: number) => `${a}こ
${dotLines(a)}

${b}こ
${dotLines(b)}

↓
${dotLines(a + b)}

${a + b}`;

const explanationSub = (a: number, b: number) => `${a}こ
${dotLines(a)}

${b}こ とる
${dotLines(b)}

↓
${dotLines(a - b)}

${a - b}`;

const explanationCompare = (left: number, right: number) => `${left}こ
${dotLines(left)}

${right}こ
${dotLines(right)}

${right} > ${left}`;

const explanationTenFill = (known: number, unknown: number) => `${known}こ
${dotLines(known)}

□こ
${dotLines(unknown)}

${known} + ${unknown}

こたえ
${unknown}`;

type E1Item = QuestEntry["item"] & { memo_explanation?: string };

const buildLevelType = (levelId: E1LevelId): TypeDef => {
  const title = E1_LEVEL_OPTIONS.find((entry) => entry.levelId === levelId)?.title ?? levelId;
  return {
    type_id: `E1.NA.LEVEL.${levelId.replace("-", "_")}`,
    type_name: title,
    display_name: `${levelId} ${title}`,
    generation_params: {
      pattern_id: `E1_LEVEL_${levelId.replace("-", "_")}`
    },
    answer_format: { kind: "int" },
    example_items: []
  };
};

const buildEntry = (type: TypeDef, item: E1Item): QuestEntry => ({ type, item });

const generateOne = (levelId: E1LevelId): E1Item => {
  if (levelId === "E1-1") {
    const left = randInt(1, 19);
    const right = randInt(left + 1, 20);
    return {
      prompt: `${left} と ${right}\nどちらが大きい？`,
      answer: `${right}`,
      memo_explanation: explanationCompare(left, right)
    };
  }
  if (levelId === "E1-2") {
    const known = randInt(1, 9);
    const unknown = 10 - known;
    return {
      prompt: `10 は ${known} と □`,
      answer: `${unknown}`,
      memo_explanation: explanationTenFill(known, unknown)
    };
  }
  if (levelId === "E1-3") {
    const known = randInt(1, 9);
    const unknown = 10 - known;
    return {
      prompt: `□ と ${known} で 10`,
      answer: `${unknown}`,
      memo_explanation: explanationTenFill(known, unknown)
    };
  }
  if (levelId === "E1-4") {
    const known = randInt(1, 9);
    const unknown = 10 - known;
    return {
      prompt: `${known} + □ = 10`,
      answer: `${unknown}`,
      memo_explanation: explanationTenFill(known, unknown)
    };
  }
  if (levelId === "E1-5") {
    const b = randInt(1, 9);
    return {
      prompt: ensureEquationSuffix(`10 - ${b}`),
      answer: `${10 - b}`,
      memo_explanation: explanationSub(10, b)
    };
  }
  if (levelId === "E1-6") {
    const a = randInt(1, 4);
    const b = randInt(1, 5 - a);
    return {
      prompt: ensureEquationSuffix(`${a} + ${b}`),
      answer: `${a + b}`,
      memo_explanation: explanationAdd(a, b)
    };
  }
  if (levelId === "E1-7") {
    const a = randInt(1, 9);
    const b = randInt(1, 10 - a);
    return {
      prompt: ensureEquationSuffix(`${a} + ${b}`),
      answer: `${a + b}`,
      memo_explanation: explanationAdd(a, b)
    };
  }
  if (levelId === "E1-8") {
    const a = randInt(6, 9);
    const b = randInt(Math.max(2, 11 - a), 9);
    return {
      prompt: ensureEquationSuffix(`${a} + ${b}`),
      answer: `${a + b}`,
      memo_explanation: explanationAdd(a, b)
    };
  }
  if (levelId === "E1-9") {
    const a = randInt(1, 10);
    const b = randInt(0, a);
    return {
      prompt: ensureEquationSuffix(`${a} - ${b}`),
      answer: `${a - b}`,
      memo_explanation: explanationSub(a, b)
    };
  }
  if (levelId === "E1-10") {
    const a = randInt(11, 20);
    const b = randInt(1, Math.min(9, a));
    return {
      prompt: ensureEquationSuffix(`${a} - ${b}`),
      answer: `${a - b}`,
      memo_explanation: explanationSub(a, b)
    };
  }
  if (levelId === "E1-11") {
    const a = randInt(10, 19);
    const b = randInt(1, Math.min(9, 20 - a));
    return {
      prompt: ensureEquationSuffix(`${a} + ${b}`),
      answer: `${a + b}`,
      memo_explanation: explanationAdd(a, b)
    };
  }
  const a = randInt(10, 20);
  const b = randInt(1, Math.min(9, a));
  return {
    prompt: ensureEquationSuffix(`${a} - ${b}`),
    answer: `${a - b}`,
    memo_explanation: explanationSub(a, b)
  };
};

export const isE1LevelId = (value?: string | null): value is E1LevelId =>
  Boolean(value && E1_LEVEL_ID_SET.has(value));

export const generateE1LevelProblems = (levelId: E1LevelId, count = 5): QuestEntry[] => {
  const safeCount = Math.max(1, Math.floor(count));
  const type = buildLevelType(levelId);
  const out: QuestEntry[] = [];
  while (out.length < safeCount) {
    out.push(buildEntry(type, generateOne(levelId)));
  }
  return out;
};

