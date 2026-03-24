import { useEffect } from "react";

export function useQuestStockEffects(args: any) {
  const {
    isLearningSessionMode,
    hasLevelQuery,
    retryNonce,
    buildStockState,
    pickQuestSet,
    setTypeStocks,
    setStockShortages,
    setStockReady,
    clearAllFractionAutoMoveTimers,
    stockReady,
    setQuizItems,
    setItemIndex,
    setQuestionResults,
    questSetStatus,
    setQuizBuildError,
    setActivePickMeta,
    setStatus,
    setPracticeResult,
    setResultMark,
    setRecognizedNumber,
    setInput,
    setFractionInput,
    EMPTY_FRACTION_EDITOR,
    setQuadraticAnswers,
    setQuadraticFractionInputs,
    setQuadraticActiveIndex,
    setMessage,
    hasPatternQuery,
    patternIdFromQuery,
    levelGradeId,
    levelFromQuery,
    typeStocks,
    activeTypeId,
    quizSize,
    difficultyFromQuery
  } = args;

  useEffect(() => {
    if (isLearningSessionMode) {
      setTypeStocks((prev: Map<string, any>) => (prev.size === 0 ? prev : new Map()));
      setStockShortages((prev: any[]) => (prev.length === 0 ? prev : []));
      setStockReady((prev: boolean) => (prev ? prev : true));
      return;
    }
    setStockReady((prev: boolean) => (prev ? false : prev));
    if (hasLevelQuery) {
      setTypeStocks((prev: Map<string, any>) => (prev.size === 0 ? prev : new Map()));
      setStockShortages((prev: any[]) => (prev.length === 0 ? prev : []));
      setStockReady((prev: boolean) => (prev ? prev : true));
      return;
    }
    const stockState = buildStockState();
    setTypeStocks(stockState.stocks);
    setStockShortages(stockState.shortages);
    setStockReady((prev: boolean) => (prev ? prev : true));
  }, [isLearningSessionMode, hasLevelQuery, retryNonce, buildStockState, setStockReady, setStockShortages, setTypeStocks]);

  useEffect(() => {
    if (isLearningSessionMode) {
      return;
    }
    clearAllFractionAutoMoveTimers();
    if (!stockReady) {
      setQuizItems([]);
      setItemIndex(0);
      setQuestionResults({});
      questSetStatus("blocked");
      setQuizBuildError("出題ストックを準備中です。少しお待ちください。");
      return;
    }
    const picked = pickQuestSet();
    setActivePickMeta(picked.pickMeta ?? null);
    if (picked.kind === "blocked") {
      setQuizItems([]);
      setItemIndex(0);
      setQuestionResults({});
      setStatus("blocked");
      setQuizBuildError(picked.message ?? null);
      setPracticeResult(null);
      setResultMark(null);
      setRecognizedNumber(null);
      setInput("");
      setFractionInput({ ...EMPTY_FRACTION_EDITOR });
      setQuadraticAnswers(["", ""]);
      setQuadraticFractionInputs([{ ...EMPTY_FRACTION_EDITOR }, { ...EMPTY_FRACTION_EDITOR }]);
      setQuadraticActiveIndex(0);
      return;
    }
    setQuizItems(picked.entries ?? []);
    setItemIndex(0);
    setQuestionResults({});
    console.log("STATUS CHANGE →", "playing");
    questSetStatus("playing");
    setMessage("Battle Start!");
    setPracticeResult(null);
    setResultMark(null);
    setRecognizedNumber(null);
    setQuizBuildError(picked.shortageMessage ?? null);
    setInput("");
    setFractionInput({ ...EMPTY_FRACTION_EDITOR });
    setQuadraticAnswers(["", ""]);
    setQuadraticFractionInputs([{ ...EMPTY_FRACTION_EDITOR }, { ...EMPTY_FRACTION_EDITOR }]);
    setQuadraticActiveIndex(0);
  }, [
    isLearningSessionMode,
    hasPatternQuery,
    patternIdFromQuery,
    levelGradeId,
    levelFromQuery,
    stockReady,
    typeStocks,
    activeTypeId,
    quizSize,
    retryNonce,
    difficultyFromQuery,
    clearAllFractionAutoMoveTimers,
    pickQuestSet,
    setActivePickMeta,
    setFractionInput,
    setInput,
    setItemIndex,
    setMessage,
    setPracticeResult,
    setQuadraticActiveIndex,
    setQuadraticAnswers,
    setQuadraticFractionInputs,
    setQuestionResults,
    setQuizBuildError,
    setQuizItems,
    setRecognizedNumber,
    setResultMark,
    setStatus,
    questSetStatus
  ]);
}
