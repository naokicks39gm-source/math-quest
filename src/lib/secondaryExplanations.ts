export type ExplanationTable = {
  headers: string[];
  rows: string[][];
};

export type ExplanationContent = {
  title: string;
  point: string;
  steps: string[];
  table: ExplanationTable;
  diagramLines: string[];
  conclusion: string;
};

export type SecondaryLearningAid = {
  hint: string;
  hintLines?: { kind: "text" | "tex"; value: string }[];
  explanation: ExplanationContent;
};

type AidParams = {
  gradeId?: string;
  typeId?: string;
  patternId?: string;
  answer?: string;
};

const SECONDARY_GRADE_RE = /^(J[1-3]|H[1-3])$/;

const toMathName = (patternId: string) => {
  if (patternId.startsWith("INT_")) return "正負の数";
  if (patternId.startsWith("FACTOR_") || patternId === "EXPAND" || patternId === "EXP_RULES") return "式の計算";
  if (patternId === "POW_INT") return "指数";
  if (patternId === "SQRT_VAL") return "平方根";
  if (patternId === "LIN_EQ" || patternId === "LIN_INEQ" || patternId === "SYS_EQ" || patternId === "QUAD_ROOTS") return "方程式";
  if (patternId === "LIN_FUNC_PARAMS" || patternId === "QUAD_VERTEX" || patternId === "ARITH_SEQ" || patternId === "GEOM_SEQ") return "関数・数列";
  if (patternId.startsWith("TRIG_")) return "三角比";
  if (patternId.startsWith("DIFF_") || patternId === "DEF_INT") return "微分積分";
  if (patternId.startsWith("DOT_") || patternId.startsWith("CROSS_")) return "ベクトル";
  if (patternId === "LOG_VAL") return "対数";
  if (patternId === "MEAN" || patternId === "DICE_PROB" || patternId === "CARD_PROB" || patternId === "COMB") return "確率・データ";
  if (patternId === "POLY_ANGLE_SUM" || patternId === "CIRCLE") return "図形";
  return "数学";
};

const toHint = (patternId: string) => {
  const name = toMathName(patternId);
  if (patternId === "SYS_EQ") return "ヒント: 1つの文字を消去して、1文字の式にしてから解くと速いです。";
  if (patternId === "QUAD_ROOTS") return "ヒント: 因数分解できる形を先に探し、できなければ公式を使います。";
  if (patternId.startsWith("TRIG_")) return "ヒント: まず単位円または三角比の基本値を思い出してから式に代入します。";
  if (patternId.startsWith("DIFF_") || patternId === "DEF_INT") return "ヒント: 公式を1つ決めて、どの項に適用するかを順に確認します。";
  if (patternId === "LOG_VAL") return "ヒント: 対数を指数の形に直すと見通しがよくなります。";
  return `ヒント: ${name}は「形を見分ける → 公式を選ぶ → 代入して整理」の順で解くと安定します。`;
};

const buildConclusion = (answer?: string) => {
  if (!answer || answer.trim() === "") {
    return "つまり、表と手順どおりに計算した値が答えです。";
  }
  return `つまり、答えは ${answer} です。`;
};

const buildGenericExplanation = (patternId: string, answer?: string): ExplanationContent => {
  const name = toMathName(patternId);
  return {
    title: `${name}の解き方（${patternId}）`,
    point: "形を見分けて、1つの公式で最後まで計算します。",
    steps: [
      "形を判定して、使う公式を1つ決める。",
      "表の順に代入・計算して答えを出す。",
      "条件に合うかを最後に1回確認する。"
    ],
    table: {
      headers: ["入力", "操作", "出力（答え）"],
      rows: [
        ["問題の値・条件", "公式を選んで式に入れる", "途中式"],
        ["途中式", "符号・順序を守って計算", "計算結果"],
        ["計算結果", "条件に当てはめて確認", answer && answer.trim() !== "" ? answer : "最終答え"]
      ]
    },
    diagramLines: [
      "[問題] -> [公式を選ぶ] -> [計算] -> [答え]",
      "  条件確認 ----------------------------^"
    ],
    conclusion: buildConclusion(answer)
  };
};

