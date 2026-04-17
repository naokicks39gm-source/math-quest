import { useEffect } from "react";

import { QuestUiInitializerArgs } from "./types";

export function useQuestUiInitializer(args: QuestUiInitializerArgs) {
  const {
    isLearningSessionMode,
    stockReady,
    retryNonce,
    clearAllFractionAutoMoveTimers,
    setMessage,
    setPracticeResult,
    setResultMark,
    setRecognizedNumber,
    setInput,
    setFractionInput,
    EMPTY_FRACTION_EDITOR,
    setQuadraticAnswers,
    setQuadraticFractionInputs,
    setQuadraticActiveIndex
  } = args;

  useEffect(() => {
    if (isLearningSessionMode) return;
    if (!stockReady) return;

    clearAllFractionAutoMoveTimers();

    setMessage("Battle Start!");
    setPracticeResult(null);
    setResultMark(null);
    setRecognizedNumber(null);
    setInput("");
    setFractionInput({ ...EMPTY_FRACTION_EDITOR });
    setQuadraticAnswers(["", ""]);
    setQuadraticFractionInputs([
      { ...EMPTY_FRACTION_EDITOR },
      { ...EMPTY_FRACTION_EDITOR }
    ]);
    setQuadraticActiveIndex(0);

  }, [isLearningSessionMode, stockReady, retryNonce]);
}