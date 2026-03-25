import { gradeAnswer } from "@/lib/grader";
import { fractionEditorToAnswerText } from "@/utils/answerValidation";

export function useQuestAnswerFlow(args: any) {
  const {
    quest,
    isStarting,
    isAnswerLockedByExplanation,
    isQuadraticRootsQuestion,
    quadraticFractionInputs,
    quadraticAnswers,
    quadraticActiveIndex,
    clearQuadraticFractionAutoMoveTimer,
    setQuadraticFractionInputs,
    setQuadraticAnswers,
    clearFractionAutoMoveTimer,
    setFractionInput,
    fractionInput,
    setInput,
    setResultMark,
    input,
    currentItem,
    currentType,
    isH1ReferenceOnlyQuestion,
    isLearningSessionMode,
    resolveExpectedFormFromPrompt,
    processAnswer,
    setQuestionResults,
    currentQuestionIndex,
    setPracticeResult,
    combo,
    setCombo,
    character,
    CHARACTERS,
    useFastLearningLoop,
    queueAdvanceAfterFeedback,
    autoNextEnabled,
    cooldownUntilRef,
    AUTO_ADVANCE_MS,
    autoNextTimerRef,
    wrongMarkTimerRef,
    FEEDBACK_FLASH_MS,
    nextQuestion,
    EMPTY_FRACTION_EDITOR,
    setQuadraticActiveIndex,
    setMessage
  } = args;
console.log("DEBUG setMessage value", setMessage);
console.log("DEBUG typeof", typeof setMessage);
  console.log("DEBUG setMessage", setMessage);
console.log("DEBUG typeof", typeof setMessage);


  const buildAnswerText = () => {
    return isQuadraticRootsQuestion
      ? `${quadraticFractionInputs[0].enabled
          ? fractionEditorToAnswerText(quadraticFractionInputs[0])
          : quadraticAnswers[0]
        },${
          quadraticFractionInputs[1].enabled
          ? fractionEditorToAnswerText(quadraticFractionInputs[1])
          : quadraticAnswers[1]
        }`
      : (
          fractionInput.enabled
            ? fractionEditorToAnswerText(fractionInput)
            : input
        );
  };

  const canExecuteAttack = () => {
    if (
      quest.status !== "playing" ||
      isStarting ||
      isAnswerLockedByExplanation ||
      !currentItem ||
      !currentType
    ) return false;

    if (isH1ReferenceOnlyQuestion) return false;

    return true;
  };

  const judgeCurrentAnswer = (answerText: string) => {
    const expectedForm =
      resolveExpectedFormFromPrompt(
        `${currentItem.prompt} ${currentItem.prompt_tex ?? ""}`
      );

    return gradeAnswer(
      answerText,
      currentItem.answer,
      currentType.answer_format,
      {
        typeId: currentType.type_id,
        expectedForm
      }
    );
  };

  const handleDelete = () => {
    if (quest.status !== "playing" || isStarting || isAnswerLockedByExplanation) return;
    if (isQuadraticRootsQuestion && quadraticFractionInputs[quadraticActiveIndex].enabled) {
      clearQuadraticFractionAutoMoveTimer(quadraticActiveIndex);
      setQuadraticFractionInputs((prev: any) => {
        const target = prev[quadraticActiveIndex];
        const next: [any, any] = [prev[0], prev[1]];
        if (target.part === "den") {
          if (target.den.length > 0) {
            next[quadraticActiveIndex] = { ...target, den: target.den.slice(0, -1) };
          } else {
            next[quadraticActiveIndex] = { ...target, part: "num" };
          }
          return next;
        }
        if (target.num.length > 0) {
          next[quadraticActiveIndex] = { ...target, num: target.num.slice(0, -1) };
          return next;
        }
        next[quadraticActiveIndex] = { ...EMPTY_FRACTION_EDITOR };
        return next;
      });
      setResultMark(null);
      return;
    }
    if (!isQuadraticRootsQuestion && fractionInput.enabled) {
      clearFractionAutoMoveTimer();
      setFractionInput((prev: any) => {
        if (prev.part === "den") {
          if (prev.den.length > 0) return { ...prev, den: prev.den.slice(0, -1) };
          return { ...prev, part: "num" };
        }
        if (prev.num.length > 0) return { ...prev, num: prev.num.slice(0, -1) };
        return { ...EMPTY_FRACTION_EDITOR };
      });
      setResultMark(null);
      return;
    }
    if (isQuadraticRootsQuestion) {
      setQuadraticAnswers((prev: any) => {
        const next: [string, string] = [...prev] as [string, string];
        next[quadraticActiveIndex] = next[quadraticActiveIndex].slice(0, -1);
        return next;
      });
      setResultMark(null);
      return;
    }
    setInput((prev: string) => prev.slice(0, -1));
    setResultMark(null);
  };

  const handleAttack = () => {
    if (!canExecuteAttack()) return;
    const answerText = buildAnswerText();
    if (!answerText.trim()) return;

    const verdict = judgeCurrentAnswer(answerText);
    console.log("ANSWER SUBMIT",{
      answer: answerText,
      correct: verdict.ok,
      attemptCount: quest.learningAttemptCount
    })
    setPracticeResult({ ok: verdict.ok, correctAnswer: currentItem.answer });
    setQuestionResults((prev: any) => ({
      ...prev,
      [currentQuestionIndex]: (() => {
        const prevEntry = prev[currentQuestionIndex];
        const everWrong = (prevEntry?.everWrong ?? false) || !verdict.ok;
        const firstWrongAnswer =
          prevEntry?.firstWrongAnswer ??
          (!verdict.ok ? answerText : undefined);
        return {
          prompt: currentItem.prompt,
          promptTex: currentItem.prompt_tex,
          userAnswer: answerText,
          correct: !everWrong,
          correctAnswer: currentItem.answer,
          everWrong,
          firstWrongAnswer
        };
      })()
    }));

    void processAnswer(answerText, verdict);

    if (verdict.ok) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      const charData = CHARACTERS[character];
      let hitMsg = charData.hits[Math.floor(Math.random() * charData.hits.length)];
      if (newCombo >= 3) hitMsg += ` （れんぞく ${newCombo} かい！）`;
      setMessage(hitMsg);
      if (useFastLearningLoop) {
        queueAdvanceAfterFeedback(verdict);
      } else if (autoNextEnabled) {
        cooldownUntilRef.current = Date.now() + AUTO_ADVANCE_MS;
        if (autoNextTimerRef.current) window.clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = window.setTimeout(() => {
          autoNextTimerRef.current = null;
          nextQuestion();
        }, AUTO_ADVANCE_MS);
      }
    } else {
      setCombo(0);
      const charData = CHARACTERS[character];
      setMessage(charData.misses[Math.floor(Math.random() * charData.misses.length)]);
      if (useFastLearningLoop && !isLearningSessionMode) {
        queueAdvanceAfterFeedback(verdict);
      } else {
        if (wrongMarkTimerRef.current) {
          window.clearTimeout(wrongMarkTimerRef.current);
        }
        setResultMark("wrong");
        wrongMarkTimerRef.current = window.setTimeout(() => {
          setResultMark(null);
          wrongMarkTimerRef.current = null;
        }, FEEDBACK_FLASH_MS);
      }
    }

    if (isQuadraticRootsQuestion) {
      clearQuadraticFractionAutoMoveTimer(0);
      clearQuadraticFractionAutoMoveTimer(1);
      setQuadraticAnswers(["", ""]);
      setQuadraticFractionInputs([{ ...EMPTY_FRACTION_EDITOR }, { ...EMPTY_FRACTION_EDITOR }]);
      setQuadraticActiveIndex(0);
    } else {
      clearFractionAutoMoveTimer();
      setInput("");
      setFractionInput({ ...EMPTY_FRACTION_EDITOR });
    }
  };

  return {
    buildAnswerText,
    judgeCurrentAnswer,
    handleAttack,
    handleDelete
  };
}
