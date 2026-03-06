import type { TypeDef } from "@/lib/elementaryContent";
import type { QuestEntry } from "@/lib/questItemFactory";

const J1_LEVEL_DEFINITIONS = [
  { levelId: "J1-1", title: "絶対値（意味）", categoryName: "数と式", patternId: "J1_ABS", answerKind: "int", prompt: "|-5| =", answer: "5", promptTex: "\\left|-5\\right| =" },
  { levelId: "J1-2", title: "絶対値（大小）", categoryName: "数と式", patternId: "J1_ABS", answerKind: "int", prompt: "|−7| と |4| の大きい方 =", answer: "7", promptTex: "\\left|-7\\right|\\ と\\ \\left|4\\right|\\ の大きい方 =" },
  { levelId: "J1-3", title: "絶対値（計算）", categoryName: "数と式", patternId: "J1_ABS", answerKind: "int", prompt: "|−3| + |5| =", answer: "8", promptTex: "\\left|-3\\right| + \\left|5\\right| =" },
  { levelId: "J1-4", title: "負＋負", categoryName: "数と式", patternId: "INT_ADD", answerKind: "int", prompt: "-4 + (-6) =", answer: "-10", promptTex: "-4 + (-6) =" },
  { levelId: "J1-5", title: "正＋負", categoryName: "数と式", patternId: "INT_ADD", answerKind: "int", prompt: "8 + (-3) =", answer: "5", promptTex: "8 + (-3) =" },
  { levelId: "J1-6", title: "負＋正", categoryName: "数と式", patternId: "INT_ADD", answerKind: "int", prompt: "-7 + 5 =", answer: "-2", promptTex: "-7 + 5 =" },
  { levelId: "J1-7", title: "正−負", categoryName: "数と式", patternId: "INT_SUB", answerKind: "int", prompt: "6 - (-3) =", answer: "9", promptTex: "6 - (-3) =" },
  { levelId: "J1-8", title: "負−正", categoryName: "数と式", patternId: "INT_SUB", answerKind: "int", prompt: "-4 - 3 =", answer: "-7", promptTex: "-4 - 3 =" },
  { levelId: "J1-9", title: "負−負", categoryName: "数と式", patternId: "INT_SUB", answerKind: "int", prompt: "-5 - (-2) =", answer: "-3", promptTex: "-5 - (-2) =" },
  { levelId: "J1-10", title: "乗法（符号）", categoryName: "数と式", patternId: "INT_MUL", answerKind: "int", prompt: "(-3) × (-8) =", answer: "24", promptTex: "(-3) \\times (-8) =" },
  { levelId: "J1-11", title: "乗法（小数）", categoryName: "数と式", patternId: "INT_MUL", answerKind: "dec", prompt: "(-2.5) × 4 =", answer: "-10", promptTex: "(-2.5) \\times 4 =" },
  { levelId: "J1-12", title: "乗法（分数）", categoryName: "数と式", patternId: "INT_MUL", answerKind: "int", prompt: "(-2/3) × 3 =", answer: "-2", promptTex: "\\left(-\\frac{2}{3}\\right) \\times 3 =" },
  { levelId: "J1-13", title: "乗法（小数×分数）", categoryName: "数と式", patternId: "INT_MUL", answerKind: "frac", prompt: "(-0.5) × (3/4) =", answer: "-3/8", promptTex: "\\left(-0.5\\right) \\times \\left(\\frac{3}{4}\\right) =" },
  { levelId: "J1-14", title: "除法（符号）", categoryName: "数と式", patternId: "INT_DIV", answerKind: "int", prompt: "24 ÷ (-6) =", answer: "-4", promptTex: "24 \\div (-6) =" },
  { levelId: "J1-15", title: "除法（小数）", categoryName: "数と式", patternId: "INT_DIV", answerKind: "dec", prompt: "-4.8 ÷ 2 =", answer: "-2.4", promptTex: "-4.8 \\div 2 =" },
  { levelId: "J1-16", title: "除法（分数）", categoryName: "数と式", patternId: "INT_DIV", answerKind: "frac", prompt: "(-3/4) ÷ (1/2) =", answer: "-3/2", promptTex: "\\left(-\\frac{3}{4}\\right) \\div \\left(\\frac{1}{2}\\right) =" },
  { levelId: "J1-17", title: "複合計算", categoryName: "数と式", patternId: "J1_COMPOSITE", answerKind: "int", prompt: "-3 + 5 × (-2) =", answer: "-13", promptTex: "-3 + 5 \\times (-2) =" },
  { levelId: "J1-19", title: "指数（基本）", categoryName: "数と式", patternId: "POW_INT", answerKind: "int", prompt: "3^2 =", answer: "9", promptTex: "3^{2} =" },
  { levelId: "J1-20", title: "指数（負の数）", categoryName: "数と式", patternId: "POW_INT", answerKind: "int", prompt: "(-4)^2 =", answer: "16", promptTex: "\\left(-4\\right)^{2} =" },
  { levelId: "J1-21", title: "指数（前マイナス）", categoryName: "数と式", patternId: "POW_INT", answerKind: "int", prompt: "-4^2 =", answer: "-16", promptTex: "-4^{2} =" },
  { levelId: "J1-22", title: "同類項（基本）", categoryName: "数と式", patternId: "FACTOR_GCF", answerKind: "expr", prompt: "3x + 2x =", answer: "5x", promptTex: "3x + 2x =" },
  { levelId: "J1-23", title: "同類項（3項 / 複数文字）", categoryName: "数と式", patternId: "FACTOR_GCF", answerKind: "expr", prompt: "2x + 3y + 4x =", answer: "6x+3y", promptTex: "2x + 3y + 4x =" },
  { levelId: "J1-24", title: "同類項（4項 / 複数文字）", categoryName: "数と式", patternId: "FACTOR_GCF", answerKind: "expr", prompt: "3x + 2y - x + 5y =", answer: "2x+7y", promptTex: "3x + 2y - x + 5y =" },
  { levelId: "J1-25", title: "同類項（3文字）", categoryName: "数と式", patternId: "FACTOR_GCF", answerKind: "expr", prompt: "2x + 3y + x + y - 4z =", answer: "3x+4y-4z", promptTex: "2x + 3y + x + y - 4z =" },
  { levelId: "J1-26", title: "分配（基本）", categoryName: "数と式", patternId: "EXPAND", answerKind: "expr", prompt: "3(x + 4) =", answer: "3x+12", promptTex: "3(x + 4) =" },
  { levelId: "J1-27", title: "分配→同類項（複数文字）", categoryName: "数と式", patternId: "EXPAND", answerKind: "expr", prompt: "2(x + y) + 3x =", answer: "5x+2y", promptTex: "2(x + y) + 3x =" },
  { levelId: "J1-28", title: "分配→同類項（複数）", categoryName: "数と式", patternId: "EXPAND", answerKind: "expr", prompt: "3(x + 2y) + 2(x + y) =", answer: "5x+8y", promptTex: "3(x + 2y) + 2(x + y) =" },
  { levelId: "J1-29", title: "方程式（基本）", categoryName: "数と式", patternId: "LIN_EQ", answerKind: "int", prompt: "x + 5 = 9, x =", answer: "4", promptTex: "x + 5 = 9, x =" },
  { levelId: "J1-30", title: "方程式（係数）", categoryName: "数と式", patternId: "LIN_EQ", answerKind: "int", prompt: "2x = 10, x =", answer: "5", promptTex: "2x = 10, x =" },
  { levelId: "J1-31", title: "方程式（移項）", categoryName: "数と式", patternId: "LIN_EQ", answerKind: "int", prompt: "3x + 4 = 10, x =", answer: "2", promptTex: "3x + 4 = 10, x =" },
  { levelId: "J1-32", title: "方程式（小数）", categoryName: "数と式", patternId: "LIN_EQ", answerKind: "int", prompt: "0.5x + 2 = 5, x =", answer: "6", promptTex: "0.5x + 2 = 5, x =" },
  { levelId: "J1-33", title: "方程式（分数）", categoryName: "数と式", patternId: "LIN_EQ", answerKind: "int", prompt: "(1/2)x + 3 = 7, x =", answer: "8", promptTex: "\\left(\\frac{1}{2}\\right)x + 3 = 7, x =" },
  { levelId: "J1-34", title: "方程式（括弧）", categoryName: "数と式", patternId: "LIN_EQ", answerKind: "int", prompt: "2(x + 3) = 10, x =", answer: "2", promptTex: "2(x + 3) = 10, x =" },
  { levelId: "J1-35", title: "方程式（複雑）", categoryName: "数と式", patternId: "LIN_EQ", answerKind: "int", prompt: "2(x + 3) + 4 = 14, x =", answer: "2", promptTex: "2(x + 3) + 4 = 14, x =" },
  { levelId: "J1-36", title: "方程式（小数複合）", categoryName: "数と式", patternId: "LIN_EQ", answerKind: "int", prompt: "0.5(x + 4) = 3, x =", answer: "2", promptTex: "0.5(x + 4) = 3, x =" },
  { levelId: "J1-37", title: "方程式（分数複合）", categoryName: "数と式", patternId: "LIN_EQ", answerKind: "int", prompt: "(1/2)(x + 6) = 5, x =", answer: "4", promptTex: "\\left(\\frac{1}{2}\\right)(x + 6) = 5, x =" },
  { levelId: "J1-38", title: "方程式（中括弧）", categoryName: "数と式", patternId: "LIN_EQ", answerKind: "int", prompt: "2{ x + 3 } + 4 = 14, x =", answer: "2", promptTex: "2\\{ x + 3 \\} + 4 = 14, x =" },
  { levelId: "J1-39", title: "傾き", categoryName: "関数", patternId: "LIN_FUNC_PARAMS", answerKind: "int", prompt: "y = 2x + 3 の傾き =", answer: "2", promptTex: "y = 2x + 3\\ の\\ 傾き =" },
  { levelId: "J1-40", title: "切片", categoryName: "関数", patternId: "LIN_FUNC_PARAMS", answerKind: "int", prompt: "y = 2x + 5 の切片 =", answer: "5", promptTex: "y = 2x + 5\\ の\\ 切片 =" },
  { levelId: "J1-41", title: "切片を求める", categoryName: "関数", patternId: "LIN_FUNC_PARAMS", answerKind: "int", prompt: "y = 2x + b, 点(1,5) の b =", answer: "3", promptTex: "y = 2x + b,\\ 点(1,5)\\ の\\ b =" },
  { levelId: "J1-42", title: "グラフ選択", categoryName: "関数", patternId: "LIN_FUNC_PARAMS", answerKind: "pair", prompt: "y = 2x + 1 の (傾き,切片) =", answer: "2,1", promptTex: "y = 2x + 1\\ の\\ (傾き,切片) =" },
  { levelId: "J1-43", title: "平行", categoryName: "関数", patternId: "LIN_FUNC_PARAMS", answerKind: "int", prompt: "y = 2x + 3 と平行な直線の傾き =", answer: "2", promptTex: "y = 2x + 3\\ と平行な直線の傾き =" }
] as const;

