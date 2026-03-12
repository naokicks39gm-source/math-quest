import type { TypeDef } from "@/lib/elementaryContent";
import { getCatalogGrades } from "@/lib/gradeCatalog";
import type { QuestEntry } from "@/lib/questItemFactory";
import { buildTypeStock, pickUniqueQuizFromStock } from "@/lib/questStockFactory";

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
  { levelId: "E1-1", title: "小さいほう" },
  { levelId: "E1-2", title: "10のぶんかい" },
  { levelId: "E1-3", title: "10のごうせい" },
  { levelId: "E1-4", title: "たし算（答え10まで）" },
  { levelId: "E1-5", title: "10をつくるたし算" },
  { levelId: "E1-6", title: "10をまたぐたし算" },
  { levelId: "E1-7", title: "ひき算（10まで）" },
  { levelId: "E1-8", title: "ひき算（20まで）" },
  { levelId: "E1-9", title: "2けた + 1けた（繰り上がりなし）" },
  { levelId: "E1-10", title: "2けた + 1けた（繰り上がりあり）" },
  { levelId: "E1-11", title: "2けた - 1けた（繰り下がりあり）" },
  { levelId: "E1-12", title: "1年生のまとめ" }
];

const E1_LEVEL_ID_SET = new Set<string>(E1_LEVEL_OPTIONS.map((entry) => entry.levelId));
const E1_EXISTING_BORROW_TYPE_ID = "E1.NA.SUB.SUB_2D_1D_YES";
const FULLWIDTH_SPACE = "\u3000";
const SECTION_DIVIDER = "--------------";

const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

const ensureEquationSuffix = (text: string) =>
  /\s*[=＝]\s*$/u.test(text) ? text : `${text.trimEnd()} =`;

const spacedDots = (count: number) => Array.from({ length: Math.max(0, Math.floor(count)) }, () => "●").join(" ");

const dotLines = (count: number) => {
  const safe = Math.max(0, Math.floor(count));
  if (safe <= 10) return spacedDots(safe);
  return `${spacedDots(10)}\n${spacedDots(safe - 10)}`;
};

const buildLevelDisplayName = (levelId: E1LevelId, title: string) => `Lv:${levelId} ${title}`;

const buildMemoExplanation = (steps: string[], conclusion: string) => {
  const normalizedSteps = steps.map((step) => step.trim()).filter((step) => step.length > 0);
  return [...normalizedSteps, conclusion.trim()].join("\n\n");
};

const numberedStep = (num: number, title: string, body: string) => `${["①", "②", "③", "④", "⑤", "⑥"][num - 1] ?? `${num}.`} ${title}\n\n${body.trim()}`;

const explanationCompare = (left: number, right: number) =>
  buildMemoExplanation(
    [
      numberedStep(1, `${left}こ`, dotLines(left)),
      numberedStep(2, `${right}こ`, dotLines(right)),
      numberedStep(3, "くらべる", `ちいさいのは ${left}`)
    ],
    `ちいさいのは ${left}`
  );

const explanationComposeTen = (known: number, missing: number) =>
  buildMemoExplanation(
    [
      numberedStep(1, "10こ", dotLines(10)),
      numberedStep(2, `${known}こ`, dotLines(known)),
      numberedStep(3, "のこり", dotLines(missing)),
      numberedStep(4, "こたえ", `${missing}`)
    ],
    `${known} + ${missing} = 10`
  );

const explanationAddSimple = (a: number, b: number) =>
  buildMemoExplanation(
    [
      numberedStep(1, `${a}こ`, dotLines(a)),
      numberedStep(2, `${b}こ`, dotLines(b)),
      numberedStep(3, "あわせる", `${dotLines(a)}\n+ ${dotLines(b)}\n${SECTION_DIVIDER}\n${dotLines(a + b)}`),
      numberedStep(4, "こたえ", `${a + b}`)
    ],
    `${a} + ${b} = ${a + b}`
  );

const explanationCrossTenAdd = (a: number, b: number) => {
  const need = 10 - a;
  const remain = b - need;
  return buildMemoExplanation(
    [
      numberedStep(1, `${a}こ`, dotLines(a)),
      numberedStep(2, `${b}こ`, dotLines(b)),
      numberedStep(3, "まず10をつくる", `${dotLines(a)}\n+ ${dotLines(need)}\n${SECTION_DIVIDER}\n${dotLines(10)}`),
      numberedStep(4, "のこり", `${remain}`),
      numberedStep(5, `10 と ${remain} をたす`, `10\n+ ${remain}\n${SECTION_DIVIDER}\n${a + b}`),
      numberedStep(6, "こたえ", `${a + b}`)
    ],
    `10 + ${remain} = ${a + b}`
  );
};

const explanationSub = (a: number, b: number) =>
  buildMemoExplanation(
    [
      numberedStep(1, `${a}こ`, dotLines(a)),
      numberedStep(2, `${b}こ とる`, `− ${dotLines(b)}`),
      numberedStep(3, "のこり", dotLines(a - b)),
      numberedStep(4, "こたえ", `${a - b}`)
    ],
    `${a} − ${b} = ${a - b}`
  );

