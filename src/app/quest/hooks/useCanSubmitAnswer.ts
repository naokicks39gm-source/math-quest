export function useCanSubmitAnswer(deps:any){
  const isQuadratic = deps.isQuadraticRootsQuestion;
  const isFraction = deps.fractionInput.enabled;
  const isEmpty = !String(deps.answerText ?? "").trim().length;
  // console.log("TRACE_CAN_SUBMIT_CHECK", "empty");
  // console.log("TRACE_CAN_SUBMIT_CHECK", "format");
  // console.log("TRACE_CAN_SUBMIT_CHECK", "fraction");
  // console.log("TRACE_CAN_SUBMIT_CHECK", "quadratic");

  const quadraticPrimaryValid =
    (deps.quadraticFractionInputs[0].enabled
      ? deps.isFractionEditorReady(deps.quadraticFractionInputs[0])
      : deps.isValidAnswerText(deps.quadraticAnswers[0], "pair")) &&
    (deps.quadraticFractionInputs[1].enabled
      ? deps.isFractionEditorReady(deps.quadraticFractionInputs[1])
      : deps.isValidAnswerText(deps.quadraticAnswers[1], "pair"));

  const quadraticFractionFallback =
    deps.quadraticAnswers[0].trim().length > 0 &&
    deps.quadraticAnswers[1].trim().length > 0 &&
    (deps.quadraticAnswers[0].includes("/") ||
      deps.quadraticAnswers[1].includes("/"));

  const standardPrimaryValid = deps.fractionInput.enabled
    ? deps.isFractionEditorReady(deps.fractionInput)
    : deps.isValidAnswerText(deps.input, deps.keypadAnswerKind);

  const standardFractionFallback =
    deps.keypadAnswerKind !== "frac" &&
    deps.answerText.trim().length > 0 &&
    deps.answerText.includes("/");

  const canSubmitCurrentAnswer = isQuadratic
    ? quadraticPrimaryValid || quadraticFractionFallback
    : standardPrimaryValid || standardFractionFallback;

  // console.log("TRACE_CAN_SUBMIT_DETAIL", {
  //   input: deps.input,
  //   answerText: deps.answerText,
  //   format: deps.keypadAnswerKind,
  //   isQuadratic,
  //   isFraction,
  //   isEmpty,
  //   quadraticPrimaryValid,
  //   quadraticFractionFallback,
  //   standardPrimaryValid,
  //   standardFractionFallback,
  //   result: canSubmitCurrentAnswer
  // });

  return { canSubmitCurrentAnswer };

}
