import { gradeAnswer } from "@/lib/grader";
import { fractionEditorToAnswerText } from "@/utils/answerValidation";
import { useRef } from "react";

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

  const isHandlingRef = useRef(false);
 const handleAttack = async () => {
  if (isHandlingRef.current) {
    return;
  }

   isHandlingRef.current = true;

  try {
   if (!canExecuteAttack()) return;

    const answerText = buildAnswerText();
    if (!answerText.trim()) return;

    const verdict = judgeCurrentAnswer(answerText);

    setPracticeResult((prev: any) => {
  if (
    prev &&
    prev.ok === verdict.ok &&
    prev.correctAnswer === currentItem.answer
  ) {
    return prev;
  }

  return {
    ok: verdict.ok,
    correctAnswer: currentItem.answer
  };
});

    setQuestionResults((prev: any) => {
      const prevEntry = prev[currentQuestionIndex];
      const everWrong = (prevEntry?.everWrong ?? false) || !verdict.ok;
      const firstWrongAnswer =
        prevEntry?.firstWrongAnswer ??
        (!verdict.ok ? answerText : undefined);

      if (
        prevEntry &&
        prevEntry.prompt === currentItem.prompt &&
        prevEntry.promptTex === currentItem.prompt_tex &&
        prevEntry.userAnswer === answerText &&
        prevEntry.correct === !everWrong &&
        prevEntry.correctAnswer === currentItem.answer &&
        prevEntry.everWrong === everWrong &&
        prevEntry.firstWrongAnswer === firstWrongAnswer
      ) {
        return prev;
      }

      return {
        ...prev,
        [currentQuestionIndex]: {
          prompt: currentItem.prompt,
          promptTex: currentItem.prompt_tex,
          userAnswer: answerText,
          correct: !everWrong,
          correctAnswer: currentItem.answer,
          everWrong,
          firstWrongAnswer
        }
      };
    });

    await processAnswer(answerText, verdict);
    const charData = CHARACTERS[character];

    setCombo((prev: number) => {
      const next = verdict.ok ? prev + 1 : 0;

      if (prev === next) {
        return prev;
      }

      return next;
    });

    let hitMsg =
      charData.hits[
        Math.floor(Math.random() * charData.hits.length)
      ];

    if (verdict.ok && combo + 1 >= 3) {
      hitMsg += ` （れんぞく ${combo + 1} かい！）`;
    }

    const nextMessage = verdict.ok
      ? hitMsg
      : charData.misses[Math.floor(Math.random() * charData.misses.length)];

    setMessage((prev: any) => {
      if (prev === nextMessage) {
        return prev;
      }

      return nextMessage;
    });


    if (isQuadraticRootsQuestion) {
      clearQuadraticFractionAutoMoveTimer(0);
      clearQuadraticFractionAutoMoveTimer(1);
      setQuadraticAnswers(["", ""]);
      setQuadraticFractionInputs((prev: any) => {
        const next = [
          { ...EMPTY_FRACTION_EDITOR },
          { ...EMPTY_FRACTION_EDITOR }
        ];

        const isSame =
          Array.isArray(prev) &&
          prev.length === 2 &&
          prev.every((entry: any, index: number) => (
            entry?.enabled === next[index].enabled &&
            entry?.num === next[index].num &&
            entry?.den === next[index].den &&
            entry?.part === next[index].part
          ));

        if (isSame) {
          return prev;
        }

        return next;
      });
      setQuadraticActiveIndex(0);
    } else {
      clearFractionAutoMoveTimer();
      // setInput("");
      setFractionInput((prev: any) => {
        const next = EMPTY_FRACTION_EDITOR;

        if (
          prev?.enabled === next.enabled &&
          prev?.num === next.num &&
          prev?.den === next.den &&
          prev?.part === next.part
        ) {
          return prev;
        }

        return { ...EMPTY_FRACTION_EDITOR };
      });
    }
    } finally {
    isHandlingRef.current = false;
  }
  };

  return {
    buildAnswerText,
    judgeCurrentAnswer,
    handleAttack,
    handleDelete
  };

  
}