const explanationAdd2D1D = (a: number, b: number) =>
  buildMemoExplanation(
    [
      numberedStep(1, `${a}`, dotLines(a)),
      numberedStep(2, `${b}`, dotLines(b)),
      numberedStep(3, "あわせる", `${dotLines(a)}\n+ ${dotLines(b)}\n${SECTION_DIVIDER}\n${dotLines(a + b)}`),
      numberedStep(4, "こたえ", `${a + b}`)
    ],
    `${a} + ${b} = ${a + b}`
  );

const explanationAdd2D1DWithCarry = (a: number, b: number) => {
  const ones = a % 10;
  const need = 10 - ones;
  const remain = b - need;
  const bridge = a + need;
  return buildMemoExplanation(
    [
      numberedStep(1, `${a}`, dotLines(a)),
      numberedStep(2, `${b}`, dotLines(b)),
      numberedStep(3, "まず10をつくる", `${a}\n+ ${need}\n${SECTION_DIVIDER}\n${bridge}`),
      numberedStep(4, "のこり", `${remain}`),
      numberedStep(5, `${bridge} と ${remain} をたす`, `${bridge}\n+ ${remain}\n${SECTION_DIVIDER}\n${a + b}`),
      numberedStep(6, "こたえ", `${a + b}`)
    ],
    `${bridge} + ${remain} = ${a + b}`
  );
};

const explanationSummary = (prompt: string, answer: number) => {
  const nums = prompt.match(/\d+/g)?.map(Number) ?? [];
  if (prompt.includes("+") && nums.length >= 2) {
    const [a, b] = nums;
    return a + b > 10 ? explanationCrossTenAdd(a, b) : explanationAddSimple(a, b);
  }
  if (prompt.includes("-") && nums.length >= 2) {
    const [a, b] = nums;
    return explanationSub(a, b);
  }
  return buildMemoExplanation([numberedStep(1, "こたえ", `${answer}`)], `${prompt.replace(/\s*=\s*$/u, "")} = ${answer}`);
};

type E1Item = QuestEntry["item"] & { memo_explanation?: string };

const buildSyntheticType = (levelId: E1LevelId): TypeDef => {
  const title = E1_LEVEL_OPTIONS.find((entry) => entry.levelId === levelId)?.title ?? levelId;
  return {
    type_id: `E1.NA.LEVEL.${levelId.replace("-", "_")}`,
    type_name: title,
    display_name: buildLevelDisplayName(levelId, title),
    generation_params: {
      pattern_id: `E1_LEVEL_${levelId.replace("-", "_")}`
    },
    answer_format: { kind: "int" },
    example_items: []
  };
};

const buildEntry = (type: TypeDef, item: E1Item): QuestEntry => ({ type, item });

const buildLegacyBackedType = (source: TypeDef, levelId: E1LevelId): TypeDef => {
  const title = E1_LEVEL_OPTIONS.find((entry) => entry.levelId === levelId)?.title ?? source.type_name ?? levelId;
  return {
    ...source,
    type_name: title,
    display_name: buildLevelDisplayName(levelId, title)
  };
};

const findExistingType = (typeId: string): TypeDef | null => {
  const grades = getCatalogGrades();
  for (const grade of grades) {
    for (const category of grade.categories) {
      const hit = category.types.find((type) => type.type_id === typeId);
      if (hit) return hit;
    }
  }
  return null;
};

const parseBinaryOperands = (prompt: string) => {
  const nums = prompt.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length < 2) return null;
  return { left: nums[0], right: nums[1] };
};

const generateLegacyBorrowProblems = (count: number): QuestEntry[] => {
  const existingType = findExistingType(E1_EXISTING_BORROW_TYPE_ID);
  if (!existingType) return [];
  const stock = buildTypeStock(existingType, Math.max(20, count * 4));
  const picked = pickUniqueQuizFromStock(stock.entries, count).entries;
  const publicType = buildLegacyBackedType(existingType, "E1-11");
  return picked.map((entry) => {
    const parsed = parseBinaryOperands(entry.item.prompt);
    return {
      item: {
        ...entry.item,
        memo_explanation: parsed ? explanationSub(parsed.left, parsed.right) : entry.item.prompt
      },
      type: publicType
    };
  });
};

