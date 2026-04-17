import { useEffect } from "react";
import { QuestStockBuilderArgs } from "./types";

export function useQuestStockBuilder(args: QuestStockBuilderArgs) {

  const {
    isLearningSessionMode,
    hasLevelQuery,
    retryNonce,
    buildStockState,
    setTypeStocks,
    setStockShortages,
    setStockReady
  } = args;

  useEffect(() => {
    if (isLearningSessionMode) return;

    if (hasLevelQuery) {
      setTypeStocks(prev => (prev.size === 0 ? prev : new Map()));
      setStockShortages(prev => (prev.length === 0 ? prev : []));
      setStockReady(true);
      return;
    }

    const s = buildStockState();
    setTypeStocks(s.stocks);
    setStockShortages(s.shortages);
    setStockReady(true);

  }, [isLearningSessionMode, hasLevelQuery, retryNonce]);
}