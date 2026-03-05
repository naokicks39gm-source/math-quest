export const KEYS = {
  NUM_0: "0",
  NUM_1: "1",
  NUM_2: "2",
  NUM_3: "3",
  NUM_4: "4",
  NUM_5: "5",
  NUM_6: "6",
  NUM_7: "7",
  NUM_8: "8",
  NUM_9: "9",

  PAREN: "()",
  MUL: "×",
  PLUS_MINUS: "+/-",
  VAR: "x / 他",

  FRACTION: "分数",
  EXPONENT: "指数",
  DECIMAL: "小数点",

  ABS: "|x|",
  SQRT: "√",
  LOG: "log",
  PI: "π",

  DELETE: "⌫",

  JUDGE: "判定",
  END: "おわり"
} as const;

export const VARIABLE_SYMBOLS = [
  "x",
  "y",
  "a",
  "b",
  "m",
  "n"
] as const;

export type KeypadKey = (typeof KEYS)[keyof typeof KEYS];
