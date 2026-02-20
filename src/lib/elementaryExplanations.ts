export type ElementaryAidKind = "abacus" | "column" | "column_story" | "simple";

export type ColumnStoryFrame = {
  title: string;
  top?: string;
  bottom?: string;
  operator?: "+" | "-" | "×" | "÷";
  line?: boolean;
  partial?: string;
  carryMarks?: string;
  borrowMarks?: string;
  focusPlace?: "ones" | "next";
  carryToFromRight?: number;
};

export type ElementaryVisual = {
  mode: "abacus" | "column" | "column_story" | "simple";
  left?: number;
  right?: number;
  result?: number;
  top?: number;
  bottom?: number;
  operator?: "+" | "-" | "×" | "÷";
  frames?: ColumnStoryFrame[];
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

export const isElementaryGrade = (gradeId?: string) => Boolean(gradeId && ELEMENTARY_GRADE_RE.test(gradeId));

const parseFirstTwoNumbers = (text: string) => {
  const matches = text.match(/-?\d+(?:\.\d+)?/g) ?? [];
  if (matches.length < 2) return null;
  const left = Number(matches[0]);
  const right = Number(matches[1]);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return { left, right };
};

const detectOperator = (typeId?: string, patternId?: string, prompt?: string): "+" | "-" | "×" | "÷" => {
  if (typeId?.includes(".SUB.") || patternId?.startsWith("SUB_")) return "-";
  if (typeId?.includes(".MUL.") || patternId?.startsWith("MUL_")) return "×";
  if (typeId?.includes(".DIV.") || patternId?.startsWith("DIV_")) return "÷";
  if (prompt?.includes("-") && !prompt.includes("+")) return "-";
  if (prompt?.includes("×") || prompt?.includes("*") || prompt?.includes("x")) return "×";
  if (prompt?.includes("÷") || prompt?.includes("/")) return "÷";
  return "+";
};

const fallbackDigitCount = (value: number) => {
  const abs = Math.abs(Math.trunc(value));
  if (abs === 0) return 1;
  return String(abs).length;
};

const stripDecimal = (value: number) => {
  const s = value.toFixed(6);
  return s.replace(/\.?0+$/, "");
};

const formatNumber = (value: number) => stripDecimal(value);

const isColumnPattern = (typeId?: string, patternId?: string) => {
  const p = patternId ?? "";
  const t = typeId ?? "";
  if (/^FRAC_/u.test(p) || t.includes(".FRAC.")) return false;
  return (
    /^ADD_/u.test(p) ||
    /^SUB_/u.test(p) ||
    /^MUL_/u.test(p) ||
    /^DIV_/u.test(p) ||
    /^DEC_ADD_/u.test(p) ||
    /^DEC_MUL_/u.test(p) ||
    t.includes(".ADD.") ||
    t.includes(".SUB.") ||
    t.includes(".MUL.") ||
    t.includes(".DIV.") ||
    t.includes(".DEC.")
  );
};

const buildAbacusAid = (left: number, right: number, operator: "+" | "-"): ElementaryLearningAid => {
  const result = operator === "+" ? left + right : left - right;
  return {
    kind: "abacus",
    title: "おはじき",
    steps: [
      `${left} こ`,
      operator === "+" ? `+ ${right} こ` : `- ${right} こ`,
      `= ${result} こ`
    ],
    conclusion: `= ${result}`,
    visual: {
      mode: "abacus",
      left,
      right,
      result,
      operator
    }
  };
};

const buildColumnStoryFrames = (left: number, right: number, operator: "+" | "-" | "×" | "÷") => {
  const absLeft = Math.abs(left);
  const absRight = Math.abs(right);
  const intLeft = Math.trunc(absLeft);
  const intRight = Math.trunc(absRight);
  const dpLeft = (String(absLeft).split(".")[1] ?? "").length;
  const dpRight = (String(absRight).split(".")[1] ?? "").length;
  const decimalPlaces = Math.max(dpLeft, dpRight);

  const result =
    operator === "+"
      ? absLeft + absRight
      : operator === "-"
        ? absLeft - absRight
        : operator === "×"
          ? absLeft * absRight
          : absLeft / (absRight === 0 ? 1 : absRight);

  const formatAligned = (value: number) =>
    decimalPlaces > 0 ? value.toFixed(decimalPlaces) : String(Math.trunc(value));

  const onesCarry = operator === "+" ? ((intLeft % 10) + (intRight % 10) >= 10 ? "↑1" : "") : "";
  const onesBorrow = operator === "-" ? ((intLeft % 10) < (intRight % 10) ? "↓1" : "") : "";

  const frames: ColumnStoryFrame[] = [];

  if (decimalPlaces > 0) {
    frames.push({
      title: "小数点をそろえる",
      top: formatAligned(absLeft),
      bottom: formatAligned(absRight),
      operator,
      line: false
    });
  }

  frames.push({
    title: "そろえる",
    top: formatAligned(absLeft),
    bottom: formatAligned(absRight),
    operator,
    line: false
  });

  if (operator === "+" || operator === "-") {
    const ones = operator === "+" ? (intLeft % 10) + (intRight % 10) : (intLeft % 10) - (intRight % 10);
  frames.push({
    title: "1のくらい",
    top: formatAligned(absLeft),
    bottom: formatAligned(absRight),
    operator,
    line: true,
    partial: String(Math.abs(ones) % 10),
    carryMarks: onesCarry ? "+1" : undefined,
    borrowMarks: onesBorrow || undefined,
    focusPlace: "ones",
    carryToFromRight: onesCarry ? 1 : undefined
  });
  frames.push({
    title: "つぎのくらい",
    top: formatAligned(absLeft),
    bottom: formatAligned(absRight),
    operator,
    line: true,
    partial: formatNumber(result),
    focusPlace: "next"
  });
  } else if (operator === "×") {
    frames.push({
      title: "かける",
      top: formatAligned(absLeft),
      bottom: formatAligned(absRight),
      operator,
      line: true,
      partial: formatNumber(result)
    });
  } else {
    frames.push({
      title: "わる",
      top: formatAligned(absLeft),
      bottom: formatAligned(absRight),
      operator,
      line: true,
      partial: formatNumber(result)
    });
  }

  frames.push({
    title: "答え",
    line: false,
    partial: `答え: ${formatNumber(result)}`
  });

  return { frames: frames.slice(0, 5), result: formatNumber(result) };
};

const buildColumnAid = (left: number, right: number, operator: "+" | "-" | "×" | "÷"): ElementaryLearningAid => {
  const { frames, result } = buildColumnStoryFrames(left, right, operator);
  const first = frames[0];
  return {
    kind: "column_story",
    title: "筆算",
    steps: [],
    conclusion: result,
    visual: {
      mode: "column_story",
      top: first?.top ? Number(first.top) : undefined,
      bottom: first?.bottom ? Number(first.bottom) : undefined,
      operator,
      frames
    }
  };
};

const buildSimpleAid = (): ElementaryLearningAid => ({
  kind: "simple",
  title: "ヒント",
  steps: ["順番に計算", "最後に確認"],
  conclusion: "答えを確認",
  visual: {
    mode: "simple"
  }
});

export const getElementaryLearningAid = ({ gradeId, typeId, patternId, prompt, aDigits, bDigits }: ElementaryAidParams): ElementaryLearningAid | null => {
  if (!isElementaryGrade(gradeId)) return null;

  if (!isColumnPattern(typeId, patternId)) {
    return buildSimpleAid();
  }

  const parsed = parseFirstTwoNumbers(prompt ?? "");
  if (!parsed) return buildSimpleAid();

  const operator = detectOperator(typeId, patternId, prompt);
  const left = parsed.left;
  const right = parsed.right;

  const leftDigits = aDigits ?? fallbackDigitCount(left);
  const rightDigits = bDigits ?? fallbackDigitCount(right);
  const isSingleDigitPair =
    (operator === "+" || operator === "-") &&
    Number.isInteger(left) &&
    Number.isInteger(right) &&
    leftDigits <= 1 &&
    rightDigits <= 1;

  if (isSingleDigitPair) {
    return buildAbacusAid(Math.abs(left), Math.abs(right), operator);
  }
  return buildColumnAid(Math.abs(left), Math.abs(right), operator);
};
