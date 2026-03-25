import { useEffect, useMemo, useRef } from "react";

import { useQuestionReset } from "./useQuestionReset";
import { useQuestSessionGlue } from "./useQuestSessionGlue";
import { useQuestSessionFlow } from "./useQuestSessionFlow";
import { useQuestLearningFlow } from "./useQuestLearningFlow";
import { useQuestStock, describeStockReason } from "./useQuestStock";
import { useQuestStockEffects } from "./useQuestStockEffects";
import { useQuestResultLogic } from "./useQuestResultLogic";
import { useQuestCallbacks } from "./useQuestCallbacks";
import { useSkipFromExplanation } from "./useSkipFromExplanation";
import { useQuestKeypad } from "./useQuestKeypad";
import { useQuestGestures } from "./useQuestGestures";
import { useQuestRecognitionFlow } from "./useQuestRecognitionFlow";
import { useQuestEffects } from "./useQuestEffects";
import { useMemoCanvas } from "./useMemoCanvas";
import { useLearningRecovery } from "./useLearningRecovery";
import { useLearningRouting } from "./useLearningRouting";
import { useLearningOrchestrator } from "./useLearningOrchestrator";
import { useLearningSessionController } from "./useLearningSessionController";

import { getPracticeSkill, practiceSkills } from "@/lib/learningSkillCatalog";
import { learningPatternCatalog } from "@/lib/learningPatternCatalog";
import { getSkillTree } from "packages/skill-system/skillTree";

