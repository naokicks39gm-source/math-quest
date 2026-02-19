export type ElementaryAidKind = "abacus" | "column" | "simple";

export type ElementaryVisual = {
  mode: "abacus" | "column" | "simple";
  left?: number;
  right?: number;
  result?: number;
  top?: number;
  bottom?: number;
  operator?: "+" | "-";
};

export type ElementaryLearningAid = {
  kind: ElementaryAidKind;
  title: string;
  steps: string[];
  conclusion: string;
  visual?: ElementaryVisual;
};

type ElementaryAidParams = {
  gradeId?: string;
  typeId?: string;
  patternId?: string;
  prompt?: string;
  aDigits?: number;
  bDigits?: number;
};

const ELEMENTARY_GRADE_RE = /^E[1-6]$/;
const ADD_SUB_PATTERN_RE = /^(ADD_|SUB_)/;

export const isElementaryGrade = (gradeId?: string) => Boolean(gradeId && ELEMENTARY_GRADE_RE.test(gradeId));

const isAddSub = (typeId?: string, patternId?: string, prompt?: string) => {
  if (typeId && (typeId.includes(".ADD.") || typeId.includes(".SUB."))) return true;
  if (patternId && ADD_SUB_PATTERN_RE.test(patternId)) return true;
  if (!prompt) return false;
  return prompt.includes("+") || prompt.includes("-");
};

const parseFirstTwoInts = (text: string) => {
  const matches = text.match(/-?\d+/g) ?? [];
  if (matches.length < 2) return null;
  const left = Number(matches[0]);
  const right = Number(matches[1]);
  if (!Number.isInteger(left) || !Number.isInteger(right)) return null;
  return { left, right };
};

const detectOperator = (typeId?: string, patternId?: string, prompt?: string): "+" | "-" => {
  if (typeId?.includes(".SUB.") || patternId?.startsWith("SUB_")) return "-";
  if (prompt?.includes("-") && !prompt.includes("+")) return "-";
  return "+";
};

const fallbackDigitCount = (value: number) => {
  const abs = Math.abs(value);
  if (abs === 0) return 1;
  return String(abs).length;
};

const buildAbacusAid = (left: number, right: number, operator: "+" | "-"): ElementaryLearningAid => {
  const result = operator === "+" ? left + right : left - right;
  return {
    kind: "abacus",
    title: "おはじきでかんがえよう",
    steps: [
      `はじめに ${left} こ ならべます。`,
      operator === "+"
        ? `${right} こ ふやして、ぜんぶを かぞえます。`
        : `${right} こ とって、のこりを かぞえます。`,
      `つまり、${result} こ です。`
    ],
    conclusion: `つまり、${result} こ です。`,
    visual: {
      mode: "abacus",
      left,
      right,
      result,
      operator
    }
  };
};

const buildColumnAid = (left: number, right: number, operator: "+" | "-"): ElementaryLearningAid => {
  const result = operator === "+" ? left + right : left - right;
  return {
    kind: "column",
    title: "筆算でとこう",
    steps: [
      "くらいをそろえて上下にならべます。",
      operator === "+" ? "1のくらいから順にたします。" : "1のくらいから順にひきます。",
      `つまり、${result} です。`
    ],
    conclusion: `つまり、${result} です。`,
    visual: {
      mode: "column",
      top: left,
      bottom: right,
      result,
      operator
    }
  };
};

const buildSimpleAid = (): ElementaryLearningAid => ({
  kind: "simple",
  title: "とき方のヒント",
  steps: [
    "問題の種類を先に確認します。",
    "1つずつ順番に計算して、途中の数字をメモします。",
    "最後にもう一度たしかめます。"
  ],
  conclusion: "つまり、最後に出た値が答えです。",
  visual: {
    mode: "simple"
  }
});

export const getElementaryLearningAid = ({ gradeId, typeId, patternId, prompt, aDigits, bDigits }: ElementaryAidParams): ElementaryLearningAid | null => {
  if (!isElementaryGrade(gradeId)) return null;

  if (!isAddSub(typeId, patternId, prompt)) {
    return buildSimpleAid();
  }

  const operator = detectOperator(typeId, patternId, prompt);
  const parsed = parseFirstTwoInts(prompt ?? "");
  const left = parsed?.left ?? 0;
  const right = parsed?.right ?? 0;

  const leftDigits = aDigits ?? fallbackDigitCount(left);
  const rightDigits = bDigits ?? fallbackDigitCount(right);
  const isSingleDigitPair = leftDigits <= 1 && rightDigits <= 1;

  if (isSingleDigitPair) {
    return buildAbacusAid(Math.abs(left), Math.abs(right), operator);
  }
  return buildColumnAid(Math.abs(left), Math.abs(right), operator);
};
