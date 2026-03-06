export type ExplanationTable = {
  headers: string[];
  rows: string[][];
};

export type ExplanationContent = {
  title: string;
  point: string;
  derivationLines: { kind: "tex" | "text"; value: string; highlights?: string[] }[];
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
  prompt?: string;
  promptTex?: string;
};

const SECONDARY_GRADE_RE = /^(J[1-3]|H[1-3])$/;

const toMathName = (patternId: string) => {
  if (patternId.startsWith("INT_")) return "正負の数";
  if (patternId.startsWith("FACTOR_") || patternId === "EXPAND" || patternId.startsWith("EXPAND_") || patternId === "EXP_RULES" || patternId.startsWith("EXP_RULES_")) return "式の計算";
  if (patternId === "POW_INT") return "指数";
  if (patternId === "SQRT_VAL") return "平方根";
  if (patternId === "LIN_EQ" || patternId === "LIN_INEQ" || patternId === "SYS_EQ" || patternId === "QUAD_ROOTS" || patternId.startsWith("QUAD_ROOTS_")) return "方程式";
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
  if (patternId === "QUAD_ROOTS" || patternId.startsWith("QUAD_ROOTS_")) return "ヒント: 因数分解できる形を先に探し、できなければ公式を使います。";
  if (patternId.startsWith("TRIG_")) return "ヒント: まず単位円または三角比の基本値を思い出してから式に代入します。";
  if (patternId.startsWith("DIFF_") || patternId === "DEF_INT") return "ヒント: 公式を1つ決めて、どの項に適用するかを順に確認します。";
  if (patternId === "LOG_VAL") return "ヒント: 対数を指数の形に直すと見通しがよくなります。";
  return `ヒント: ${name}は「形を見分ける → 公式を選ぶ → 代入して整理」の順で解くと安定します。`;
};

const buildConclusion = (answer?: string) => {
  return answer?.trim() ?? "";
};

const toTexSafe = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\u00d7/g, String.raw`\times`)
    .replace(/\u00f7/g, String.raw`\div`)
    .replace(/\u2212/g, "-");

const stripPromptTail = (value: string) =>
  value
    .replace(/を計算しなさい。?$/u, "")
    .replace(/を解きなさい。?$/u, "")
    .replace(/を求めなさい。?$/u, "")
    .replace(/\s*[=＝]\s*$/u, "")
    .trim();

const parseSignedBinaryExpression = (value: string) => {
  const normalized = value.replace(/[（]/g, "(").replace(/[）]/g, ")").replace(/\s+/g, "");
  const paren = normalized.match(/^\(([+-]?\d+)\)([+\-*/×÷])\(([+-]?\d+)\)$/u);
  if (paren) {
    return {
      a: Number(paren[1]),
      op: paren[2],
      b: Number(paren[3])
    };
  }
  const plain = normalized.match(/^([+-]?\d+)([+\-*/×÷])([+-]?\d+)$/u);
  if (plain) {
    return {
      a: Number(plain[1]),
      op: plain[2],
      b: Number(plain[3])
    };
  }
  return null;
};

const formatSigned = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const formatSignedParenTex = (n: number) => String.raw`\left(${formatSigned(n)}\right)`;

