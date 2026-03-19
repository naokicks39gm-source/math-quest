import { useEffect } from "react";

export function useQuestStockEffects(args: any) {
  const {
    isLearningSessionMode,
    hasLevelQuery,
    targetStockTypes,
    retryNonce,
    stock,
    setTypeStocks,
    setStockShortages,
    setStockReady,
    clearAllFractionAutoMoveTimers,
    stockReady,
    setQuizItems,
    setItemIndex,
    setQuestionResults,
    quest,
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
      setTypeStocks(new Map());
      setStockShortages([]);
      setStockReady(true);
      return;
    }
    setStockReady(false);
    if (hasLevelQuery) {
      setTypeStocks(new Map());
      setStockShortages([]);
      setStockReady(true);
      return;
    }
    const stockState = stock.buildStockState();
    setTypeStocks(stockState.stocks);
    setStockShortages(stockState.shortages);
    setStockReady(true);
  }, [isLearningSessionMode, hasLevelQuery, targetStockTypes, retryNonce, stock]);

  useEffect(() => {
    if (isLearningSessionMode) {
      return;
    }
    clearAllFractionAutoMoveTimers();
    if (!stockReady) {
      setQuizItems([]);
      setItemIndex(0);
      setQuestionResults({});
      quest.setStatus("blocked");
      setQuizBuildError("出題ストックを準備中です。少しお待ちください。");
      return;
    }
    const picked = stock.pickQuestSet();
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
    quest.setStatus("playing");
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
  }, [isLearningSessionMode, hasPatternQuery, patternIdFromQuery, levelGradeId, levelFromQuery, stockReady, typeStocks, activeTypeId, quizSize, retryNonce, difficultyFromQuery, stock]);
}
