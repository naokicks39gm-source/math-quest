import { KEYPAD_LAYOUT_BY_MODE, KEYS, type KeypadKey } from "packages/keypad";

export type MathKeypadMode = "elementary" | "junior" | "highschool";
export type MathKeypadToken = KeypadKey;

const TOKENS_BY_MODE: Record<MathKeypadMode, ReadonlySet<MathKeypadToken>> = {
  elementary: new Set<MathKeypadToken>(KEYPAD_LAYOUT_BY_MODE.elementary.flat()),
  junior: new Set<MathKeypadToken>(KEYPAD_LAYOUT_BY_MODE.junior.flat()),
  highschool: new Set<MathKeypadToken>(KEYPAD_LAYOUT_BY_MODE.highschool.flat())
};

export const isTokenEnabledForMode = (mode: MathKeypadMode, token: MathKeypadToken) => TOKENS_BY_MODE[mode].has(token);

export const resolveMathKeypadToken = (
  token: MathKeypadToken,
  _variableToken: string
): string => {
  if (token === KEYS.VAR) return "x";
  if (token === KEYS.FRACTION) return "/";
  if (token === KEYS.EXPONENT) return "^";
  if (token === KEYS.DECIMAL) return ".";
  if (token === KEYS.SQRT) return "sqrt(";
  return token;
};

export const keypadKeySizeClass: Record<MathKeypadMode, string> = {
  elementary: "h-[90px] text-2xl rounded-none",
  junior: "h-10 text-sm rounded-md",
  highschool: "h-9 text-xs rounded-md"
};

export const keypadRightColumnClass: Record<MathKeypadMode, string> = {
  elementary: "w-[120px] grid grid-cols-1 grid-rows-[90px_180px_90px] gap-0",
  junior: "w-[92px] grid grid-cols-1 grid-rows-[40px_80px_40px] gap-1.5",
  highschool: "w-[92px] grid grid-cols-1 grid-rows-[36px_72px_36px] gap-1.5"
};

export { KEYPAD_LAYOUT_BY_MODE };
