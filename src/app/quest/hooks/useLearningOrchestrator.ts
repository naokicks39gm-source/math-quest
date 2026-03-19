import { useCallback, useMemo, useState } from "react";

import type { FractionEditorState } from "@/utils/answerValidation";

export function useLearningOrchestrator(args: any) {
  const {
    quest,
    setLearningSessionId,
    setItemIndex,
    setCombo,
    setLearningAttemptCount,
    isStarting = false,
    isAnswerLockedByExplanation = false,
    input = "",
    setInput = (() => {}) as any,
    setResultMark = (() => {}) as any,
    isQuadraticRootsQuestion = false,
    quadraticAnswers = ["", ""],
    quadraticActiveIndex = 0,
    isHighSchoolQuest = false,
    clearQuadraticFractionAutoMoveTimer = (() => {}) as any,
    setQuadraticFractionInputs = (() => {}) as any,
    setQuadraticAnswers = (() => {}) as any,
    clearFractionAutoMoveTimer = (() => {}) as any,
    setFractionInput = (() => {}) as any,
    fractionInput = { enabled: false, num: "", den: "", part: "num" } as FractionEditorState,
    quadraticFractionInputs = [
      { enabled: false, num: "", den: "", part: "num" },
      { enabled: false, num: "", den: "", part: "num" }
    ] as [FractionEditorState, FractionEditorState],
    isFractionPartTokenValid = (() => true) as any,
    quadraticFractionAutoMoveTimerRefs = { current: [null, null] as [number | null, number | null] },
    FRACTION_AUTO_MOVE_DELAY_MS = 300,
    fractionAutoMoveTimerRef = { current: null as number | null },
    isSecondaryQuest = false,
    VARIABLE_SYMBOLS = []
  } = args;

  const [history, setHistory] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [question, setQuestion] = useState<any>(null);
  const [questionResults, setQuestionResults] = useState<any>({});

  const syncLearningUiFromSession = useCallback(
    (session: any, problem: any) => {
      if (!session) {
        quest.setCurrentProblem(null);
        quest.setLearningAttemptCount(0);
        quest.setLearningHint(null);
        quest.setLearningExplanation(null);
        return;
      }

      const currentProblem = problem ?? session.problems?.[session.index] ?? null;
      quest.setCurrentProblem(currentProblem);
      quest.setLearningAttemptCount(currentProblem?.attemptCount ?? 0);
      quest.setLearningHint(session?.currentHint ?? null);
      quest.setLearningExplanation(session?.currentExplanation ?? null);
    },
    [quest]
  );

  const resetLearningSessionUi = useCallback(() => {
    setLearningSessionId(null);
    quest.setSession(null);
    setItemIndex(0);
    setCombo(0);
    setLearningAttemptCount(0);
    setQuestionResults({});
    quest.setCurrentProblem(null);
    quest.setLearningHint(null);
    quest.setLearningExplanation(null);
  }, [quest, setCombo, setItemIndex, setLearningAttemptCount, setLearningSessionId]);

  const finishLearningSession = useCallback(
    (session: any) => {
      if (!session) return;
      quest.setStatus("cleared");
      quest.setSession(session);
      quest.setCurrentProblem(null);
      quest.setLearningHint(null);
      quest.setLearningExplanation(null);
    },
    [quest]
  );

  const applyFinishLearningSessionState = useCallback(
    (result: any) => {
      if (!result) return;
      quest.setLearningResult(result);
    },
    [quest]
  );

  const restartSameLevel = useCallback(() => {}, []);
  const advanceQuestion = useCallback(() => {}, []);
  const advanceQuestionWithDelay = useCallback(() => {}, []);
  const recordResult = useCallback(() => {}, []);

  const handleInput = useCallback(
    (num: string) => {
      if (quest.status !== "playing" || isStarting || isAnswerLockedByExplanation) return;

      const currentText = isQuadraticRootsQuestion ? quadraticAnswers[quadraticActiveIndex] : input;
      const normalizedToken = (() => {
        if (num === "frac") return "/";
        if (num === "pow") return "^";
        if (num === "var") return "x";
        if (num === "abs") return "|x|";
        if (num === "sqrt") return "sqrt(";
        if (num === "log") return "log(";
        if (num === "pi") return "π";
        return num;
      })();
      const isDigit = /^\d$/.test(normalizedToken);
      const maxInputLength = isHighSchoolQuest ? 24 : 12;

      if (normalizedToken === "/") {
        if (isQuadraticRootsQuestion) {
          clearQuadraticFractionAutoMoveTimer(quadraticActiveIndex);
          setQuadraticFractionInputs((prev: [FractionEditorState, FractionEditorState]) => {
            if (prev[quadraticActiveIndex].enabled) return prev;
            const next: [FractionEditorState, FractionEditorState] = [prev[0], prev[1]];
            next[quadraticActiveIndex] = { enabled: true, num: "", den: "", part: "num" } as FractionEditorState;
            return next;
          });
          setQuadraticAnswers((prev: [string, string]) => {
            const next: [string, string] = [...prev] as [string, string];
            next[quadraticActiveIndex] = "";
            return next;
          });
        } else {
          clearFractionAutoMoveTimer();
          setFractionInput((prev: FractionEditorState) =>
            prev.enabled ? prev : ({ enabled: true, num: "", den: "", part: "num" } as FractionEditorState)
          );
          setInput("");
        }
        setResultMark(null);
        return;
      }

      if (isQuadraticRootsQuestion && quadraticFractionInputs[quadraticActiveIndex].enabled) {
        const currentEditor = quadraticFractionInputs[quadraticActiveIndex];
        const currentPartValue = currentEditor.part === "num" ? currentEditor.num : currentEditor.den;
        if (!isFractionPartTokenValid(currentPartValue, normalizedToken)) return;
        setQuadraticFractionInputs((prev: [FractionEditorState, FractionEditorState]) => {
          const target = prev[quadraticActiveIndex];
          const next: [FractionEditorState, FractionEditorState] = [prev[0], prev[1]];
          const part = target.part;
          const maxLen = isDigit ? 6 : 7;
          const nextPartValue = `${part === "num" ? target.num : target.den}${normalizedToken}`;
          if (nextPartValue.length > maxLen) return prev;
          next[quadraticActiveIndex] = {
            ...target,
            num: part === "num" ? nextPartValue : target.num,
            den: part === "den" ? nextPartValue : target.den
          };
          return next;
        });
        if (currentEditor.part === "num") {
          clearQuadraticFractionAutoMoveTimer(quadraticActiveIndex);
          quadraticFractionAutoMoveTimerRefs.current[quadraticActiveIndex] = window.setTimeout(() => {
            setQuadraticFractionInputs((prev: [FractionEditorState, FractionEditorState]) => {
              const target = prev[quadraticActiveIndex];
              if (!target.enabled || target.part !== "num" || target.num.length === 0 || target.den.length > 0) {
                return prev;
              }
              const next: [FractionEditorState, FractionEditorState] = [prev[0], prev[1]];
              next[quadraticActiveIndex] = { ...target, part: "den" };
              return next;
            });
            quadraticFractionAutoMoveTimerRefs.current[quadraticActiveIndex] = null;
          }, FRACTION_AUTO_MOVE_DELAY_MS);
        }
        setResultMark(null);
        return;
      }

      if (!isQuadraticRootsQuestion && fractionInput.enabled) {
        const currentPartValue = fractionInput.part === "num" ? fractionInput.num : fractionInput.den;
        if (!isFractionPartTokenValid(currentPartValue, normalizedToken)) return;
        setFractionInput((prev: FractionEditorState) => {
          const part = prev.part;
          const maxLen = isDigit ? 12 : 13;
          const nextPartValue = `${part === "num" ? prev.num : prev.den}${normalizedToken}`;
          if (nextPartValue.length > maxLen) return prev;
          return {
            ...prev,
            num: part === "num" ? nextPartValue : prev.num,
            den: part === "den" ? nextPartValue : prev.den
          };
        });
        if (fractionInput.part === "num") {
          clearFractionAutoMoveTimer();
          fractionAutoMoveTimerRef.current = window.setTimeout(() => {
            setFractionInput((prev: FractionEditorState) => {
              if (!prev.enabled || prev.part !== "num" || prev.num.length === 0 || prev.den.length > 0) return prev;
              return { ...prev, part: "den" };
            });
            fractionAutoMoveTimerRef.current = null;
          }, FRACTION_AUTO_MOVE_DELAY_MS);
        }
        setResultMark(null);
        return;
      }

      const canAppendToken = (text: string, token: string) => {
        if (/^\d$/.test(token)) return true;
        if (token === "-") {
          if (!isSecondaryQuest) return text.length === 0;
          if (text.length === 0) return true;
          return /[\dxyabmnpiπ)]$/.test(text);
        }
        if (token === ".") {
          if (text.includes(".")) return false;
          if (text === "" || text === "-") return false;
          return true;
        }
        if (token === "×") {
          if (text.length === 0) return false;
          return /[\dxyabmnpiπ)]$/.test(text);
        }
        if (token === "+") {
          if (!isSecondaryQuest) return false;
          if (text.length === 0) return false;
          return /[\dxyabmnpiπ)]$/.test(text);
        }
        if ((VARIABLE_SYMBOLS as readonly string[]).includes(token)) {
          if (!isSecondaryQuest) return false;
          if (text.length === 0) return true;
          if (/[\^(/]$/.test(text)) return false;
          return true;
        }
        if (token === "^") {
          if (!isSecondaryQuest) return false;
          if (text.length === 0) return false;
          return /[\dxyabmnpiπ)]$/.test(text);
        }
        if (token === "()") {
          if (!isSecondaryQuest) return false;
          if (text.endsWith("^")) return false;
          return true;
        }
        if (token === "|x|") return isHighSchoolQuest;
        if (token === "sqrt(" || token === "log(") return isHighSchoolQuest;
        if (token === "π") return isHighSchoolQuest;
        if (token === "+/-") return false;
        return false;
      };
      if (!canAppendToken(currentText, normalizedToken)) return;

      if (isQuadraticRootsQuestion) {
        setQuadraticAnswers((prev: [string, string]) => {
          const next: [string, string] = [...prev] as [string, string];
          const maxLen = isDigit ? 6 : isHighSchoolQuest ? 24 : 7;
          if (next[quadraticActiveIndex].length >= maxLen) return prev;
          next[quadraticActiveIndex] =
            normalizedToken === "()" ? `${next[quadraticActiveIndex]}()` : `${next[quadraticActiveIndex]}${normalizedToken}`;
          return next;
        });
        setResultMark(null);
        return;
      }

      const appendInput = (symbol: string) => {
        setInput((prev: string) => prev + symbol);
      };
      if (input.length >= maxInputLength) return;
      if ((VARIABLE_SYMBOLS as readonly string[]).includes(normalizedToken)) {
        appendInput(normalizedToken);
      } else {
        appendInput(normalizedToken === "()" ? "()" : normalizedToken);
      }
      setResultMark(null);
    },
    [
      FRACTION_AUTO_MOVE_DELAY_MS,
      VARIABLE_SYMBOLS,
      clearFractionAutoMoveTimer,
      clearQuadraticFractionAutoMoveTimer,
      fractionAutoMoveTimerRef,
      fractionInput,
      input,
      isAnswerLockedByExplanation,
      isFractionPartTokenValid,
      isHighSchoolQuest,
      isQuadraticRootsQuestion,
      isSecondaryQuest,
      isStarting,
      quadraticActiveIndex,
      quadraticAnswers,
      quadraticFractionAutoMoveTimerRefs,
      quadraticFractionInputs,
      quest,
      setFractionInput,
      setInput,
      setQuadraticAnswers,
      setQuadraticFractionInputs,
      setResultMark
    ]
  );

  const correctCount = useMemo(
    () => results.filter((result: any) => result?.everWrong !== true).length,
    [results]
  );

  return {
    history,
    results,
    questionIndex,
    question,
    input,
    setQuestion,
    setInput,
    setResultMark,
    setHistory,
    setResults,
    setQuestionIndex,
    syncLearningUiFromSession,
    resetLearningSessionUi,
    finishLearningSession,
    applyFinishLearningSessionState,
    restartSameLevel,
    advanceQuestion,
    advanceQuestionWithDelay,
    recordResult,
    handleInput,
    correctCount,
    questionResults,
    setQuestionResults
  };
}
