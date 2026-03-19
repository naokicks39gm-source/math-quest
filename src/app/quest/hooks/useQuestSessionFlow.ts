export function useQuestSessionFlow(args: any) {
  const {
    quest,
    retryFromQuery,
    learningRecovery,
    setLearningError,
    setLearningResultSkillId,
    setQuizBuildError,
    setQuestionResults,
    resetQuestionUi,
    clearPersistedLearningSession,
    loadStateFromClient,
    buildFreshLearningState,
    trackAnalyticsEvent,
    skillIdFromQuery,
    setLearningSessionId,
    updateDailyStreak,
    setLearningResult,
    setMessage,
    setResultMark,
    finishGuardRef,
    advanceGuardRef,
    autoNextTimerRef,
    wrongMarkTimerRef,
    learningState,
    learningSessionId,
    sessionStartTrackedRef,
    shouldForceFreshOrderSession,
    ensureActiveSession,
    postJson,
    setSessionError,
    isLearningSessionMode,
    learningActions
  } = args;

  const syncLearningUiFromAnswer = (response: any) => {
    quest.setCurrentProblem(response.problem ?? null);
    quest.setLearningAttemptCount(response.attemptCount ?? 0);
    quest.setLearningHint(response.hint ?? null);
    quest.setLearningExplanation(response.explanation ?? null);
    console.info("[quest] answer response", {
      attemptCount: response.attemptCount ?? 0,
      hint: response.hint ?? null,
      explanation: response.explanation ?? null,
      problemQuestion: response.problem?.problem.question ?? null
    });
  };

  const finishSession = async (overrideSkillId?: string | null) => {
    await learningActions.runFinishLearningSession(learningState, learningSessionId, overrideSkillId ?? skillIdFromQuery ?? null, {
      quest,
      finishGuardRef,
      advanceGuardRef,
      autoNextTimerRef,
      wrongMarkTimerRef,
      persistLearningState: learningRecovery.persistFullLearningState,
      clearLearningRecovery: learningRecovery.clearLearningRecoveryStorage,
      clearLearningRecoveryStorage: learningRecovery.clearLearningRecoveryStorage,
      setLearningSessionId,
      updateDailyStreak,
      trackAnalyticsEvent,
      setLearningResultSkillId,
      setLearningResult,
      setMessage,
      setResultMark
    });
  };

  const startSession = async (
    skillId: string,
    options?: {
      fresh?: boolean;
      carryoverHistory?: any;
      recentProblems?: any;
    }
  ) => {
    sessionStartTrackedRef.current = false;
    quest.setLearningLoading(true);
    setLearningError(null);
    args.resetLearningSessionUi();

    try {
      const response = await fetch("/api/learning/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: options?.fresh ? buildFreshLearningState(skillId) : loadStateFromClient(),
          mode: "skill",
          skillId,
          fresh: options?.fresh === true,
          carryoverHistory: options?.carryoverHistory,
          recentProblems: options?.recentProblems
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "learning_session_start_failed");
      }
      if (!data?.session?.problems?.length) {
        throw new Error("learning_session_problem_unavailable");
      }
      learningRecovery.persistLearningState(data.state, {
        sessionId: data.sessionId,
        recoveryAnswers: [],
        skillId,
        expiresAt: data.expiresAt
      });
      console.info("[quest] start session", {
        skillId,
        retry: retryFromQuery || null,
        fresh: options?.fresh === true,
        problemQuestion: data.session.problems[0]?.problem.question ?? null
      });
      trackAnalyticsEvent("session_start");
      sessionStartTrackedRef.current = true;
      console.log("STATUS CHANGE →", "playing");
      quest.setStatus("playing");
      setQuizBuildError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "learning_session_start_failed";
      setLearningError(message);
      quest.setStatus("blocked");
      setQuizBuildError(`れんしゅうを はじめられませんでした: ${message}`);
    } finally {
      quest.setLearningLoading(false);
    }
  };

  const resumeSession = async (sessionId: string, skillId: string) => {
    finishGuardRef.current = false;
    quest.setLearningLoading(true);
    setLearningError(null);
    console.log("LEARNING RESULT CLEARED");
    quest.setLearningResult(null);
    setLearningResultSkillId(null);
    setQuestionResults({});
    console.log("STATUS CHANGE →", "playing");
    quest.setStatus("playing");
    resetQuestionUi();

    try {
      const response = await fetch(`/api/learning/session/${encodeURIComponent(sessionId)}`, {
        method: "GET",
        cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "learning_session_resume_failed");
      }
      if (!data?.session?.problems?.length) {
        throw new Error("learning_session_problem_unavailable");
      }
      const recovery = learningRecovery.loadLearningRecovery();
      const storedSession = data.session;
      if (storedSession.skillId !== skillId) {
        learningRecovery.clearLearningRecoveryStorage();
        clearPersistedLearningSession(skillId);
        setLearningSessionId(null);
        return false;
      }
      if (shouldForceFreshOrderSession(skillId, storedSession)) {
        learningRecovery.clearLearningRecoveryStorage();
        clearPersistedLearningSession(skillId);
        setLearningSessionId(null);
        console.info("[quest] stale order session detected; starting fresh session", {
          skillId,
          sessionId
        });
        return false;
      }
      learningRecovery.persistLearningState(data.state, {
        sessionId: data.sessionId,
        recoveryAnswers: recovery?.answers ?? [],
        skillId,
        expiresAt: data.expiresAt
      });
      console.info("[quest] resume session", {
        skillId,
        sessionId: data.sessionId,
        problemQuestion: storedSession.problems[storedSession.index]?.problem.question ?? null
      });
      setQuizBuildError(null);
      return true;
    } catch (error) {
      learningRecovery.clearLearningRecoveryStorage();
      clearPersistedLearningSession(skillId);
      const message = error instanceof Error ? error.message : "learning_session_resume_failed";
      setLearningError(message);
      return false;
    } finally {
      quest.setLearningLoading(false);
    }
  };

  const sendSessionAnswer = async (
    answerText: string,
    verdict: { ok: boolean },
    meta?: { currentType?: any; currentItem?: any }
  ) => {
    const resolvedSessionId = await ensureActiveSession();
    const currentType = meta?.currentType;
    const currentItem = meta?.currentItem;
    if (!resolvedSessionId || !currentType || !currentItem) return;
    void postJson("/api/session/answer", {
      sessionId: resolvedSessionId,
      typeId: currentType.type_id,
      prompt: currentItem.prompt,
      predicted: answerText,
      correctAnswer: currentItem.answer,
      isCorrect: verdict.ok
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "answer_log_failed";
      setSessionError(message);
    });
  };

  const sendLearningAnswer = async (answerText: string, verdict: { ok: boolean }) => {
    if (!isLearningSessionMode) return;
    try {
      await learningActions.submitLearningAnswer(learningState, learningSessionId, quest, answerText, verdict.ok);
    } catch (error) {
      const message = error instanceof Error ? error.message : "learning_session_answer_failed";
      setLearningError(message);
      quest.setStatus("blocked");
      setQuizBuildError(`こたえの とうろくに しっぱいしました: ${message}`);
    }
  };

  const processAnswer = async (
    answerText: string,
    verdict: { ok: boolean },
    meta?: { currentType?: any; currentItem?: any }
  ) => {
    await sendSessionAnswer(answerText, verdict, meta);
    await sendLearningAnswer(answerText, verdict);
  };

  return {
    startSession,
    resumeSession,
    finishSession,
    processAnswer,
    syncLearningUiFromAnswer,
    sendSessionAnswer,
    sendLearningAnswer
  };
}
