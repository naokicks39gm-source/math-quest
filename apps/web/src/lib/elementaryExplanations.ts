export type ElementaryAidKind = "abacus" | "column" | "column_story" | "simple";

export type ColumnStoryFrame = {
  title: string;
  top?: string;
  bottom?: string;
  operator?: "+" | "-" | "×" | "÷";
  line?: boolean;
  partial?: string;
  digitAdjustments?: Array<{ offsetFromRight: number; label: "+1" | "-1" | "+10" }>;
  focusPlace?: "ones" | "tens" | "hundreds";
};

export type ElementaryVisual = {
  mode: "abacus" | "column" | "column_story" | "simple";
  left?: number;
  right?: number;
  result?: number;
  groupSize?: number;
  groupedTotal?: number;
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
  useBulletList?: boolean;
  leadText?: string;
  tableRows?: Array<{ expr: string; goro: string }>;
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
const E2_DAN_PATTERN_RE = /^MUL_1D_1D_DAN_([1-9])$/;

const E2_DAN_GORO: Record<number, string[]> = {
  1: [
    "1×1＝1　いんいちがいち",
    "1×2＝2　いんにがに",
    "1×3＝3　いんさんがさん",
    "1×4＝4　いんしがよん",
    "1×5＝5　いんごがご",
    "1×6＝6　いんろくがろく",
    "1×7＝7　いんしちがなな",
    "1×8＝8　いんはちがはち",
    "1×9＝9　いんくがきゅう"
  ],
  2: [
    "2×1＝2　にいちがに",
    "2×2＝4　ににんがし",
    "2×3＝6　にさんがろく",
    "2×4＝8　にしがはち",
    "2×5＝10　にごじゅう",
    "2×6＝12　にろくじゅうに",
    "2×7＝14　にしちじゅうし",
    "2×8＝16　にはちじゅうろく",
    "2×9＝18　にくじゅうはち"
  ],
  3: [
    "3×1＝3　さんいちがさん",
    "3×2＝6　さんにがろく",
    "3×3＝9　さんざんがきゅう",
    "3×4＝12　さんしじゅうに",
    "3×5＝15　さんごじゅうご",
    "3×6＝18　さぶろくじゅうはち",
    "3×7＝21　さんしちにじゅういち",
    "3×8＝24　さんぱにじゅうし",
    "3×9＝27　さんくにじゅうしち"
  ],
  4: [
    "4×1＝4　しいちがし",
    "4×2＝8　しにがはち",
    "4×3＝12　しさんじゅうに",
    "4×4＝16　ししじゅうろく",
    "4×5＝20　しごにじゅう",
    "4×6＝24　しろくにじゅうし",
    "4×7＝28　ししちにじゅうはち",
    "4×8＝32　しはさんじゅうに",
    "4×9＝36　しくさんじゅうろく"
  ],
  5: [
    "5×1＝5　ごいちがご",
    "5×2＝10　ごにじゅう",
    "5×3＝15　ごさんじゅうご",
    "5×4＝20　ごしにじゅう",
    "5×5＝25　ごごにじゅうご",
    "5×6＝30　ごろくさんじゅう",
    "5×7＝35　ごしちさんじゅうご",
    "5×8＝40　ごはしじゅう",
    "5×9＝45　ごっくしじゅうご"
  ],
  6: [
    "6×1＝6　ろくいちがろく",
    "6×2＝12　ろくにじゅうに",
    "6×3＝18　ろくさんじゅうはち",
    "6×4＝24　ろくしにじゅうよん",
    "6×5＝30　ろくごさんじゅう",
    "6×6＝36　ろくろくさんじゅうろく",
    "6×7＝42　ろくしちしじゅうに",
    "6×8＝48　ろくはしじゅうはち",
    "6×9＝54　ろっくごじゅうし"
  ],
  7: [
    "7×1＝7　しちいちがしち",
    "7×2＝14　しちにじゅうし",
    "7×3＝21　しちさんにじゅういち",
    "7×4＝28　しちしにじゅうはち",
    "7×5＝35　しちごさんじゅうご",
    "7×6＝42　しちろくしじゅうに",
    "7×7＝49　しちしちしじゅうく",
    "7×8＝56　しちはちごじゅうろく",
    "7×9＝63　しちくろくじゅうさん"
  ],
  8: [
    "8×1＝8　はちいちがはち",
    "8×2＝16　はちにじゅうろく",
    "8×3＝24　はちさんにじゅうし",
    "8×4＝32　はちしさんじゅうに",
    "8×5＝40　はちごしじゅう",
    "8×6＝48　はちろくしじゅうはち",
    "8×7＝56　はちしちごじゅうろく",
    "8×8＝64　はっぱろくじゅうし",
    "8×9＝72　はっくしちじゅうに"
  ],
  9: [
    "9×1＝9　くいちがく",
    "9×2＝18　くにじゅうはち",
    "9×3＝27　くさんにじゅうしち",
    "9×4＝36　くしさんじゅうろく",
    "9×5＝45　くごしじゅうご",
    "9×6＝54　くろくごじゅうし",
    "9×7＝63　くしちろくじゅうさん",
    "9×8＝72　くはしちじゅうに",
    "9×9＝81　くくはちじゅういち"
  ]
};

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
  const maxIntDigits = Math.max(String(intLeft).length, String(intRight).length, String(Math.trunc(Math.abs(result))).length);
  const subtractionBorrowPlaces = new Set<number>();
  if (operator === "-") {
    const scale = 10 ** decimalPlaces;
    const lhs = Math.round(absLeft * scale);
    const rhs = Math.round(absRight * scale);
    const maxLen = Math.max(String(lhs).length, String(rhs).length) + 1;
    let borrow = 0;
    for (let place = 0; place < maxLen; place += 1) {
      const base = 10 ** place;
      const d1 = Math.floor(lhs / base) % 10;
      const d2 = Math.floor(rhs / base) % 10;
      const lhsAfterBorrow = d1 - borrow;
      if (lhsAfterBorrow < d2) {
        subtractionBorrowPlaces.add(place);
        borrow = 1;
      } else {
        borrow = 0;
      }
    }
  }

  const selectFrameAdjustments = (place: "ones" | "tens" | "hundreds") => {
    if (operator === "+") {
      const carryTargetOffset = place === "ones" ? 1 : place === "tens" ? 2 : 3;
      // Show only the carry that impacts the current frame:
      // ones frame -> +1 on tens, tens frame -> +1 on hundreds.
      return digitAdjustments.filter((adj) => adj.label === "+1" && adj.offsetFromRight === carryTargetOffset);
    }
    if (operator === "-") {
      const currentPlace = place === "ones" ? 0 : place === "tens" ? 1 : 2;
      const frameMarks: Array<{ offsetFromRight: number; label: "+1" | "-1" | "+10" }> = [];

      // If the previous place borrowed, current place has already become -1.
      if (currentPlace > 0 && subtractionBorrowPlaces.has(currentPlace - 1)) {
        frameMarks.push({ offsetFromRight: currentPlace, label: "-1" });
      }
      // Borrow that happens while solving the current place.
      if (subtractionBorrowPlaces.has(currentPlace)) {
        frameMarks.push({ offsetFromRight: currentPlace + 1, label: "-1" });
        frameMarks.push({ offsetFromRight: currentPlace, label: "+10" });
      }
      return frameMarks;
    }
    return digitAdjustments;
  };

  const buildPartialByPlace = (place: 0 | 1 | 2) => {
    const absResult = Math.abs(Math.trunc(result));
    const mod = 10 ** (place + 1);
    const part = absResult % mod;
    if (place === 0) return String(part);
    return String(part).padStart(place + 1, "0");
  };

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
      digitAdjustments: selectFrameAdjustments("ones"),
      focusPlace: "ones"
    });
    if (maxIntDigits >= 3 && decimalPlaces === 0) {
      frames.push({
        title: "10のくらい",
        top: formatAligned(absLeft),
        bottom: formatAligned(absRight),
        operator,
        line: true,
        partial: buildPartialByPlace(1),
        digitAdjustments: selectFrameAdjustments("tens"),
        focusPlace: "tens"
      });
      frames.push({
        title: "100のくらい",
        top: formatAligned(absLeft),
        bottom: formatAligned(absRight),
        operator,
        line: true,
        partial: formatNumber(result),
        digitAdjustments: selectFrameAdjustments("hundreds"),
        focusPlace: "hundreds"
      });
    } else {
      frames.push({
        title: "10のくらい",
        top: formatAligned(absLeft),
        bottom: formatAligned(absRight),
        operator,
        line: true,
        partial: formatNumber(result),
        digitAdjustments: selectFrameAdjustments("tens"),
        focusPlace: "tens"
      });
    }
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

