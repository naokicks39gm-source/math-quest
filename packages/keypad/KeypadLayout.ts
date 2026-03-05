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