const generateSummaryProblem = (): E1Item => {
  const mode = randInt(0, 3);
  if (mode === 0) {
    const a = randInt(3, 9);
    const b = randInt(Math.max(1, 11 - a), 9);
    return {
      prompt: ensureEquationSuffix(`${a} + ${b}`),
      answer: `${a + b}`,
      memo_explanation: explanationSummary(ensureEquationSuffix(`${a} + ${b}`), a + b)
    };
  }
  if (mode === 1) {
    const a = randInt(11, 19);
    const b = randInt(1, Math.min(9, 20 - a));
    return {
      prompt: ensureEquationSuffix(`${a} + ${b}`),
      answer: `${a + b}`,
      memo_explanation: explanationSummary(ensureEquationSuffix(`${a} + ${b}`), a + b)
    };
  }
  if (mode === 2) {
    const a = randInt(6, 10);
    const b = randInt(1, a);
    return {
      prompt: ensureEquationSuffix(`${a} - ${b}`),
      answer: `${a - b}`,
      memo_explanation: explanationSummary(ensureEquationSuffix(`${a} - ${b}`), a - b)
    };
  }
  const a = randInt(11, 20);
  const b = randInt(1, Math.min(9, a));
  return {
    prompt: ensureEquationSuffix(`${a} - ${b}`),
    answer: `${a - b}`,
    memo_explanation: explanationSummary(ensureEquationSuffix(`${a} - ${b}`), a - b)
  };
};

const generateOne = (levelId: E1LevelId): E1Item => {
  if (levelId === "E1-1") {
    const left = randInt(1, 19);
    const right = randInt(left + 1, 20);
    return {
      prompt: `${left} と ${right}\nどちらが小さい？`,
      answer: `${left}`,
      memo_explanation: explanationCompare(left, right)
    };
  }
  if (levelId === "E1-2") {
    const known = randInt(1, 9);
    const missing = 10 - known;
    return {
      prompt: `10 は ${known} と${FULLWIDTH_SPACE}□${FULLWIDTH_SPACE}でできる`,
      answer: `${missing}`,
      memo_explanation: explanationComposeTen(known, missing)
    };
  }
  if (levelId === "E1-3") {
    const known = randInt(1, 9);
    const missing = 10 - known;
    return {
      prompt: `□ と ${known} で 10`,
      answer: `${missing}`,
      memo_explanation: explanationComposeTen(known, missing)
    };
  }
  if (levelId === "E1-4") {
    const a = randInt(1, 9);
    const b = randInt(1, 10 - a);
    return {
      prompt: ensureEquationSuffix(`${a} + ${b}`),
      answer: `${a + b}`,
      memo_explanation: explanationAddSimple(a, b)
    };
  }
  if (levelId === "E1-5") {
    const a = randInt(1, 9);
    const b = 10 - a;
    return {
      prompt: ensureEquationSuffix(`${a} + ${b}`),
      answer: "10",
      memo_explanation: explanationAddSimple(a, b)
    };
  }
  if (levelId === "E1-6") {
    const a = randInt(2, 9);
    const b = randInt(Math.max(2, 11 - a), 9);
    return {
      prompt: ensureEquationSuffix(`${a} + ${b}`),
      answer: `${a + b}`,
      memo_explanation: explanationCrossTenAdd(a, b)
    };
  }
  if (levelId === "E1-7") {
    const a = randInt(1, 10);
    const b = randInt(1, a);
    return {
      prompt: ensureEquationSuffix(`${a} - ${b}`),
      answer: `${a - b}`,
      memo_explanation: explanationSub(a, b)
    };
  }
  if (levelId === "E1-8") {
    const a = randInt(11, 20);
    const b = randInt(1, Math.min(9, a));
    return {
      prompt: ensureEquationSuffix(`${a} - ${b}`),
      answer: `${a - b}`,
      memo_explanation: explanationSub(a, b)
    };
  }
  if (levelId === "E1-9") {
    const a = randInt(10, 19);
    const b = randInt(1, 9 - (a % 10));
    return {
      prompt: ensureEquationSuffix(`${a} + ${b}`),
      answer: `${a + b}`,
      memo_explanation: explanationAdd2D1D(a, b)
    };
  }
  if (levelId === "E1-10") {
    const a = randInt(11, 19);
    const minB = Math.max(1, 10 - (a % 10));
    const b = randInt(minB, 9);
    return {
      prompt: ensureEquationSuffix(`${a} + ${b}`),
      answer: `${a + b}`,
      memo_explanation: explanationAdd2D1DWithCarry(a, b)
    };
  }
  return generateSummaryProblem();
};

export const isE1LevelId = (value?: string | null): value is E1LevelId =>
  Boolean(value && E1_LEVEL_ID_SET.has(value));

export const generateE1LevelProblems = (levelId: E1LevelId, count = 5): QuestEntry[] => {
  const safeCount = Math.max(1, Math.floor(count));
  if (levelId === "E1-11") {
    const legacy = generateLegacyBorrowProblems(safeCount);
    if (legacy.length >= safeCount) return legacy.slice(0, safeCount);
    const fallbackType = buildSyntheticType(levelId);
    while (legacy.length < safeCount) {
      const a = randInt(11, 19);
      const b = randInt((a % 10) + 1, 9);
      legacy.push(
        buildEntry(fallbackType, {
          prompt: ensureEquationSuffix(`${a} - ${b}`),
          answer: `${a - b}`,
          memo_explanation: explanationSub(a, b)
        })
      );
    }
    return legacy;
  }
  const type = buildSyntheticType(levelId);
  const out: QuestEntry[] = [];
  while (out.length < safeCount) {
    out.push(buildEntry(type, generateOne(levelId)));
  }
  return out;
};