const buildEqualShareAbacusAid = (total: number, people: number): ElementaryLearningAid => {
  if (people <= 0) return buildSimpleAid();
  const each = total / people;
  const answerText = formatNumber(each);
  return {
    kind: "abacus",
    title: "おはじきでわける",
    steps: [],
    leadText: `${total}こ${people}人にわける`,
    conclusion: answerText,
    cleanAnswerText: answerText,
    visual: {
      mode: "abacus",
      left: total,
      right: people,
      result: each,
      groupSize: people,
      groupedTotal: total,
      operator: "÷"
    }
  };
};

const getDanFromPattern = (patternId?: string) => {
  const match = (patternId ?? "").match(E2_DAN_PATTERN_RE);
  return match ? Number(match[1]) : null;
};

const isE2Mul99Type = (typeId?: string, patternId?: string) => {
  if (!typeId?.startsWith("E2.NA.MUL.MUL_1D_1D_")) return false;
  if (!patternId) return false;
  return /^MUL_1D_1D_(DAN_[1-9]|MIX_1_3|MIX_4_6|MIX_7_9|MIX_1_9)$/u.test(patternId);
};

const resolveDanFromPrompt = (prompt?: string) => {
  const parsed = parseFirstTwoNumbers(prompt ?? "");
  if (!parsed) return null;
  if (parsed.left >= 1 && parsed.left <= 9) return parsed.left;
  if (parsed.right >= 1 && parsed.right <= 9) return parsed.right;
  return null;
};

