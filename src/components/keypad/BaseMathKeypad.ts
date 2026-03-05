import { KEYPAD_LAYOUT, type MathKeypadToken } from "./KeypadLayout";

export type MathKeypadMode = "elementary" | "junior" | "highschool";

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

export { KEYPAD_LAYOUT };
export type { MathKeypadToken };
