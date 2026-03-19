import { useEffect } from "react";

export function useQuestEffects(args: any) {
  const {
    isLearningSessionMode,
    freshFromQuery,
    retryFromQuery,
    skillIdFromQuery,
    quest,
    currentLearningSkillId,
    resolvedLearningResult,
    skillId,
    setLearningResultSkillId,
    setQuestionResults,
    purgeFreshLearningRecovery,
    hasStarted,
    sessionStartTrackedRef,
    normalizedLearningSession,
    memoStrokesRef,
    memoStrokes,
    inkFirstMode,
    setAutoJudgeEnabled,
    shouldAutoFinishLearningSession,
    learningActions,
    learningState,
    learningSessionId,
    finishGuardRef,
    advanceGuardRef,
    autoNextTimerRef,
    wrongMarkTimerRef,
    learningRecovery,
    setLearningSessionId,
    updateDailyStreak,
    trackAnalyticsEvent,
    setLearningResultSkillIdRef,
    setLearningResult,
    setMessage,
    setResultMark,
    setLearningError,
    setQuizBuildError,
    currentGradeId,
    setPendingGradeId,
    setCombo,
    currentType,
    itemIndex,
    setShowSecondaryHint,
    setShowSecondaryExplanation,
    setShowElementaryHint,
    setShowElementaryExplanation,
    learningResultUi,
    setShowGradeTypePicker,
    resetQuestionUi,
    setShowHighSchoolHint,
    currentCardRef,
    selectedType
  } = args;

  useEffect(() => {
    if (!isLearningSessionMode) return;
    console.info("[quest] search params", {
      skillId: skillIdFromQuery,
      retry: retryFromQuery || null,
      fresh: freshFromQuery || null
    });
  }, [freshFromQuery, isLearningSessionMode, retryFromQuery, skillIdFromQuery]);

  useEffect(() => {
    if (!(quest.status === "cleared" && quest.learningResult)) return;
    console.info("[quest] clear-view render", {
      currentSkillId: currentLearningSkillId,
      historyLength: resolvedLearningResult?.history?.length ?? 0
    });
  }, [currentLearningSkillId, resolvedLearningResult, quest.status, quest.learningResult]);

  useEffect(() => {
    if (!quest.learningResult) return;
    console.log(" quest.learningResult state:", quest.learningResult);
    console.log("RENDER CLEAR");
  }, [quest.learningResult]);

  useEffect(() => {
    if (skillId) return;
    console.log("LEARNING RESULT CLEARED");
    quest.setLearningResult(null);
    setLearningResultSkillId(null);
    quest.setCurrentProblem(null);
    quest.setLearningAttemptCount(0);
    quest.setLearningHint(null);
    quest.setLearningExplanation(null);
    setQuestionResults({});
  }, [skillIdFromQuery]);

  useEffect(() => {
    if (!isLearningSessionMode) return;
    if (!(freshFromQuery || retryFromQuery)) return;
    purgeFreshLearningRecovery();
  }, [freshFromQuery, isLearningSessionMode, purgeFreshLearningRecovery, retryFromQuery]);

  useEffect(() => {
    if (isLearningSessionMode) {
      return;
    }
    if (!hasStarted || quest.status !== "playing" || sessionStartTrackedRef.current) {
      return;
    }
    trackAnalyticsEvent("session_start");
    sessionStartTrackedRef.current = true;
  }, [hasStarted, isLearningSessionMode, quest.status]);

  useEffect(() => {
    if (!quest.session || !normalizedLearningSession) {
      return;
    }
    if (normalizedLearningSession.index !== quest.session.index) {
      quest.setSession({
        ...quest.session,
        index: normalizedLearningSession.index
      });
    }
  }, [quest.session, normalizedLearningSession]);

  useEffect(() => {
    memoStrokesRef.current = memoStrokes;
  }, [memoStrokes]);

  useEffect(() => {
    if (inkFirstMode) {
      setAutoJudgeEnabled(false);
    }
  }, [inkFirstMode]);

  useEffect(() => {
    if (!shouldAutoFinishLearningSession) {
      return;
    }

    void (async () => {
      try {
        await learningActions.runFinishLearningSession(learningState, learningSessionId, skillIdFromQuery, {
          quest,
          finishGuardRef,
          advanceGuardRef,
          autoNextTimerRef,
          wrongMarkTimerRef,
          persistLearningState: learningRecovery.persistFullLearningState,
          clearLearningRecoveryStorage: learningRecovery.clearLearningRecoveryStorage,
          setLearningSessionId,
          updateDailyStreak,
          trackAnalyticsEvent,
          setLearningResultSkillId: setLearningResultSkillIdRef,
          setLearningResult,
          setMessage,
          setResultMark
        });
      } catch (error: unknown) {
        console.error("finish failed", error);
        const message = error instanceof Error ? error.message : "learning_session_finish_failed";
        setLearningError(message);
        quest.setStatus("blocked");
        setQuizBuildError(`れんしゅうを おえられませんでした: ${message}`);
      }
    })();
  }, [learningActions, shouldAutoFinishLearningSession, learningState, learningSessionId, skillIdFromQuery]);

  useEffect(() => {
    if (!currentGradeId) return;
    setPendingGradeId((prev: string) => (prev === currentGradeId ? prev : currentGradeId));
  }, [currentGradeId]);

  useEffect(() => {
    if (!isLearningSessionMode) {
      return;
    }
    setCombo(quest.session?.combo ?? 0);
  }, [isLearningSessionMode, quest.session?.combo]);

  useEffect(() => {
    setShowSecondaryHint(false);
    setShowSecondaryExplanation(false);
    setShowElementaryHint(false);
    setShowElementaryExplanation(false);
  }, [currentType?.type_id, itemIndex]);

  useEffect(() => {
    if (!isLearningSessionMode || quest.status !== "playing") {
      return;
    }
    setShowSecondaryHint(learningResultUi.showSecondaryHint);
    setShowSecondaryExplanation(learningResultUi.showSecondaryExplanation);
    setShowElementaryHint(learningResultUi.showElementaryHint);
    setShowElementaryExplanation(learningResultUi.showElementaryExplanation);
  }, [isLearningSessionMode, learningResultUi, quest.status]);

  useEffect(() => {
    setShowGradeTypePicker(false);
  }, [currentType?.type_id, quest.status]);

  useEffect(() => {
    resetQuestionUi();
  }, [itemIndex, quest.session?.index]);

  useEffect(() => {
    setShowHighSchoolHint(false);
  }, [currentType?.type_id]);

  useEffect(() => {
    if (quest.status === "playing") return;
    if (currentCardRef.current) {
      currentCardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [itemIndex, selectedType, quest.status]);
}