export function useQuestOrchestration(args: any) {
  const {
    quest,
    selection,
    state,
    refs,
    constants
  } = args;

  const {
    combo,
    setCombo,
    inputMode,
    fractionInput,
    setFractionInput,
    character,
    isRecognizing,
    setIsRecognizing,
    recognizedNumber,
    setRecognizedNumber,
    quadraticAnswers,
    setQuadraticAnswers,
    quadraticFractionInputs,
    setQuadraticFractionInputs,
    quadraticActiveIndex,
    setQuadraticActiveIndex,
    isModelReady,
    setIsModelReady,
    is2DigitModelReady,
    setIs2DigitModelReady,
    previewImages,
    setPreviewImages,
    isStarting,
    hasStarted,
    setHasStarted,
    setStartPopup,
    inkFirstMode,
    setAutoJudgeEnabled,
    settingsOpen,
    setSettingsOpen,
    itemIndex,
    setItemIndex,
    learningAttemptCount,
    setLearningAttemptCount,
    practiceResult,
    setPracticeResult,
    resultMark,
    setResultMark,
    input,
    setInput,
    setLastAutoDrawExpected,
    setAutoDrawBatchSummary,
    studentId,
    setStudentId,
    activeSessionId,
    setActiveSessionId,
    sessionMailStatus,
    setSessionMailStatus,
    sessionActionLoading,
    setSessionActionLoading,
    sessionError,
    setSessionError,
    learningState,
    setLearningState,
    learningResultSkillId,
    setLearningResultSkillId,
    setLearningError,
    setLearningSessionId,
    setQuizBuildError,
    typeStocks,
    setTypeStocks,
    setStockShortages,
    stockReady,
    setStockReady,
    setActivePickMeta,
    quizItems,
    setQuizItems,
    retryNonce,
    showSkillTree,
    setShowSkillTree,
    visibleCanvasSize,
    setVisibleCanvasSize,
    memoCanvasSize,
    setMemoCanvasSize,
    calcZoom,
    setCalcZoom,
    calcPan,
    setCalcPan,
    showGradeTypePicker,
    setShowGradeTypePicker,
    expandedGradePicker,
    setExpandedGradePicker,
    expandedGradeList,
    setExpandedGradeList,
    expandedProblemPicker,
    setExpandedProblemPicker,
    pendingGradeId,
    setPendingGradeId,
    showHighSchoolHint,
    setShowHighSchoolHint,
    plusMinusPopupOpen,
    setPlusMinusPopupOpen,
    plusMinusCandidate,
    setPlusMinusCandidate,
    plusMinusPopupAnchor,
    setPlusMinusPopupAnchor,
    isPinchingMemo,
    setIsPinchingMemo,
    showSecondaryHint,
    setShowSecondaryHint,
    showSecondaryExplanation,
    setShowSecondaryExplanation,
    showElementaryHint,
    setShowElementaryHint,
    showElementaryExplanation,
    setShowElementaryExplanation,
    memoStrokes,
    setMemoStrokes,
    setMemoRedoStack
  } = state;

  const {
    canvasRef,
    memoCanvasRef,
    drawAreaRef,
    currentCardRef,
    qaRowRef,
    qaPromptRef,
    qaPromptContentRef,
    qaAnswerRef,
    qaAnswerContentRef,
    currentGradeOptionRef,
    currentProblemOptionRef,
    problemOptionsScrollRef,
    memoCanvasHostRef,
    autoRecognizeTimerRef,
    fractionAutoMoveTimerRef,
    quadraticFractionAutoMoveTimerRefs,
    lastDrawAtRef,
    isDrawingRef,
    resultAdvanceTimerRef,
    startTimersRef,
    sessionStartTrackedRef,
    inFlightRef,
    pendingRecognizeRef,
    forcedDigitsRef,
    cooldownUntilRef,
    autoNextTimerRef,
    wrongMarkTimerRef,
    idleCheckTimerRef,
    plusMinusPressRef,
    plusMinusWindowHandlersRef,
    plusMinusTouchHandlersRef
  } = refs;

  const {
    FEEDBACK_FLASH_MS,
    AUTO_ADVANCE_MS,
    EMPTY_FRACTION_EDITOR,
    MIN_MEMO_ZOOM,
    MAX_MEMO_ZOOM,
    MEMO_BRUSH_WIDTH,
    MEMO_WORKSPACE_SCALE,
    OUTER_MARGIN,
    FRACTION_AUTO_MOVE_DELAY_MS,
    E1_LEVEL_OPTIONS,
    J1_LEVEL_OPTIONS,
    getTargetQuestionCount,
    shouldForceFreshOrderSession,
    resolveExpectedFormFromPrompt,
    isMixedFractionQuestion,
    isQuadraticRootsType,
    isH1ReferenceOnlyType,
    buildFreshLearningState,
    clearPersistedLearningSession,
    loadStateFromClient,
    LEARNING_STATE_KEY,
    updateDailyStreak,
    trackAnalyticsEvent,
    gradeAnswer,
    canUseKeyToken,
    VARIABLE_SYMBOLS,
    clamp
  } = constants;

  const learningActions = args.learningActions;

  const learningRecovery = useLearningRecovery({
    quest,
    setLearningSessionId,
    setLearningResultSkillId,
    setItemIndex,
    setCombo,
    setLearningAttemptCount
  });

  const learningRouting = useLearningRouting({
    skillIdFromQuery: selection.skillIdFromQuery,
    setLearningSessionId,
    clearLearningRecoveryStorage: learningRecovery.clearLearningRecoveryStorage,
    clearPersistedLearningSession,
    setLearningResult: quest.setLearningResult
  });

  const learningOrchestrator = useLearningOrchestrator({
    quest,
    setLearningSessionId,
    setItemIndex,
    setCombo,
    setLearningAttemptCount,
    isStarting,
    input,
    setInput,
    setResultMark,
    quadraticAnswers,
    quadraticActiveIndex,
    setQuadraticFractionInputs,
    setQuadraticAnswers,
    setFractionInput,
    fractionInput,
    quadraticFractionInputs,
    quadraticFractionAutoMoveTimerRefs,
    fractionAutoMoveTimerRef,
    VARIABLE_SYMBOLS,
    setPracticeResult,
    setRecognizedNumber,
    setQuadraticActiveIndex,
    setPreviewImages,
    setMessage: quest.setMessage,
    canvasRef: refs.canvasRef,
    sessionStartTrackedRef
  });

  const postJson = async (url: string, payload: unknown) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(String(json?.error ?? "request_failed"));
    }
    return json;
  };

  const createQuestion = constants.createQuestion;

  const sessionStartInFlightRef = useRef<Promise<string | null> | null>(null);
  const forceFractionRecognitionRef = useRef(false);
  const forceMixedRecognitionRef = useRef(false);
  const forcedFractionAnswerRef = useRef<string | null>(null);
  const forcedExpectedFormRef = useRef<any>(null);
  const memoStrokesRef = useRef<any[]>([]);
  const memoActiveStrokeRef = useRef<any>(null);
  const memoActivePointerIdRef = useRef<number | null>(null);
  const memoDrawRafRef = useRef<number | null>(null);
  const memoPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const memoPinchStartRef = useRef<any>(null);
  const finishGuardRef = useRef(false);
  const advanceGuardRef = useRef(false);
  const nextQuestionRef = useRef<() => void>(() => {});

  const memoCanvas = useMemoCanvas({
    memoCanvasRef,
    memoCanvasHostRef,
    drawAreaRef,
    memoStrokesRef,
    memoActiveStrokeRef,
    memoActivePointerIdRef,
    memoDrawRafRef,
    memoPointersRef,
    memoPinchStartRef,
    memoCanvasSize,
    memoStrokes,
    questStatus: quest.status,
    calcZoom,
    calcPan,
    isPinchingMemo,
    setMemoCanvasSize,
    setVisibleCanvasSize,
    setCalcZoom,
    setCalcPan,
    setMemoRedoStack,
    setMemoStrokes,
    setIsPinchingMemo,
    MIN_MEMO_ZOOM,
    MAX_MEMO_ZOOM,
    MEMO_BRUSH_WIDTH,
    MEMO_WORKSPACE_SCALE,
    OUTER_MARGIN,
    clamp
  });

  const currentLearningSkillId = quest.session?.skillId ?? learningResultSkillId ?? null;
  const currentSkillProgress = currentLearningSkillId ? learningState?.skillProgress?.[currentLearningSkillId] ?? null : null;
  const currentPatternPool = currentLearningSkillId
    ? learningPatternCatalog.filter((entry) => entry.skillId === currentLearningSkillId).map((entry) => entry.patternId)
    : [];
  const currentSessionSeed = selection.params.get("sessionId") ?? learningState?.session?.skillId ?? "-";
  const skillTree = useMemo(() => (learningState ? getSkillTree(learningState) : []), [learningState]);

  const resultLogic = useQuestResultLogic({
    quest,
    learningState,
    currentLearningSkillId,
    getPracticeSkill,
    practiceSkills,
    skillTree
  });
  const {
    resolvedLearningResult,
    recommendedLearningSkillId,
    currentSkillNode,
    currentSkillRequiredXP,
    currentSkillXP,
    recommendedSkillNode
  } = resultLogic;
  const useFastLearningLoop = Boolean(selection.skillIdFromQuery);

  const clearAllFractionAutoMoveTimers = () => keypad.clearAllFractionAutoMoveTimers();

  const { resetQuestionUi } = useQuestionReset({
    advanceGuardRef,
    autoNextTimerRef,
    wrongMarkTimerRef,
    clearAllFractionAutoMoveTimers,
    setPracticeResult,
    setResultMark,
    setRecognizedNumber,
    setInput,
    setFractionInput,
    setQuadraticAnswers,
    setQuadraticFractionInputs,
    setQuadraticActiveIndex,
    setPreviewImages,
    canvasRef,
    setShowHighSchoolHint,
    setShowSecondaryHint,
    setShowSecondaryExplanation,
    setShowElementaryHint,
    setShowElementaryExplanation,
    EMPTY_FRACTION_EDITOR
  });

  const sessionGlue = useQuestSessionGlue({
    quest,
    router: selection.router,
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
    setQuestionResults: learningOrchestrator.setQuestionResults,
    setItemIndex,
    setCombo,
    setMessage: quest.setMessage,
    resetQuestionUi,
    setLearningState,
    setLearningResult: quest.setLearningResult,
    setLearningError: quest.setLearningError,
    setSettingsOpen,
    trackAnalyticsEvent,
    LEARNING_STATE_KEY
  });

  const session = useQuestSessionFlow({
    quest,
    retryFromQuery: selection.retryFromQuery,
    learningRecovery,
    setLearningError: quest.setLearningError,
    setLearningResultSkillId,
    setQuizBuildError,
    setQuestionResults: learningOrchestrator.setQuestionResults,
    resetQuestionUi,
    clearPersistedLearningSession,
    loadStateFromClient,
    buildFreshLearningState,
    trackAnalyticsEvent,
    skillIdFromQuery: selection.skillIdFromQuery,
    setLearningSessionId,
    updateDailyStreak,
    setLearningResult: quest.setLearningResult,
    setMessage: quest.setMessage,
    setResultMark,
    finishGuardRef,
    advanceGuardRef,
    autoNextTimerRef,
    wrongMarkTimerRef,
    learningState,
    learningSessionId: state.learningSessionId,
    sessionStartTrackedRef,
    shouldForceFreshOrderSession,
    ensureActiveSession: sessionGlue.ensureActiveSession,
    postJson,
    setSessionError,
    isLearningSessionMode: Boolean(selection.skillIdFromQuery),
    learningActions,
    resetLearningSessionUi: learningOrchestrator.resetLearningSessionUi
  });

  console.log("DEBUG orchestration calling controller", {
    skillId: selection.skillIdFromQuery,
    fresh: selection.freshFromQuery,
    retry: selection.retryFromQuery,
    session: quest.session?.skillId ?? null,
    currentProblem: quest.currentProblem?.problemId ?? null,
    stock: typeStocks?.size ?? 0
  });
  useLearningSessionController({
    isLearningSessionMode: Boolean(selection.skillIdFromQuery),
    skillIdFromQuery: selection.skillIdFromQuery,
    questSession: quest.session,
    questStatus: quest.status,
    questLearningResult: quest.learningResult,
    questLearningLoading: quest.learningLoading,
    setLearningError: quest.setLearningError,
    setLearningLoading: quest.setLearningLoading,
    setLearningResult: quest.setLearningResult,
    syncLearningUiFromSession: learningOrchestrator.syncLearningUiFromSession,
    clearLearningRecoveryStorage: sessionGlue.clearLearningRecoveryStorage,
    loadLearningRecovery: sessionGlue.loadLearningRecovery,
    freshFromQuery: selection.freshFromQuery,
    retryFromQuery: selection.retryFromQuery,
    purgeFreshLearningRecovery: sessionGlue.purgeFreshLearningRecovery,
    clearPersistedLearningSession,
    resetLearningSessionUi: learningOrchestrator.resetLearningSessionUi,
    resumeLearningSession: session.resumeSession,
    startLearningSession: session.startSession
  });

  useEffect(() => {
    console.log("DEBUG initial problem effect fired");
    const first = createQuestion();
    console.log("DEBUG setQuestion called", first?.id);
    learningOrchestrator.setQuestion(first);
  }, [learningOrchestrator.setQuestion]);

  useEffect(() => {
    return () => {
      if (autoRecognizeTimerRef.current) window.clearTimeout(autoRecognizeTimerRef.current);
      if (resultAdvanceTimerRef.current) window.clearTimeout(resultAdvanceTimerRef.current);
      startTimersRef.current.forEach((timer: number) => window.clearTimeout(timer));
      if (autoNextTimerRef.current) window.clearTimeout(autoNextTimerRef.current);
      if (wrongMarkTimerRef.current) window.clearTimeout(wrongMarkTimerRef.current);
      if (idleCheckTimerRef.current) window.clearInterval(idleCheckTimerRef.current);
      clearAllFractionAutoMoveTimers();
    };
  }, []);

  const stock = useQuestStock({
    grades: selection.grades,
    categoryFromQuery: selection.categoryFromQuery,
    levelFromQuery: selection.levelFromQuery,
    typeFromQuery: selection.typeFromQuery,
    selectedType: selection.selectedType,
    typeStocks,
    getTargetQuestionCount,
    levelInfo: selection.levelInfo,
    patternIdFromQuery: selection.patternIdFromQuery,
    difficultyFromQuery: selection.difficultyFromQuery,
    E1_LEVEL_OPTIONS,
    J1_LEVEL_OPTIONS
  });
  const stockView = stock.stockView;

  useQuestStockEffects({
    isLearningSessionMode: Boolean(selection.skillIdFromQuery),
    hasLevelQuery: stockView.hasLevelQuery,
    retryNonce,
    buildStockState: stock.buildStockState,
    pickQuestSet: stock.pickQuestSet,
    setTypeStocks,
    setStockShortages,
    setStockReady,
    clearAllFractionAutoMoveTimers,
    stockReady,
    setQuizItems,
    setItemIndex,
    setQuestionResults: learningOrchestrator.setQuestionResults,
    questSetStatus: quest.setStatus,
    setQuizBuildError,
    setActivePickMeta,
    setStatus: quest.setStatus,
    setPracticeResult,
    setResultMark,
    setRecognizedNumber,
    setInput,
    setFractionInput,
    EMPTY_FRACTION_EDITOR,
    setQuadraticAnswers,
    setQuadraticFractionInputs,
    setQuadraticActiveIndex,
    setMessage: quest.setMessage,
    hasPatternQuery: stockView.hasPatternQuery,
    patternIdFromQuery: selection.patternIdFromQuery,
    levelGradeId: selection.levelGradeId,
    levelFromQuery: selection.levelFromQuery,
    typeStocks,
    activeTypeId: stockView.activeTypeId,
    quizSize: stockView.quizSize,
    difficultyFromQuery: selection.difficultyFromQuery
  });

  const learning = useQuestLearningFlow({
    quest,
    isLearningSessionMode: Boolean(selection.skillIdFromQuery),
    quizItems,
    itemIndex,
    selectedType: selection.selectedType,
    levelFromQuery: selection.levelFromQuery,
    learningState,
    pendingGradeId,
    grades: selection.grades,
    currentSkillXP,
    currentSkillRequiredXP,
    correctCount: learningOrchestrator.correctCount,
    targetQuestionCount: 0,
    isQuadraticRootsType,
    isH1ReferenceOnlyType,
    FEEDBACK_FLASH_MS,
    AUTO_ADVANCE_MS,
    wrongMarkTimerRef,
    autoNextTimerRef,
    autoRecognizeTimerRef,
    pendingRecognizeRef,
    cooldownUntilRef,
    advanceGuardRef,
    setResultMark,
    nextQuestion: () => nextQuestionRef.current(),
    E1_LEVEL_OPTIONS,
    J1_LEVEL_OPTIONS,
    practiceResult,
    useFastLearningLoop,
    showElementaryExplanation,
    showSecondaryExplanation
  });
  const learningView = learning.learningView;
  const { queueAdvanceAfterFeedback } = learning;
  const learningResultUi = learning.handleLearningResult({
    practiceOk: practiceResult?.ok,
    questStatus: quest.status
  });

  useQuestEffects({
    isLearningSessionMode: Boolean(selection.skillIdFromQuery),
    freshFromQuery: selection.freshFromQuery,
    retryFromQuery: selection.retryFromQuery,
    skillIdFromQuery: selection.skillIdFromQuery,
    quest,
    currentLearningSkillId,
    resolvedLearningResult,
    skillId: learningRouting.resolveSkillId(),
    setLearningResultSkillId,
    setQuestionResults: learningOrchestrator.setQuestionResults,
    purgeFreshLearningRecovery: sessionGlue.purgeFreshLearningRecovery,
    hasStarted,
    sessionStartTrackedRef,
    normalizedLearningSession: learningView.normalizedLearningSession,
    memoStrokesRef,
    memoStrokes,
    inkFirstMode,
    setAutoJudgeEnabled,
    shouldAutoFinishLearningSession: learningView.shouldAutoFinishLearningSession,
    finishSession: session.finishSession,
    learningActions,
    learningState,
    learningSessionId: state.learningSessionId,
    finishGuardRef,
    advanceGuardRef,
    autoNextTimerRef,
    wrongMarkTimerRef,
    learningRecovery,
    setLearningSessionId,
    updateDailyStreak,
    trackAnalyticsEvent,
    setLearningResultSkillIdRef: setLearningResultSkillId,
    setLearningResult: quest.setLearningResult,
    setMessage: quest.setMessage,
    setResultMark,
    setLearningError: quest.setLearningError,
    setQuizBuildError,
    currentGradeId: learningView.currentGradeId,
    setPendingGradeId,
    setCombo,
    currentType: learningView.currentType,
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
    selectedType: selection.selectedType
  });

  const totalQuizQuestions = Boolean(selection.skillIdFromQuery)
    ? Math.max(1, quest.session?.problems.length ?? constants.DEFAULT_TOTAL_QUESTIONS)
    : Math.max(1, Math.min(stockView.targetQuestionCount, quizItems.length || stockView.targetQuestionCount));
  const uiText = learningView.isEarlyElementary
    ? {
        summary: `${totalQuizQuestions}もん かんりょう / せいかい ${learningOrchestrator.correctCount}もん`,
        yourAnswer: "あなた",
        correct: "⭕ せいかい",
        incorrect: "❌ ざんねん",
        nextLevel: "つぎのレベルにすすむ",
        retryLevel: "もういちど べんきょうする",
        retrySame: "もういちど おなじ もんだいを れんしゅうする",
        endWithReport: "おわりにする（レポート配信）",
        noItems: "このカテゴリ/タイプには もんだいが ありません。",
        selectType: "タイプを えらんでください。",
        judge: "はんてい",
        nextQuestion: "つぎの もんだいへ",
        reset: "けす",
        answerLabel: "こたえ"
      }
    : {
        summary: `${totalQuizQuestions}題完了 / 正解 ${learningOrchestrator.correctCount}題`,
        yourAnswer: "あなた",
        correct: "⭕ 正解",
        incorrect: "❌ 不正解",
        nextLevel: "次のレベルに進む",
        retryLevel: "もう一度勉強する",
        retrySame: "同じ問題を練習する",
        endWithReport: "学習終了（レポート配信）",
        noItems: "このカテゴリ/タイプには表示できる問題がありません。",
        selectType: "タイプを選択してください。",
        judge: "判定",
        nextQuestion: "次の問題へ",
        reset: "リセット",
        answerLabel: "答え"
      };

  const callbacks = useQuestCallbacks({
    quest,
    isLearningSessionMode: Boolean(selection.skillIdFromQuery),
    currentSkillXP,
    currentSkillRequiredXP,
    learningActions,
    learningState,
    learningSessionId: state.learningSessionId,
    skillIdFromQuery: selection.skillIdFromQuery,
    finishGuardRef,
    advanceGuardRef,
    autoNextTimerRef,
    wrongMarkTimerRef,
    learningRecovery,
    setLearningSessionId,
    updateDailyStreak,
    trackAnalyticsEvent,
    setLearningResultSkillId,
    setLearningResult: quest.setLearningResult,
    setMessage: quest.setMessage,
    setResultMark,
    setLearningError: quest.setLearningError,
    setQuizBuildError,
    resetQuestionUi,
    setItemIndex,
    totalQuizQuestions,
    levelInfo: selection.levelInfo,
    E1_LEVEL_OPTIONS,
    J1_LEVEL_OPTIONS,
    router: selection.router,
    allTypePaths: stockView.allTypePaths,
    currentType: learningView.currentType,
    selectedType: selection.selectedType,
    learningRouting,
    recommendedLearningSkillId,
    currentLearningSkillId,
    finishSession: session.finishSession,
    skipFromExplanation: undefined
  });
  nextQuestionRef.current = callbacks.onNextQuestion;

  const { skipFromExplanation } = useSkipFromExplanation({
    quest,
    currentItem: learningView.currentItem,
    currentQuestionIndex: learningView.currentQuestionIndex,
    setQuestionResults: learningOrchestrator.setQuestionResults,
    setPracticeResult,
    setShowSecondaryExplanation,
    setShowSecondaryHint,
    setShowElementaryHint,
    setShowElementaryExplanation,
    isLearningSessionMode: Boolean(selection.skillIdFromQuery),
    resetQuestionUi,
    nextQuestion: callbacks.onNextQuestion
  });

  const keypad = useQuestKeypad({
    quest,
    isStarting,
    isAnswerLockedByExplanation: learningView.isAnswerLockedByExplanation,
    isQuadraticRootsQuestion: learningView.isQuadraticRootsQuestion,
    quadraticFractionInputs,
    quadraticAnswers,
    quadraticActiveIndex,
    quadraticFractionAutoMoveTimerRefs,
    setQuadraticFractionInputs,
    setQuadraticAnswers,
    fractionAutoMoveTimerRef,
    setFractionInput,
    fractionInput,
    setInput,
    setResultMark,
    input,
    currentItem: learningView.currentItem,
    currentType: learningView.currentType,
    isH1ReferenceOnlyQuestion: learningView.isH1ReferenceOnlyQuestion,
    resolveExpectedFormFromPrompt,
    processAnswer: (answerText: string, verdict: { ok: boolean }) =>
      session.processAnswer(answerText, verdict, { currentItem: learningView.currentItem, currentType: learningView.currentType }),
    setQuestionResults: learningOrchestrator.setQuestionResults,
    currentQuestionIndex: learningView.currentQuestionIndex,
    setPracticeResult,
    combo,
    setCombo,
    character,
    CHARACTERS: constants.CHARACTERS,
    useFastLearningLoop,
    queueAdvanceAfterFeedback,
    autoNextEnabled: state.autoNextEnabled,
    cooldownUntilRef,
    AUTO_ADVANCE_MS,
    autoNextTimerRef,
    wrongMarkTimerRef,
    FEEDBACK_FLASH_MS,
    nextQuestion: callbacks.onNextQuestion,
    EMPTY_FRACTION_EDITOR,
    setQuadraticActiveIndex,
    setMessage: quest.setMessage
  });

  useQuestGestures({
    quest,
    isStarting,
    itemIndex,
    currentType: learningView.currentType,
    plusMinusPressRef,
    plusMinusWindowHandlersRef,
    plusMinusTouchHandlersRef,
    setPlusMinusPopupOpen,
    setPlusMinusCandidate,
    setPlusMinusPopupAnchor,
    PLUS_MINUS_POPUP_SWITCH_PX: constants.PLUS_MINUS_POPUP_SWITCH_PX,
    PLUS_MINUS_TAP_DEADZONE_PX: constants.PLUS_MINUS_TAP_DEADZONE_PX,
    PLUS_MINUS_LONG_PRESS_MS: constants.PLUS_MINUS_LONG_PRESS_MS,
    onInput: learningOrchestrator.handleInput
  });

  const recognitionFlow = useQuestRecognitionFlow({
    inputMode,
    quest,
    isDrawingRef,
    isModelReady,
    cooldownUntilRef,
    isRecognizing,
    inFlightRef,
    pendingRecognizeRef,
    isStarting,
    autoJudgeEnabled: state.autoJudgeEnabled,
    canvasRef,
    visibleCanvasSize,
    currentItem: learningView.currentItem,
    currentType: learningView.currentType,
    forceFractionRecognitionRef,
    forceMixedRecognitionRef,
    forcedFractionAnswerRef,
    forcedExpectedFormRef,
    quadraticAnswers,
    quadraticActiveIndex,
    setQuadraticAnswers,
    setQuadraticActiveIndex,
    setRecognizedNumber,
    setPracticeResult,
    sendSessionAnswer: (answerText: string, verdict: { ok: boolean }) =>
      session.sendSessionAnswer(answerText, verdict, { currentItem: learningView.currentItem, currentType: learningView.currentType }),
    sendLearningAnswer: session.sendLearningAnswer,
    setQuestionResults: learningOrchestrator.setQuestionResults,
    itemIndex,
    combo,
    setCombo,
    useFastLearningLoop,
    queueAdvanceAfterFeedback,
    autoNextEnabled: state.autoNextEnabled,
    AUTO_ADVANCE_MS,
    autoNextTimerRef,
    autoRecognizeTimerRef,
    wrongMarkTimerRef,
    FEEDBACK_FLASH_MS,
    nextQuestion: callbacks.onNextQuestion,
    isLearningSessionMode: Boolean(selection.skillIdFromQuery),
    setResultMark,
    setIsRecognizing,
    setPreviewImages,
    setLastAutoDrawExpected,
    setAutoDrawBatchSummary,
    lastDrawAtRef,
    forcedDigitsRef,
    getAutoJudgeDelayMs: constants.getAutoJudgeDelayMs,
    resolveExpectedFormFromPrompt,
    isMixedFractionQuestion,
    isQuadraticRootsType,
    gradeAnswer,
    is2DigitModelReady,
    isQuadraticRootsQuestion: learningView.isQuadraticRootsQuestion,
    inkFirstMode,
    setIsModelReady,
    setIs2DigitModelReady,
    idleCheckTimerRef,
    startTimersRef,
    setHasStarted,
    setStartPopup,
    setIsStarting: state.setIsStarting,
    setMessage: quest.setMessage
  });

  return {
    memoCanvas,
    resultLogic,
    skillTree,
    learningRecovery,
    learningRouting,
    learningOrchestrator,
    sessionGlue,
    session,
    learning,
    learningView,
    stock,
    stockView,
    callbacks,
    skipFromExplanation,
    keypad,
    recognitionFlow,
    currentLearningSkillId,
    currentSkillProgress,
    currentPatternPool,
    currentSessionSeed,
    currentSkillNode,
    currentSkillRequiredXP,
    currentSkillXP,
    recommendedSkillNode,
    recommendedLearningSkillId,
    useFastLearningLoop,
    uiText,
    emptyMessage: uiText.noItems,
    clearAllFractionAutoMoveTimers,
    resetQuestionUi,
    finishGuardRef,
    advanceGuardRef,
    sessionStartInFlightRef,
    refs: {
      currentCardRef,
      qaRowRef,
      qaPromptRef,
      qaPromptContentRef,
      qaAnswerRef,
      qaAnswerContentRef,
      currentGradeOptionRef,
      currentProblemOptionRef,
      problemOptionsScrollRef,
      memoCanvasHostRef,
      drawAreaRef,
      memoCanvasRef,
      autoRecognizeTimerRef,
      fractionAutoMoveTimerRef,
      quadraticFractionAutoMoveTimerRefs
    },
    derived: {
      resolvedLearningResult,
      learningResultUi,
      totalQuizQuestions
    }
  };
}
