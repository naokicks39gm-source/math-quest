import { useCallback } from "react";

export function useQuestionReset(deps:any){
    
  const resetQuestionUi = useCallback(()=>{

    deps.advanceGuardRef.current = false;

    if (deps.autoNextTimerRef.current) {
      window.clearTimeout(deps.autoNextTimerRef.current);
      deps.autoNextTimerRef.current = null;
    }

    if (deps.wrongMarkTimerRef.current) {
      window.clearTimeout(deps.wrongMarkTimerRef.current);
      deps.wrongMarkTimerRef.current = null;
    }

    deps.clearAllFractionAutoMoveTimers();

    deps.setPracticeResult(null);
    deps.setResultMark(null);
    deps.setRecognizedNumber(null);
    deps.setInput("");

    deps.setFractionInput({ ...deps.EMPTY_FRACTION_EDITOR });

    deps.setQuadraticAnswers(["",""]);

    deps.setQuadraticFractionInputs([
      { ...deps.EMPTY_FRACTION_EDITOR },
      { ...deps.EMPTY_FRACTION_EDITOR }
    ]);

    deps.setQuadraticActiveIndex(0);

    deps.setPreviewImages([]);

    deps.canvasRef.current?.clear();

    deps.setShowHighSchoolHint(false);
    deps.setShowSecondaryHint(false);
    deps.setShowSecondaryExplanation(false);
    deps.setShowElementaryHint(false);
    deps.setShowElementaryExplanation(false);

  },[deps]);

  return { resetQuestionUi };

}