const parseDanGoroLine = (line: string) => {
  const parts = line.trim().split(/\s+/u);
  const expr = parts.shift() ?? "";
  const goro = parts.join(" ");
  return { expr, goro };
};

const buildE2DanGoroAid = (dan: number, prompt?: string): ElementaryLearningAid => {
  const lines = E2_DAN_GORO[dan] ?? [];
  const tableRows = lines.map((line) => parseDanGoroLine(line));
  const parsed = parseFirstTwoNumbers(prompt ?? "");
  const currentIndex =
    parsed && parsed.left === dan && parsed.right >= 1 && parsed.right <= 9
      ? parsed.right - 1
      : null;
  const currentRow = currentIndex !== null ? tableRows[currentIndex] : null;
  const leadText =
    currentRow && currentRow.expr
      ? `いまの もんだい: ${currentRow.expr}${currentRow.goro ? ` ${currentRow.goro}` : ""}`
      : undefined;
  return {
    kind: "simple",
    title: `${dan}のだん ごろあわせ`,
    steps: [],
    leadText,
    tableRows,
    conclusion: "こえに だして おぼえよう",
    cleanAnswerText: "こえに だして おぼえよう",
    embedAnswerInSteps: true,
    visual: {
      mode: "simple"
    }
  };
};

export const getElementaryLearningAid = ({ gradeId, typeId, patternId, prompt, aDigits, bDigits }: ElementaryAidParams): ElementaryLearningAid | null => {
  if (!isElementaryGrade(gradeId)) return null;
  const finalize = (aid: ElementaryLearningAid) =>
    shouldUseCircledNumbering(gradeId, patternId) ? applyCircledStyle(aid) : aid;

  const dan = getDanFromPattern(patternId) ?? resolveDanFromPrompt(prompt);
  if (gradeId === "E2" && dan !== null && isE2Mul99Type(typeId, patternId)) {
    return buildE2DanGoroAid(dan, prompt);
  }

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

  if (patternId === "DIV_EQUAL_SHARE_BASIC") {
    const parsed = parseFirstTwoNumbers(prompt ?? "");
    if (!parsed) return buildSimpleAid();
    // Keep E2-22 explanation in custom visual mode without circled-step conversion.
    return buildEqualShareAbacusAid(Math.abs(parsed.left), Math.abs(parsed.right));
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