const PATTERN_IDS = [
  "ARITH_SEQ",
  "CARD_PROB",
  "CIRCLE",
  "COMB",
  "CROSS_2D_MAG",
  "DEF_INT",
  "DICE_PROB",
  "DIFF_EXP",
  "DIFF_POLY",
  "DIFF_TRIG",
  "DOT_2D",
  "EXPAND",
  "EXP_RULES",
  "FACTOR_DIFF_SQ",
  "FACTOR_GCF",
  "FACTOR_PERF_SQ",
  "FACTOR_TRINOM",
  "GEOM_SEQ",
  "INT_ADD",
  "INT_DIV",
  "INT_MUL",
  "INT_SUB",
  "LIN_EQ",
  "LIN_FUNC_PARAMS",
  "LIN_INEQ",
  "LOG_VAL",
  "MEAN",
  "POLY_ANGLE_SUM",
  "POW_INT",
  "QUAD_ROOTS",
  "QUAD_VERTEX",
  "SQRT_VAL",
  "SYS_EQ",
  "TRIG_BASIC",
  "TRIG_EQ",
  "TRIG_ID"
] as const;

const AID_BY_PATTERN = new Map<string, SecondaryLearningAid>(
  PATTERN_IDS.map((patternId) => [
    patternId,
    {
      hint: toHint(patternId),
      explanation: buildGenericExplanation(patternId)
    }
  ])
);

export const isSecondaryGrade = (gradeId: string) => SECONDARY_GRADE_RE.test(gradeId);

const getGradeIdFromTypeId = (typeId?: string) => {
  if (!typeId) return "";
  return typeId.split(".")[0] ?? "";
};

export const getSecondaryLearningAid = ({ gradeId, typeId, patternId, answer }: AidParams): SecondaryLearningAid | null => {
  const resolvedGrade = gradeId || getGradeIdFromTypeId(typeId);
  if (!resolvedGrade || !isSecondaryGrade(resolvedGrade)) return null;
  const intAddSignRulesLines: SecondaryLearningAid["hintLines"] = [
    { kind: "text", value: "符号のルール" },
    { kind: "tex", value: String.raw`+\left(+\right)\to +` },
    { kind: "tex", value: String.raw`+\left(-\right)\to -` },
    { kind: "tex", value: String.raw`-\left(+\right)\to -` },
    { kind: "tex", value: String.raw`-\left(-\right)\to -` }
  ];
  const intAddSignRulesHint = intAddSignRulesLines.map((line) => line.value).join("\n");
  const resolveHint = (pid: string) =>
    typeId === "J1.AL.INT.INT_ADD" && pid === "INT_ADD" ? intAddSignRulesHint : toHint(pid);
  const resolveHintLines = (pid: string) =>
    typeId === "J1.AL.INT.INT_ADD" && pid === "INT_ADD" ? intAddSignRulesLines : undefined;

  if (patternId && AID_BY_PATTERN.has(patternId)) {
    const aid = AID_BY_PATTERN.get(patternId);
    if (!aid) return null;
    return {
      ...aid,
      hint: resolveHint(patternId),
      hintLines: resolveHintLines(patternId),
      explanation: buildGenericExplanation(patternId, answer)
    };
  }

  if (patternId) {
    return {
      hint: resolveHint(patternId),
      hintLines: resolveHintLines(patternId),
      explanation: buildGenericExplanation(patternId, answer)
    };
  }

  const fallbackPatternId = typeId?.split(".").slice(-1)[0] ?? "GENERIC";
  return {
    hint: toHint(fallbackPatternId),
    explanation: buildGenericExplanation(fallbackPatternId, answer)
  };
};

export const getSecondaryPatternIds = () => [...PATTERN_IDS];
