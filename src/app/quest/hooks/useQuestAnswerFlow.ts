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
    console.log("SKIP HANDLE_ATTACK");
    return;
  }

  isHandlingRef.current = true;
  console.log("HANDLE_ATTACK_START");

  try {
    // console.log("SUBMIT_TRIGGER_START");
    // console.log("TRACE_ATTACK_ENTRY");
    if (!canExecuteAttack()) return;

    const answerText = buildAnswerText();
    // console.log("SUBMIT_INPUT_CHECK_FIXED", { input, answerText });
    // console.log("FINAL_SUBMIT", { input, answerText });
    if (!answerText.trim()) return;

    const verdict = judgeCurrentAnswer(answerText);

    setPracticeResult((prev: any) => {
  if (
    prev &&
    prev.ok === verdict.ok &&
    prev.correctAnswer === currentItem.answer
  ) {
    console.log("SKIP setPracticeResult");
    return prev;
  }

  console.log("SET setPracticeResult");

  return {
    ok: verdict.ok,
    correctAnswer: currentItem.answer
  };
});

    console.log("CALL setQuestionResults"); 

   setQuestionResults((prev: any) => {
  const prevEntry = prev[currentQuestionIndex];

  const everWrong = (prevEntry?.everWrong ?? false) || !verdict.ok;
  const firstWrongAnswer =
    prevEntry?.firstWrongAnswer ??
    (!verdict.ok ? answerText : undefined);

  const nextEntry = {
    prompt: currentItem.prompt,
    promptTex: currentItem.prompt_tex,
    userAnswer: answerText,
    correct: !everWrong,
    correctAnswer: currentItem.answer,
    everWrong,
    firstWrongAnswer
  };

  // ★ここが超重要（完全一致チェック）
  if (prevEntry && JSON.stringify(prevEntry) === JSON.stringify(nextEntry)) {
    console.log("SKIP setQuestionResults (STRICT SAFE)");
    return prev;
  }

  console.log("SET setQuestionResults (STRICT SAFE)");

  return {
    ...prev,
    [currentQuestionIndex]: nextEntry
  };
});

    if (isLearningSessionMode) {
      // console.log("SUBMIT_INPUT_CHECK", { input, answerText, time: Date.now() });
      // console.log("SUBMIT_BEFORE_API", { answerText, input });
      // console.log("SUBMIT_TRIGGER");
      // console.log("TRACE_SUBMIT_CALLED");
      await quest.submitLearningAnswer(
        quest.learningState,
        quest.learningSessionId,
        quest,
        answerText,
        verdict.ok
      );
    } else {
      void processAnswer(answerText, verdict);
    }
if (verdict.ok) {
  setCombo((prev: number) => {
    const next = prev + 1;

    if (prev === next) {
      console.log("SKIP setCombo");
      return prev;
    }

    console.log("SET setCombo");
    return next;
  });

  const charData = CHARACTERS[character];
  let hitMsg =
    charData.hits[
      Math.floor(Math.random() * charData.hits.length)
    ];

  if (combo + 1 >= 3) {
    hitMsg += ` （れんぞく ${combo + 1} かい！）`;
  }

  setMessage((prev: any) => {
    if (prev === hitMsg) {
      console.log("SKIP setMessage");
      return prev;
    }

    console.log("SET setMessage");
    return hitMsg;
  });

} else {
  setCombo((prev: number) => {
    const next = 0;

    if (prev === next) {
      console.log("SKIP setCombo");
      return prev;
    }

    console.log("SET setCombo");
    return next;
  });

  const charData = CHARACTERS[character];
  const missMsg =
    charData.misses[
      Math.floor(Math.random() * charData.misses.length)
    ];

  setMessage((prev: any) => {
    if (prev === missMsg) {
      console.log("SKIP setMessage");
      return prev;
    }

    console.log("SET setMessage");
    return missMsg;
  });
}


    if (isQuadraticRootsQuestion) {
      clearQuadraticFractionAutoMoveTimer(0);
      clearQuadraticFractionAutoMoveTimer(1);
      setQuadraticAnswers(["", ""]);
     setQuadraticFractionInputs((prev: any) => {
  const next = [
    { ...EMPTY_FRACTION_EDITOR },
    { ...EMPTY_FRACTION_EDITOR }
  ];

  if (JSON.stringify(prev) === JSON.stringify(next)) {
    console.log("SKIP setQuadraticFractionInputs");
    return prev;
  }

  console.log("SET setQuadraticFractionInputs");

  return next;
});
      setQuadraticActiveIndex(0);
    } else {
      clearFractionAutoMoveTimer();
      // setInput("");
      console.log("TRACE_SKIP_INPUT_CLEAR");
     setFractionInput((prev: any) => {
  const next = EMPTY_FRACTION_EDITOR;

  if (JSON.stringify(prev) === JSON.stringify(next)) {
    console.log("SKIP setFractionInput");
    return prev;
  }

  console.log("SET setFractionInput");

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