const buildIntDerivationLines = (baseExpression: string, answerText: string) => {
  const parsed = parseSignedBinaryExpression(baseExpression);
  if (!parsed) {
    return [
      { kind: "tex" as const, value: toTexSafe(baseExpression) },
      { kind: "tex" as const, value: String.raw`=${answerText}` }
    ];
  }
  const op = parsed.op === "×" ? "\\times" : parsed.op === "÷" ? "\\div" : parsed.op;
  const first = `${formatSignedParenTex(parsed.a)}${op}${formatSignedParenTex(parsed.b)}`;
  const result = parsed.a + parsed.b;
  if (parsed.op === "+") {
    const secondOp = parsed.b >= 0 ? "+" : "-";
    const second = `${parsed.a}${secondOp}${Math.abs(parsed.b)}`;
    return [
      { kind: "tex" as const, value: first },
      { kind: "tex" as const, value: `=${second}` },
      { kind: "tex" as const, value: `=${result}` }
    ];
  }
  if (parsed.op === "-") {
    const converted = -parsed.b;
    const secondOp = converted >= 0 ? "+" : "-";
    const second = `${parsed.a}${secondOp}${Math.abs(converted)}`;
    return [
      { kind: "tex" as const, value: first },
      { kind: "tex" as const, value: `=${second}` },
      { kind: "tex" as const, value: `=${parsed.a - parsed.b}` }
    ];
  }
  if (parsed.op === "*" || parsed.op === "×") {
    return [
      { kind: "tex" as const, value: first },
      { kind: "tex" as const, value: `=${parsed.a}\\times${parsed.b}` },
      { kind: "tex" as const, value: `=${parsed.a * parsed.b}` }
    ];
  }
  if (parsed.op === "/" || parsed.op === "÷") {
    return [
      { kind: "tex" as const, value: first },
      { kind: "tex" as const, value: `=${parsed.a}\\div${parsed.b}` },
      { kind: "tex" as const, value: `=${answerText}` }
    ];
  }
  return [
    { kind: "tex" as const, value: first },
    { kind: "tex" as const, value: String.raw`=${answerText}` }
  ];
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const tokenizeForHighlight = (tex: string) =>
  tex
    .replace(/\\text\{[^{}]*\}/g, "")
    .match(/-?\d+(?:\.\d+)?/g) ?? [];

const diffTokens = (prev: string, next: string) => {
  const prevTokens = tokenizeForHighlight(prev);
  const nextTokens = tokenizeForHighlight(next);
  const prevSet = new Set(prevTokens);
  return nextTokens.filter((token) => !prevSet.has(token));
};

const applyHighlight = (tex: string, tokens: string[]) => {
  const unique = [...new Set(tokens.map((t) => t.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  let out = tex;
  for (const token of unique) {
    const pattern = new RegExp(String.raw`(?<!\\)\b${escapeRegExp(token)}\b`);
    out = out.replace(pattern, String.raw`\color{#2563eb}{${token}}`);
  }
  return out;
};

const addHighlightsToLines = (lines: { kind: "tex" | "text"; value: string }[]) => {
  const result: { kind: "tex" | "text"; value: string; highlights?: string[] }[] = [];
  let prevTex = "";
  for (const line of lines) {
    if (line.kind !== "tex") {
      result.push(line);
      continue;
    }
    const changedTokens = prevTex ? diffTokens(prevTex, line.value) : [];
    const numericTokens = tokenizeForHighlight(line.value);
    const fallbackToken = numericTokens.length > 0 ? numericTokens[numericTokens.length - 1] ?? "" : "";
    const highlightTokens = changedTokens.length > 0 ? changedTokens : fallbackToken ? [fallbackToken] : [];
    const highlighted = highlightTokens.length > 0 ? applyHighlight(line.value, highlightTokens) : line.value;
    result.push({ ...line, value: highlighted, highlights: highlightTokens });
    prevTex = line.value;
  }
  return result;
};

const buildDerivationLines = (
  patternId: string,
  prompt?: string,
  promptTex?: string,
  answer?: string
): { kind: "tex" | "text"; value: string; highlights?: string[] }[] => {
  const baseExpression = stripPromptTail(promptTex?.trim() || prompt?.trim() || "");
  const base = baseExpression ? toTexSafe(baseExpression) : String.raw`\text{問題の式}`;
  const answerText = answer?.trim() ? toTexSafe(answer.trim()) : String.raw`\text{答え}`;

  let lines: { kind: "tex" | "text"; value: string }[];
  if (patternId.startsWith("INT_")) {
    lines = buildIntDerivationLines(baseExpression || base, answerText);
  } else if (patternId === "LIN_EQ" || patternId === "LIN_INEQ") {
    lines = [
      { kind: "tex", value: base },
      { kind: "tex", value: String.raw`\text{同類項をまとめる}` },
      { kind: "tex", value: String.raw`\text{文字を片側、数を反対側に移項}` },
      { kind: "tex", value: String.raw`\text{係数で割って整理}` },
      { kind: "tex", value: String.raw`\text{解}=${answerText}` }
    ];
  } else if (patternId === "SYS_EQ") {
    lines = [
      { kind: "tex", value: base },
      { kind: "tex", value: String.raw`\text{加減法または代入法で1文字にする}` },
      { kind: "tex", value: String.raw`\text{求めた値を元の式に代入}` },
      { kind: "tex", value: String.raw`\text{2つの値をそろえて確認}` },
      { kind: "tex", value: String.raw`\text{解}=${answerText}` }
    ];
  } else if (patternId === "QUAD_ROOTS" || patternId.startsWith("QUAD_ROOTS_")) {
    lines = [
      { kind: "tex", value: base },
      { kind: "tex", value: String.raw`\text{0になる形に整理}` },
      { kind: "tex", value: String.raw`\text{因数分解または解の公式を使う}` },
      { kind: "tex", value: String.raw`\text{2つの解を確認}` },
      { kind: "tex", value: String.raw`\text{解}=${answerText}` }
    ];
  } else if (patternId.startsWith("FACTOR_") || patternId === "EXPAND" || patternId.startsWith("EXPAND_") || patternId === "EXP_RULES" || patternId.startsWith("EXP_RULES_")) {
    lines = [
      { kind: "tex", value: base },
      { kind: "tex", value: String.raw`\text{公式に当てはめる形へ整理}` },
      { kind: "tex", value: String.raw`\text{分配法則・公式で展開/因数分解}` },
      { kind: "tex", value: String.raw`\text{同類項をまとめる}` },
      { kind: "tex", value: String.raw`=${answerText}` }
    ];
  } else if (patternId === "POW_INT" || patternId === "SQRT_VAL" || patternId === "LOG_VAL") {
    lines = [
      { kind: "tex", value: base },
      { kind: "tex", value: String.raw`\text{指数・根号・対数の基本公式を確認}` },
      { kind: "tex", value: String.raw`\text{式を同じ底・同じ次数でそろえる}` },
      { kind: "tex", value: String.raw`\text{計算して整理}` },
      { kind: "tex", value: String.raw`=${answerText}` }
    ];
  } else if (patternId.startsWith("TRIG_") || patternId.startsWith("DIFF_") || patternId === "DEF_INT") {
    lines = [
      { kind: "tex", value: base },
      { kind: "tex", value: String.raw`\text{使う公式を1つ決める}` },
      { kind: "tex", value: String.raw`\text{代入して順に計算}` },
      { kind: "tex", value: String.raw`\text{定義域・条件を確認}` },
      { kind: "tex", value: String.raw`=${answerText}` }
    ];
  } else {
    lines = [
      { kind: "tex", value: base },
      { kind: "tex", value: String.raw`\text{条件を整理して計算式にする}` },
      { kind: "tex", value: String.raw`\text{順に計算して答えを出す}` },
      { kind: "tex", value: String.raw`=${answerText}` }
    ];
  }

  const normalized = lines.filter((line) => line.value.trim() !== "");
  if (normalized.length >= 2) return addHighlightsToLines(normalized);
  return addHighlightsToLines([
    { kind: "tex", value: base },
    { kind: "tex", value: String.raw`=${answerText}` }
  ]);
};

const buildGenericExplanation = (
  patternId: string,
  answer?: string,
  options?: { prompt?: string; promptTex?: string; typeId?: string }
): ExplanationContent => {
  const name = toMathName(patternId);
  return {
    title: `${name}の解き方（${patternId}）`,
    point: "",
    derivationLines: buildDerivationLines(patternId, options?.prompt, options?.promptTex, answer),
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

const normalizeJ1PromptKey = (value?: string) =>
  String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/[{}]/g, "")
    .trim();

const buildJ1TemplateHintLines = (typeId?: string, prompt?: string): SecondaryLearningAid["hintLines"] | undefined => {
  const key = normalizeJ1PromptKey(prompt);
  if (typeId === "J1.AL.INT.INT_ADD") {
    return [
      { kind: "text", value: "1. 符号を見る" },
      { kind: "text", value: "2. 符号ルールを決める" },
      { kind: "text", value: "3. 符号を決めてから数を計算" }
    ];
  }
  if (typeId === "J1.AL.INT.INT_SUB") {
    return [
      { kind: "text", value: "1. 引き算を足し算に直せるか見る" },
      { kind: "text", value: "2. 符号を決める" },
      { kind: "text", value: "3. 数を計算する" }
    ];
  }
  if (typeId === "J1.AL.INT.INT_MUL") {
    return [
      { kind: "text", value: "1. 符号を確認" },
      { kind: "text", value: "2. 数だけ計算" },
      { kind: "text", value: "3. 最後に符号を付ける" }
    ];
  }
  if (typeId === "J1.AL.INT.INT_DIV") {
    return [
      { kind: "text", value: "1. 符号を確認" },
      { kind: "text", value: "2. 割り算をする" },
      { kind: "text", value: "3. 必要なら逆数を使う" }
    ];
  }
  if (typeId === "J1.AL.POW.POW_INT") {
    if (key === "-4^2=") {
      return [
        { kind: "text", value: "1. 指数の部分を先に計算" },
        { kind: "text", value: "2. 最後に前のマイナスを付ける" }
      ];
    }
    return [
      { kind: "text", value: "1. 同じ数を指数の回数だけかける" },
      { kind: "text", value: "2. 括弧があるかを確認する" }
    ];
  }
  if (typeId === "J1.AL.EXP.FACTOR_GCF") {
    return [
      { kind: "text", value: "x の項をまとめる" },
      { kind: "text", value: "y の項をまとめる" },
      { kind: "text", value: "z の項をまとめる" }
    ];
  }
  if (typeId === "J1.AL.EXP.FACTOR_TRINOM" || typeId === "J1.AL.EXP.EXPAND") {
    return [
      { kind: "text", value: "1. 分配" },
      { kind: "text", value: "2. 同類項" }
    ];
  }
  if (typeId === "J1.EQ.LIN.LIN_EQ") {
    return [
      { kind: "text", value: "1. 分配があれば先に外す" },
      { kind: "text", value: "2. 数を移項する" },
      { kind: "text", value: "3. 係数で割る" }
    ];
  }
  if (typeId === "J1.FN.LIN.LIN_FUNC_PARAMS") {
    return [
      { kind: "text", value: "1. 傾きは x の前の数" },
      { kind: "text", value: "2. 切片は定数項" },
      { kind: "text", value: "3. 点があれば代入して b を求める" }
    ];
  }
  return undefined;
};

const buildJ1TemplateHint = (typeId?: string, prompt?: string, fallback?: string) => {
  const lines = buildJ1TemplateHintLines(typeId, prompt);
  if (!lines) return fallback ?? "";
  return lines.map((line) => line.value).join("\n");
};

const buildJ1TemplateDerivationLines = (typeId?: string, prompt?: string, answer?: string) => {
  const key = normalizeJ1PromptKey(prompt);
  const answerText = answer?.trim() ?? "";
  if (typeId === "J1.AL.INT.INT_ADD") {
    if (key === "-4+(-6)=") return addHighlightsToLines([{ kind: "text", value: "-4 + (-6)" }, { kind: "text", value: "= -(4 + 6)" }, { kind: "text", value: "= -(10)" }, { kind: "text", value: "=-10" }]);
    if (key === "8+(-3)=") return addHighlightsToLines([{ kind: "text", value: "8 + (-3)" }, { kind: "text", value: "= 8 - 3" }, { kind: "text", value: "= 5" }]);
    if (key === "-7+5=") return addHighlightsToLines([{ kind: "text", value: "-7 + 5" }, { kind: "text", value: "= -(7 - 5)" }, { kind: "text", value: "= -(2)" }, { kind: "text", value: "=-2" }]);
  }
  if (typeId === "J1.AL.INT.INT_SUB") {
    if (key === "6-(-3)=") return addHighlightsToLines([{ kind: "text", value: "6 - (-3)" }, { kind: "text", value: "= 6 + 3" }, { kind: "text", value: "= 9" }]);
    if (key === "-4-3=") return addHighlightsToLines([{ kind: "text", value: "-4 - 3" }, { kind: "text", value: "= -(4 + 3)" }, { kind: "text", value: "= -(7)" }, { kind: "text", value: "=-7" }]);
    if (key === "-5-(-2)=") return addHighlightsToLines([{ kind: "text", value: "-5 - (-2)" }, { kind: "text", value: "= -5 + 2" }, { kind: "text", value: "= -(5 - 2)" }, { kind: "text", value: "=-3" }]);
  }
  if (typeId === "J1.AL.INT.INT_MUL") {
    if (key === "(-3)×(-8)=") return addHighlightsToLines([{ kind: "text", value: "(-3) × (-8)" }, { kind: "text", value: "= (+)(3 × 8)" }, { kind: "text", value: "= 24" }]);
    if (key === "(-2.5)×4=") return addHighlightsToLines([{ kind: "text", value: "(-2.5) × 4" }, { kind: "text", value: "= -(2.5 × 4)" }, { kind: "text", value: "= -(10)" }, { kind: "text", value: "=-10" }]);
    if (key === "(-2/3)×3=") return addHighlightsToLines([{ kind: "text", value: "(-2/3) × 3" }, { kind: "text", value: "= -(2/3) × 3" }, { kind: "text", value: "= -(2×3)/3" }, { kind: "text", value: "=-2" }]);
    if (key === "(-0.5)×(3/4)=") return addHighlightsToLines([{ kind: "text", value: "(-0.5) × (3/4)" }, { kind: "text", value: "= -(0.5 × 3/4)" }, { kind: "text", value: "= -((1/2) × 3/4)" }, { kind: "text", value: "=-3/8" }]);
  }
  if (typeId === "J1.AL.INT.INT_DIV") {
    if (key === "24÷(-6)=") return addHighlightsToLines([{ kind: "text", value: "24 ÷ (-6)" }, { kind: "text", value: "= -(24 ÷ 6)" }, { kind: "text", value: "=-4" }]);
    if (key === "-4.8÷2=") return addHighlightsToLines([{ kind: "text", value: "-4.8 ÷ 2" }, { kind: "text", value: "= -(4.8 ÷ 2)" }, { kind: "text", value: "=-2.4" }]);
    if (key === "(-3/4)÷(1/2)=") return addHighlightsToLines([{ kind: "text", value: "(-3/4) ÷ (1/2)" }, { kind: "text", value: "= (-3/4) × (2/1)" }, { kind: "text", value: "= -(6/4)" }, { kind: "text", value: "=-3/2" }]);
  }
  if (typeId === "J1.AL.POW.POW_INT") {
    if (key === "3^2=") return addHighlightsToLines([{ kind: "text", value: "3^2" }, { kind: "text", value: "= 3 × 3" }, { kind: "text", value: "= 9" }]);
    if (key === "(-4)^2=") return addHighlightsToLines([{ kind: "text", value: "(-4)^2" }, { kind: "text", value: "= (-4) × (-4)" }, { kind: "text", value: "= 16" }]);
    if (key === "-4^2=") return addHighlightsToLines([{ kind: "text", value: "-4^2" }, { kind: "text", value: "= -(4^2)" }, { kind: "text", value: "= -(4 × 4)" }, { kind: "text", value: "=-16" }]);
  }
  if (typeId === "J1.AL.EXP.FACTOR_GCF") {
    return addHighlightsToLines([{ kind: "text", value: prompt ?? "" }, { kind: "text", value: "同じ文字どうしをまとめる" }, { kind: "text", value: `= ${answerText}` }]);
  }
  if (typeId === "J1.AL.EXP.FACTOR_TRINOM" || typeId === "J1.AL.EXP.EXPAND") {
    return addHighlightsToLines([{ kind: "text", value: prompt ?? "" }, { kind: "text", value: "分配して展開する" }, { kind: "text", value: "同類項をまとめる" }, { kind: "text", value: `= ${answerText}` }]);
  }
  if (typeId === "J1.EQ.LIN.LIN_EQ") {
    return addHighlightsToLines([{ kind: "text", value: prompt ?? "" }, { kind: "text", value: "分配して整理する" }, { kind: "text", value: "数を移項する" }, { kind: "text", value: "係数で割る" }, { kind: "text", value: `x = ${answerText}` }]);
  }
  if (typeId === "J1.FN.LIN.LIN_FUNC_PARAMS") {
    return addHighlightsToLines([{ kind: "text", value: prompt ?? "" }, { kind: "text", value: "x の前の数を傾き a とみる" }, { kind: "text", value: "定数項または代入で b を決める" }, { kind: "text", value: `(a,b) = ${answerText}` }]);
  }
  return undefined;
};

const buildJ1TemplateExplanation = (
  patternId: string,
  answer?: string,
  options?: { prompt?: string; promptTex?: string; typeId?: string }
): ExplanationContent | null => {
  if (!options?.typeId?.startsWith("J1.")) return null;
  const derivationLines = buildJ1TemplateDerivationLines(options.typeId, options.prompt, answer);
  const hintLines = buildJ1TemplateHintLines(options.typeId, options.prompt);
  if (!derivationLines || !hintLines) return null;
  return {
    title: `${toMathName(patternId)}の解き方`,
    point: hintLines.map((line) => line.value).join(" / "),
    derivationLines,
    steps: hintLines.map((line) => line.value),
    table: {
      headers: ["見る", "操作", "結果"],
      rows: [
        ["問題", "手順に沿って整理", "途中式"],
        ["途中式", "計算", answer?.trim() ?? "答え"]
      ]
    },
    diagramLines: [
      "[問題] -> [ヒントどおりに整理] -> [計算] -> [答え]"
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
  "EXPAND_AXBX_BASIC",
  "EXPAND_AXBX_COEFF",
  "EXPAND_AXBX_NEGATIVE",
  "EXPAND_BINOMIAL_BASIC",
  "EXPAND_BINOMIAL_DECIMAL",
  "EXPAND_BINOMIAL_FRACTION",
  "EXPAND_BINOMIAL_LITERAL",
  "EXPAND_BINOMIAL_MIXED_SIGN",
  "EXPAND_BINOMIAL_NEGATIVE",
  "EXPAND_CUBIC_APPLICATION",
  "EXPAND_CUBIC_MINUS_BASIC",
  "EXPAND_CUBIC_MINUS_COEFF",
  "EXPAND_CUBIC_MINUS_DECIMAL",
  "EXPAND_CUBIC_MINUS_FRACTION",
  "EXPAND_CUBIC_MINUS_LITERAL",
  "EXPAND_CUBIC_MINUS_NUMERIC",
  "EXPAND_CUBIC_MIXED",
  "EXPAND_CUBIC_PLUS_BASIC",
  "EXPAND_CUBIC_PLUS_COEFF",
  "EXPAND_CUBIC_PLUS_DECIMAL",
  "EXPAND_CUBIC_PLUS_FRACTION",
  "EXPAND_CUBIC_PLUS_LITERAL",
  "EXPAND_CUBIC_PLUS_NUMERIC",
  "EXPAND_DIFF_SQ_BASIC",
  "EXPAND_DIFF_SQ_FRACTION",
  "EXPAND_DIFF_SQ_LITERAL",
  "EXPAND_GENERAL",
  "EXPAND_QUAD_BASIC",
  "EXPAND_QUAD_BOTH_LITERAL_COEFF",
  "EXPAND_QUAD_COEFF",
  "EXPAND_QUAD_COEFF_SORT",
  "EXPAND_QUAD_COMPLEX_LIKE_TERMS",
  "EXPAND_QUAD_DECIMAL_COEFF",
  "EXPAND_QUAD_FRACTION_COEFF",
  "EXPAND_QUAD_GENERAL",
  "EXPAND_QUAD_LARGE_COEFF",
  "EXPAND_QUAD_LIKE_TERMS",
  "EXPAND_QUAD_LITERAL_COEFF",
  "EXPAND_QUAD_LITERAL_MIXED",
  "EXPAND_QUAD_NEG_COEFF",
  "EXPAND_QUAD_SIGN",
  "EXPAND_QUAD_SORTED",
  "EXPAND_SQUARE_AXB_COEFF",
  "EXPAND_SQUARE_MINUS_BASIC",
  "EXPAND_SQUARE_PLUS_BASIC",
  "EXPAND_SQUARE_PLUS_FRACTION",
  "EXP_RULES",
  "EXP_RULES_COEFF",
  "EXP_RULES_COLLECT",
  "EXP_RULES_COLLECT_FRACTION",
  "EXP_RULES_FRACTIONAL_EXP",
  "EXP_RULES_FRACTIONAL_MEANING",
  "EXP_RULES_FRACTIONAL_TO_ROOT",
  "EXP_RULES_FRACTION_MIXED",
  "EXP_RULES_GENERAL",
  "EXP_RULES_MEANING",
  "EXP_RULES_MIXED",
  "EXP_RULES_NEGATIVE_BASE",
  "EXP_RULES_NO_PAREN",
  "EXP_RULES_POWER_OF_POWER",
  "EXP_RULES_PRODUCT_POWER",
  "EXP_RULES_QUOTIENT_POWER",
  "EXP_RULES_SAME_BASE_DIV",
  "EXP_RULES_SAME_BASE_MUL",
  "FACTOR_COMMON_APPLICATION",
  "FACTOR_COMMON_NUMERIC",
  "FACTOR_COMMON_NUMERIC_VARIABLE",
  "FACTOR_COMMON_VARIABLE",
  "FACTOR_DIFF_SQ",
  "FACTOR_DIFF_SQ_BASIC",
  "FACTOR_DIFF_SQ_COEFF",
  "FACTOR_DIFF_SQ_FRACTION",
  "FACTOR_DIFF_SQ_LITERAL",
  "FACTOR_GCF",
  "FACTOR_MIX_COMMON_DIFF",
  "FACTOR_MIX_COMMON_PERF",
  "FACTOR_MIX_TRINOM",
  "FACTOR_PERF_SQ",
  "FACTOR_PERF_SQ_BASIC",
  "FACTOR_PERF_SQ_COEFF",
  "FACTOR_PERF_SQ_LITERAL",
  "FACTOR_PERF_SQ_NEG",
  "FACTOR_TRINOM",
  "FACTOR_TRINOM_BASIC",
  "FACTOR_TRINOM_COEFF",
  "FACTOR_TRINOM_NEG",
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
  "QUAD_ROOTS_FACTOR_APPLICATION",
  "QUAD_ROOTS_FACTOR_BASIC",
  "QUAD_ROOTS_FACTOR_BASIC_FACTOR",
  "QUAD_ROOTS_FACTOR_BOTH_NEG",
  "QUAD_ROOTS_FACTOR_COEFF",
  "QUAD_ROOTS_FACTOR_COMMON",
  "QUAD_ROOTS_FACTOR_DIFF_SQ",
  "QUAD_ROOTS_FACTOR_FRACTION",
  "QUAD_ROOTS_FACTOR_GENERAL",
  "QUAD_ROOTS_FACTOR_NEG_MIX",
  "QUAD_ROOTS_FACTOR_PERF_SQ",
  "QUAD_ROOTS_FACTOR_SIGN",
  "QUAD_ROOTS_SQ_BASIC",
  "QUAD_ROOTS_SQ_COEFF",
  "QUAD_ROOTS_SQ_COMPLETE",
  "QUAD_ROOTS_SQ_DECIMAL",
  "QUAD_ROOTS_SQ_FRACTION",
  "QUAD_ROOTS_SQ_GENERAL",
  "QUAD_ROOTS_SQ_IRRATIONAL",
  "QUAD_ROOTS_SQ_NEGATIVE",
  "QUAD_ROOTS_SQ_PAREN",
  "QUAD_ROOTS_SQ_PAREN_NEG",
  "QUAD_ROOTS_SQ_REARRANGED",
  "QUAD_ROOTS_SQ_ROOT",
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

export const getSecondaryLearningAid = ({ gradeId, typeId, patternId, answer, prompt, promptTex }: AidParams): SecondaryLearningAid | null => {
  const resolvedGrade = gradeId || getGradeIdFromTypeId(typeId);
  if (!resolvedGrade || !isSecondaryGrade(resolvedGrade)) return null;
  const intAddSignRulesLines: SecondaryLearningAid["hintLines"] = [
    { kind: "text", value: "符号のルール" },
    { kind: "tex", value: String.raw`+\left(+\right)\to +` },
    { kind: "tex", value: String.raw`+\left(-\right)\to -` },
    { kind: "tex", value: String.raw`-\left(+\right)\to -` },
    { kind: "tex", value: String.raw`-\left(-\right)\to +` }
  ];
  const intAddSignRulesHint = intAddSignRulesLines.map((line) => line.value).join("\n");
  const j1TemplateHint = buildJ1TemplateHint(typeId, prompt, patternId ? toHint(patternId) : "");
  const j1TemplateHintLines = buildJ1TemplateHintLines(typeId, prompt);
  const j1TemplateExplanation = patternId
    ? buildJ1TemplateExplanation(patternId, answer, { prompt, promptTex, typeId })
    : null;
  const resolveHint = (pid: string) =>
    j1TemplateHintLines ? j1TemplateHint : typeId === "J1.AL.INT.INT_ADD" && pid === "INT_ADD" ? intAddSignRulesHint : toHint(pid);
  const resolveHintLines = (pid: string) =>
    j1TemplateHintLines ? j1TemplateHintLines : typeId === "J1.AL.INT.INT_ADD" && pid === "INT_ADD" ? intAddSignRulesLines : undefined;

  if (patternId && AID_BY_PATTERN.has(patternId)) {
    const aid = AID_BY_PATTERN.get(patternId);
    if (!aid) return null;
    return {
      ...aid,
      hint: resolveHint(patternId),
      hintLines: resolveHintLines(patternId),
      explanation: j1TemplateExplanation ?? buildGenericExplanation(patternId, answer, { prompt, promptTex, typeId })
    };
  }

  if (patternId) {
    return {
      hint: resolveHint(patternId),
      hintLines: resolveHintLines(patternId),
      explanation: j1TemplateExplanation ?? buildGenericExplanation(patternId, answer, { prompt, promptTex, typeId })
    };
  }

  const fallbackPatternId = typeId?.split(".").slice(-1)[0] ?? "GENERIC";
  return {
    hint: toHint(fallbackPatternId),
    explanation: buildGenericExplanation(fallbackPatternId, answer, { prompt, promptTex, typeId })
  };
};

export const getSecondaryPatternIds = () => [...PATTERN_IDS];
