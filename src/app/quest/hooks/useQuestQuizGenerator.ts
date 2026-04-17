import { useEffect } from "react";

import { QuestQuizGeneratorArgs } from "./types";

export function useQuestQuizGenerator(args: QuestQuizGeneratorArgs) {
  const {
    isLearningSessionMode,
    stockReady,
    retryNonce,
    pickQuestSet,
    setActivePickMeta,
    setQuizItems,
    setItemIndex,
    setQuestionResults,
    setStatus,
    setQuizBuildError,
    questSetStatus
  } = args;

  useEffect(() => {
    if (isLearningSessionMode) return;
    if (!stockReady) return;

    const picked = pickQuestSet();
    setActivePickMeta(picked.pickMeta ?? null);

    if (picked.kind === "blocked") {
      setQuizItems([]);
      setItemIndex(0);
      setQuestionResults({});
      setStatus("blocked");
      setQuizBuildError(picked.message ?? null);
      return;
    }

    setQuizItems(picked.entries ?? []);
    setItemIndex(0);
    setQuestionResults({});
    questSetStatus("playing");

  }, [isLearningSessionMode, stockReady, retryNonce]);
}