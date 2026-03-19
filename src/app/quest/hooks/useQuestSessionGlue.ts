import { useCallback, useEffect } from "react";
import { resetProgress } from "@/lib/resetProgress";

const LS_ACTIVE_SESSION_ID = "mq:activeSessionId";
const LS_STUDENT_ID = "mq:studentId";
const LS_LEARNING_SESSION = "mq:learningSession";

export function useQuestSessionGlue(args: any) {
  const {
    quest,
    router,
    postJson,
    studentId,
    setStudentId,
    activeSessionId,
    setActiveSessionId,
    setSessionError,
    setSessionActionLoading,
    setSessionMailStatus,
    sessionStartInFlightRef,
    finishGuardRef,
    setLearningResultSkillId,
    setLearningSessionId,
    setQuestionResults,
    setCombo,
    setMessage,
    resetQuestionUi,
    setLearningState,
    setLearningResult,
    setLearningError,
    setSettingsOpen,
    trackAnalyticsEvent
  } = args;

  const loadLearningRecovery = (): any => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(LS_LEARNING_SESSION);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        typeof parsed.sessionId !== "string" ||
        typeof parsed.skillId !== "string" ||
        typeof parsed.currentIndex !== "number" ||
        !Array.isArray(parsed.answers) ||
        typeof parsed.expiresAt !== "number"
      ) {
        return null;
      }
      return {
        sessionId: parsed.sessionId,
        skillId: parsed.skillId,
        currentIndex: parsed.currentIndex,
        answers: parsed.answers.filter(
          (entry: any) =>
            Boolean(entry) &&
            typeof entry.index === "number" &&
            typeof entry.answer === "string" &&
            typeof entry.correct === "boolean"
        ),
        expiresAt: parsed.expiresAt
      };
    } catch {
      return null;
    }
  };

  const clearLearningRecoveryStorage = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(LS_LEARNING_SESSION);
  };

  const clearLearningRecovery = clearLearningRecoveryStorage;

  const purgeFreshLearningRecovery = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(LS_LEARNING_SESSION);
    window.localStorage.removeItem("learningState");
    window.localStorage.removeItem("studentStore");
    console.log("preserve learning progress key:", args.LEARNING_STATE_KEY);
  }, [args.LEARNING_STATE_KEY]);

  const resetLearningLocalState = useCallback(() => {
    finishGuardRef.current = false;
    setLearningResultSkillId(null);
    setLearningSessionId(null);
  }, [finishGuardRef, setLearningResultSkillId, setLearningSessionId]);

  const resetBattleUiState = useCallback(() => {
    setQuestionResults({});
    args.setItemIndex(0);
    setCombo(0);
    setMessage("Battle Start!");
    resetQuestionUi();
  }, [args, resetQuestionUi, setCombo, setMessage, setQuestionResults]);

  const handleResetProgress = () => {
    if (typeof window === "undefined") {
      return;
    }

    const confirmed = window.confirm("Reset progress? XP, streak, session, and learning state will be cleared.");
    if (!confirmed) {
      return;
    }

    resetProgress();
    setLearningState(null);
    quest.setSession(null);
    console.log("LEARNING RESULT CLEARED");
    setLearningResult(null);
    setLearningSessionId(null);
    setLearningError(null);
    setQuestionResults({});
    setSettingsOpen(false);
    router.push("/skills");
  };

  const saveLearningRecovery = (recovery: any) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LS_LEARNING_SESSION, JSON.stringify(recovery));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sid = localStorage.getItem(LS_STUDENT_ID);
    const sessionId = localStorage.getItem(LS_ACTIVE_SESSION_ID);
    setStudentId(sid);
    setActiveSessionId(sessionId);
  }, [setActiveSessionId, setStudentId]);

  const ensureActiveSession = async (): Promise<string | null> => {
    if (activeSessionId) return activeSessionId;
    if (!studentId) return null;
    if (sessionStartInFlightRef.current) {
      return sessionStartInFlightRef.current;
    }
    const promise = (async () => {
      try {
        const json = await postJson("/api/session/start", { studentId });
        const id = String(json.sessionId);
        setActiveSessionId(id);
        if (typeof window !== "undefined") {
          localStorage.setItem(LS_ACTIVE_SESSION_ID, id);
        }
        return id;
      } catch (error) {
        const message = error instanceof Error ? error.message : "session_start_failed";
        setSessionError(message);
        return null;
      } finally {
        sessionStartInFlightRef.current = null;
      }
    })();
    sessionStartInFlightRef.current = promise;
    return promise;
  };

  const endLearningSession = async () => {
    if (!activeSessionId) {
      setSessionError(null);
      router.push("/");
      return;
    }
    try {
      setSessionActionLoading(true);
      setSessionError(null);
      const json = await postJson("/api/session/end", { sessionId: activeSessionId });
      setSessionMailStatus(`メール: ${json.mail.status} (${json.mail.toMasked})`);
      trackAnalyticsEvent("session_finish");
      setActiveSessionId(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem(LS_ACTIVE_SESSION_ID);
      }
      router.push("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "session_end_failed";
      setSessionError(message);
      router.push("/");
    } finally {
      setSessionActionLoading(false);
    }
  };

  return {
    loadLearningRecovery,
    clearLearningRecoveryStorage,
    clearLearningRecovery,
    purgeFreshLearningRecovery,
    saveLearningRecovery,
    resetLearningLocalState,
    resetBattleUiState,
    handleResetProgress,
    ensureActiveSession,
    endLearningSession
  };
}
