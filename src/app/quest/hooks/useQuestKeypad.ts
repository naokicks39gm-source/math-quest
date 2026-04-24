import { useCanSubmitAnswer } from "./useCanSubmitAnswer";
import { useQuestAnswerFlow } from "./useQuestAnswerFlow";
import { isFractionEditorReady } from "../utils/isFractionEditorReady";
import {
  isValidAnswerText
} from "../../../utils/answerValidation";

export function useQuestKeypad(args: any) {
  const {
    quest,
    isStarting,
    isAnswerLockedByExplanation,
    isQuadraticRootsQuestion,
    quadraticFractionInputs,
    quadraticAnswers,
    quadraticActiveIndex,
    quadraticFractionAutoMoveTimerRefs,
    fractionAutoMoveTimerRef,
    setQuadraticFractionInputs,
    setQuadraticAnswers,
    setQuadraticActiveIndex,
    setFractionInput,
    fractionInput,
    setInput,
    setResultMark,
    inputMode,
    input,
    currentItem,
    currentType,
    isH1ReferenceOnlyQuestion,
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
    setMessage,
    isLearningSessionMode
  } = args;

  const clearFractionAutoMoveTimer = () => {
    if (fractionAutoMoveTimerRef.current) {
      window.clearTimeout(fractionAutoMoveTimerRef.current);
      fractionAutoMoveTimerRef.current = null;
    }
  };

  const clearQuadraticFractionAutoMoveTimer = (index: 0 | 1) => {
    const timer = quadraticFractionAutoMoveTimerRefs.current[index];
    if (timer) {
      window.clearTimeout(timer);
      quadraticFractionAutoMoveTimerRefs.current[index] = null;
    }
  };

  const clearAllFractionAutoMoveTimers = () => {
    clearFractionAutoMoveTimer();
    clearQuadraticFractionAutoMoveTimer(0);
    clearQuadraticFractionAutoMoveTimer(1);
  };

  const isFractionPartTokenValid = (current: string, token: string) => {
    if (/^\d$/.test(token)) return true;
    if (token === "-") return current.length === 0;
    return false;
  };

  const keypadAnswerKind = isQuadraticRootsQuestion
    ? "pair"
    : (currentType?.answer_format.kind ?? "int");
  const answerText = input ?? "";

  const { canSubmitCurrentAnswer } = useCanSubmitAnswer({
    isQuadraticRootsQuestion,
    quadraticFractionInputs,
    quadraticAnswers,
    fractionInput,
    input,
    keypadAnswerKind,
    answerText,
    isFractionEditorReady,
    isValidAnswerText
  });

  const canSubmitResolved = isH1ReferenceOnlyQuestion
    ? false
    : inputMode === "fraction"
      ? isFractionEditorReady(fractionInput)
      : canSubmitCurrentAnswer;
  

  const { handleAttack, handleDelete } = useQuestAnswerFlow({
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
  });

  return {
    handleAttack,
    handleDelete,
    canSubmitResolved,
    clearFractionAutoMoveTimer,
    clearQuadraticFractionAutoMoveTimer,
    clearAllFractionAutoMoveTimers,
    isFractionPartTokenValid
  };
}
