import { FractionEditorState } from "../../../utils/answerValidation";
import { validateFraction } from "./validateFraction";

export function isFractionEditorReady(state: FractionEditorState): boolean {
  if (!state?.enabled) return false;
  const num = state.num?.trim() ?? "";
  const den = state.den?.trim() ?? "";
  return validateFraction(num, den).ok;
}
