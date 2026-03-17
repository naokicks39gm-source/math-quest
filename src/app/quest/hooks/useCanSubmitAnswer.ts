export function useCanSubmitAnswer(deps:any){

  const canSubmitCurrentAnswer = deps.isQuadraticRootsQuestion
    ? (

      ((deps.quadraticFractionInputs[0].enabled
        ? deps.isFractionEditorReady(deps.quadraticFractionInputs[0])
        : deps.isValidAnswerText(deps.quadraticAnswers[0],"pair")
      )

      &&

      (deps.quadraticFractionInputs[1].enabled
        ? deps.isFractionEditorReady(deps.quadraticFractionInputs[1])
        : deps.isValidAnswerText(deps.quadraticAnswers[1],"pair")
      ))

      ||

      (
        deps.quadraticAnswers[0].trim().length>0 &&
        deps.quadraticAnswers[1].trim().length>0 &&
        (
          deps.quadraticAnswers[0].includes("/") ||
          deps.quadraticAnswers[1].includes("/")
        )
      )

    )

    :

    (

      (deps.fractionInput.enabled
        ? deps.isFractionEditorReady(deps.fractionInput)
        : deps.isValidAnswerText(deps.input,deps.keypadAnswerKind)
      )

      ||

      (
        deps.keypadAnswerKind !== "frac" &&
        deps.answerText.trim().length>0 &&
        deps.answerText.includes("/")
      )

    );

  return { canSubmitCurrentAnswer };

}