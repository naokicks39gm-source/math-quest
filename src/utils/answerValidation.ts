import { VARIABLE_SYMBOLS } from "packages/keypad";

export type FractionEditorState = {
  enabled: boolean;
  num: string;
  den: string;
  part: "num" | "den";
};

const HIGH_SCHOOL_EXTRA_KEYPAD_TOKENS = ["()", "x", "^", "+/-"] as const;

export function isValidAnswerText(
  text: string | undefined,
  kind: any
){

  const t = (text ?? "").trim();

  if (!t) return false;

  if (kind === "int" || kind === "pair"){
    return /^-?\d+$/.test(t);
  }

  if (kind === "dec"){
    return /^-?\d+(\.\d+)?$/.test(t);
  }

  if (kind === "frac"){
    return /^-?\d+\/-?\d+$/.test(t);
  }

  return true;

}

export const isFractionPartReady = (value: string) =>
  /^-?\d+$/.test(value);

export const isFractionEditorReady = (
  editor: FractionEditorState
) =>
  editor.enabled &&
  isFractionPartReady(editor.num) &&
  isFractionPartReady(editor.den);

  export const fractionEditorToAnswerText = (
  editor: FractionEditorState
) =>
  `${editor.num}/${editor.den}`;

  export const canUseKeyToken = (
  token: string,
  isSecondaryQuest: boolean,
  isHighSchoolQuest: boolean
) => {

  if (/^\d$/.test(token))
    return true;

  if (token === "-")
    return true;

  if (token === ".")
    return true;

  if (token === "/")
    return true;

  if (token === "×")
    return true;

  if (token === "+")
    return isSecondaryQuest;

  if (token === "^")
    return isSecondaryQuest;

  if (token === "()")
    return isSecondaryQuest;

  if (
    (VARIABLE_SYMBOLS as readonly string[])
    .includes(token)
  )
    return isSecondaryQuest;

  if (
    token === "|x|" ||
    token === "sqrt(" ||
    token === "log(" ||
    token === "π"
  )
    return isHighSchoolQuest;

  if (
    isSecondaryQuest &&
    (HIGH_SCHOOL_EXTRA_KEYPAD_TOKENS as readonly string[])
    .includes(token)
  )
    return true;

  return false;

};
