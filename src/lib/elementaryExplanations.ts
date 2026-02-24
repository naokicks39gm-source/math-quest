export type ElementaryAidKind = "abacus" | "column" | "column_story" | "simple";

export type ColumnStoryFrame = {
  title: string;
  top?: string;
  bottom?: string;
  operator?: "+" | "-" | "×" | "÷";
  line?: boolean;
  partial?: string;
  digitAdjustments?: Array<{ offsetFromRight: number; label: "+1" | "-1" | "+10" }>;
  focusPlace?: "ones" | "next";
};

export type ElementaryVisual = {
  mode: "abacus" | "column" | "column_story" | "simple";
  left?: number;
  right?: number;
  result?: number;
  showTenBundle?: boolean;
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
  numberingStyle?: "decimal" | "circled";
  embedAnswerInSteps?: boolean;
  cleanAnswerText?: string;
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
const E1_FOUNDATION_PATTERNS = new Set(["NUM_COMPARE_UP_TO_20", "NUM_DECOMP_10", "NUM_COMP_10"]);

const normalizeAnswerText = (raw: string) =>
  String(raw)
    .replace(/[=＝]/g, " ")
    .replace(/^(こたえ|答え)\s*[は:：]?\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();

const shouldUseCircledNumbering = (gradeId?: string, patternId?: string) =>
  isElementaryGrade(gradeId) && Boolean(patternId) && !E1_FOUNDATION_PATTERNS.has(patternId ?? "");

const getOperationStepText = (operator?: "+" | "-" | "×" | "÷") => {
  if (operator === "+") return "② たす（ふやす）";
  if (operator === "-") return "② ひく（へらす）";
  if (operator === "×") return "② かける";
  if (operator === "÷") return "② わる";
  return "② けいさんする";
};

const applyCircledStyle = (aid: ElementaryLearningAid): ElementaryLearningAid => {
  const answerText = normalizeAnswerText(aid.cleanAnswerText ?? aid.conclusion);
  return {
    ...aid,
    numberingStyle: "circled",
    embedAnswerInSteps: true,
    cleanAnswerText: answerText,
    steps: [
      "① もんだいを みる",
      getOperationStepText(aid.visual?.operator),
      `③ こたえ：${answerText}`
    ]
  };
};

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
  const resultText = formatNumber(result);
  return {
    kind: "abacus",
    title: "おはじき",
    steps: [
      `${left} こ`,
      operator === "+" ? `+ ${right} こ` : `- ${right} こ`,
      `${resultText} こ`
    ],
    conclusion: resultText,
    cleanAnswerText: resultText,
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

  const collectDigitAdjustments = (): Array<{ offsetFromRight: number; label: "+1" | "-1" | "+10" }> => {
    if (operator !== "+" && operator !== "-") return [];
    const scale = 10 ** decimalPlaces;
    const lhs = Math.round(absLeft * scale);
    const rhs = Math.round(absRight * scale);
    const marks: Array<{ offsetFromRight: number; label: "+1" | "-1" | "+10" }> = [];
    const maxLen = Math.max(String(lhs).length, String(rhs).length) + 1;
    let carryOrBorrow = 0;
    for (let place = 0; place < maxLen; place += 1) {
      const base = 10 ** place;
      const d1 = Math.floor(lhs / base) % 10;
      const d2 = Math.floor(rhs / base) % 10;
      if (operator === "+") {
        const sum = d1 + d2 + carryOrBorrow;
        carryOrBorrow = sum >= 10 ? 1 : 0;
        if (carryOrBorrow === 1) {
          marks.push({ offsetFromRight: place + 1, label: "+1" });
        }
      } else {
        const lhsAfterBorrow = d1 - carryOrBorrow;
        if (lhsAfterBorrow < d2) {
          marks.push({ offsetFromRight: place + 1, label: "-1" });
          // Borrowing makes the current place effectively +10 (e.g. 3 -> 13).
          marks.push({ offsetFromRight: place, label: "+10" });
          carryOrBorrow = 1;
        } else {
          carryOrBorrow = 0;
        }
      }
    }
    return marks.sort((a, b) => a.offsetFromRight - b.offsetFromRight);
  };

  const digitAdjustments = collectDigitAdjustments();

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
    const topOnes = intLeft % 10;
    const bottomOnes = intRight % 10;
    const onesTop = operator === "-" && topOnes < bottomOnes ? topOnes + 10 : topOnes;
    const ones =
      operator === "+"
        ? (topOnes + bottomOnes) % 10
        : onesTop - bottomOnes;
    frames.push({
      title: "1のくらい",
      top: formatAligned(absLeft),
      bottom: formatAligned(absRight),
      operator,
      line: true,
      partial: String(ones),
      digitAdjustments,
      focusPlace: "ones"
    });
    frames.push({
      title: "つぎのくらい",
      top: formatAligned(absLeft),
      bottom: formatAligned(absRight),
      operator,
      line: true,
      partial: formatNumber(result),
      digitAdjustments,
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
    cleanAnswerText: normalizeAnswerText(result),
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
  cleanAnswerText: "答えを確認",
  visual: {
    mode: "simple"
  }
});

const buildCompareUpTo20Aid = (left: number, right: number): ElementaryLearningAid => {
  const answer = Math.max(left, right);
  const answerText = formatNumber(answer);
  return {
    kind: "abacus",
    title: "おはじきでくらべる",
    steps: [
      `${left} と ${right} を くらべます`,
      `おおきい ほうを えらびます`
    ],
    conclusion: answerText,
    cleanAnswerText: answerText,
    visual: {
      mode: "abacus",
      left,
      right,
      result: answer
    }
  };
};

const parseTenDecompPrompt = (prompt?: string) => {
  if (!prompt) return null;
  const compact = prompt.replace(/\s+/g, "");
  const m = compact.match(/^10は(\d+)と(?:□|[?？])でできます。?$/u);
  if (!m) return null;
  const known = Number(m[1]);
  if (!Number.isFinite(known)) return null;
  return { total: 10, known };
};

const buildTenDecompAid = (total: number, known: number): ElementaryLearningAid => {
  const answer = total - known;
  const answerText = formatNumber(answer);
  return {
    kind: "abacus",
    title: "おはじきで10のぶんかい",
    steps: [
      `${total} は ${known} と もう1つ で できます`,
      `${total} から ${known} を ひきます`
    ],
    conclusion: answerText,
    cleanAnswerText: answerText,
    visual: {
      mode: "abacus",
      left: known,
      right: answer,
      result: total,
      operator: "+"
    }
  };
};

const buildNumComp10Aid = (left: number, right: number): ElementaryLearningAid => {
  const result = left + right;
  const resultText = formatNumber(result);
  return {
    kind: "abacus",
    title: "おはじきで10のごうせい",
    steps: [
      `${left} こと ${right} こを あわせます`,
      `${result} こは 10のまとまりで みます`
    ],
    conclusion: resultText,
    cleanAnswerText: resultText,
    visual: {
      mode: "abacus",
      left,
      right,
      result,
      operator: "+",
      showTenBundle: true
    }
  };
};

export const getElementaryLearningAid = ({ gradeId, typeId, patternId, prompt, aDigits, bDigits }: ElementaryAidParams): ElementaryLearningAid | null => {
  if (!isElementaryGrade(gradeId)) return null;
  const finalize = (aid: ElementaryLearningAid) =>
    shouldUseCircledNumbering(gradeId, patternId) ? applyCircledStyle(aid) : aid;

  if (patternId === "NUM_COMPARE_UP_TO_20") {
    const parsed = parseFirstTwoNumbers(prompt ?? "");
    if (!parsed) return finalize(buildSimpleAid());
    return finalize(buildCompareUpTo20Aid(parsed.left, parsed.right));
  }

  if (patternId === "NUM_DECOMP_10") {
    const parsed = parseTenDecompPrompt(prompt);
    if (!parsed) return finalize(buildSimpleAid());
    return finalize(buildTenDecompAid(parsed.total, parsed.known));
  }

  if (patternId === "NUM_COMP_10") {
    const parsed = parseFirstTwoNumbers(prompt ?? "");
    if (!parsed) return finalize(buildSimpleAid());
    return finalize(buildNumComp10Aid(parsed.left, parsed.right));
  }

  if (!isColumnPattern(typeId, patternId)) {
    return finalize(buildSimpleAid());
  }

  const parsed = parseFirstTwoNumbers(prompt ?? "");
  if (!parsed) return finalize(buildSimpleAid());

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
    return finalize(buildAbacusAid(Math.abs(left), Math.abs(right), operator));
  }
  return finalize(buildColumnAid(Math.abs(left), Math.abs(right), operator));
};
