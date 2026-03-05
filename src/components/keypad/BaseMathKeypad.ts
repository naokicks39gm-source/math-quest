export type MathKeypadMode = "elementary" | "junior" | "highschool";

export const KEYPAD_LAYOUT = [
  "1", "2", "3", "()",
  "4", "5", "6", "var",
  "7", "8", "9", "+/-",
  "0", "frac", "pow", ".",
  "abs", "sqrt", "log", "pi"
] as const;

export type MathKeypadToken = (typeof KEYPAD_LAYOUT)[number];

export const KEY_LABELS: Record<MathKeypadToken, string> = {
  "0": "0",
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "()": "（）",
  var: "x",
  "+/-": "+/-",
  frac: "分数",
  pow: "指数",
  ".": "小数点",
  abs: "|x|",
  sqrt: "√",
  log: "log",
  pi: "π"
};

const DISABLED_TOKENS_BY_MODE: Record<MathKeypadMode, ReadonlySet<MathKeypadToken>> = {
  elementary: new Set<MathKeypadToken>(["var", "+/-", "frac", "pow", "abs", "sqrt", "log", "pi"]),
  junior: new Set<MathKeypadToken>(["abs", "sqrt", "log", "pi"]),
  highschool: new Set<MathKeypadToken>([])
};

export const isTokenEnabledForMode = (mode: MathKeypadMode, token: MathKeypadToken) =>
  !DISABLED_TOKENS_BY_MODE[mode].has(token);

export const resolveMathKeypadToken = (
  token: MathKeypadToken,
  variableToken: string
): string => {
  if (token === "var") return variableToken;
  if (token === "frac") return "/";
  if (token === "pow") return "^";
  if (token === "abs") return "|x|";
  if (token === "sqrt") return "sqrt(";
  if (token === "log") return "log(";
  if (token === "pi") return "π";
  return token;
};

export const keypadKeySizeClass: Record<MathKeypadMode, string> = {
  elementary: "h-14 text-lg rounded-lg",
  junior: "h-10 text-sm rounded-md",
  highschool: "h-9 text-xs rounded-md"
};

export const keypadRightColumnClass: Record<MathKeypadMode, string> = {
  elementary: "w-[104px] grid grid-cols-1 grid-rows-[56px_112px_56px] gap-1.5",
  junior: "w-[92px] grid grid-cols-1 grid-rows-[40px_80px_40px] gap-1.5",
  highschool: "w-[92px] grid grid-cols-1 grid-rows-[36px_72px_36px] gap-1.5"
};