export type J1LevelId = (typeof J1_LEVEL_DEFINITIONS)[number]["levelId"];

export type J1LevelOption = {
  levelId: J1LevelId;
  title: string;
  categoryName: string;
};

type J1AnswerKind = (typeof J1_LEVEL_DEFINITIONS)[number]["answerKind"];

const buildLevelDisplayName = (levelId: J1LevelId, title: string) => `Lv:${levelId} ${title}`;

const answerFormatByKind = (kind: J1AnswerKind): TypeDef["answer_format"] => {
  if (kind === "int") return { kind: "int" };
  if (kind === "dec") return { kind: "dec" };
  if (kind === "frac") return { kind: "frac" };
  if (kind === "pair") return { kind: "pair" };
  return { kind: "expr" };
};

const buildSyntheticType = (definition: (typeof J1_LEVEL_DEFINITIONS)[number]): TypeDef => ({
  type_id: `J1.CURRICULUM.LEVEL.${definition.levelId.replace("-", "_")}`,
  type_name: definition.title,
  display_name: buildLevelDisplayName(definition.levelId, definition.title),
  generation_params: {
    pattern_id: definition.patternId
  },
  answer_format: answerFormatByKind(definition.answerKind),
  example_items: [
    {
      prompt: definition.prompt,
      prompt_tex: definition.promptTex,
      answer: definition.answer
    }
  ]
});

export const J1_LEVEL_OPTIONS: J1LevelOption[] = J1_LEVEL_DEFINITIONS.map((definition) => ({
  levelId: definition.levelId,
  title: definition.title,
  categoryName: definition.categoryName
}));

const J1_LEVEL_ID_SET = new Set<string>(J1_LEVEL_OPTIONS.map((entry) => entry.levelId));

export const isJ1LevelId = (value: string): value is J1LevelId => J1_LEVEL_ID_SET.has(value);

export const generateJ1LevelProblems = (levelId: J1LevelId, count = 1): QuestEntry[] => {
  const definition = J1_LEVEL_DEFINITIONS.find((entry) => entry.levelId === levelId);
  if (!definition) return [];
  const type = buildSyntheticType(definition);
  const entry: QuestEntry = {
    type,
    item: type.example_items[0]
  };
  return Array.from({ length: Math.max(1, count) }, () => entry);
};
