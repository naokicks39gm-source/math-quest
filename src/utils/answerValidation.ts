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