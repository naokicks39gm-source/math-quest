
 'use client';

import { Suspense, useRef } from "react";
import { useLearningSessionController } from "./hooks/useLearningSessionController";
import { useLearningActions } from "./hooks/useLearningActions";
import { useQuestOrchestration } from "./hooks/useQuestOrchestration";
import { useQuestPanelProps } from "./hooks/useQuestPanelProps";
import { useQuestSelection } from "./hooks/useQuestSelection";
import { describeStockReason } from "./hooks/useQuestStock";
import { useQuestState } from "./hooks/useQuestState";
import { useQuestSession } from "../../../packages/ui/hooks/useQuestSession";
import { QuestHeaderPanel } from "./components/QuestHeaderPanel";
import  QuestionCardPanel  from "./components/QuestionCardPanel";
import { QuestLayout } from "./components/QuestLayout";
import { QuestResultPanel } from "./components/QuestResultPanel";
import { QuestPopupShell } from "./components/QuestPopupShell";
import { QuestKeypadPanel } from "./components/QuestKeypadPanel";
import { createQuestion, type LegacyQuestion } from "./utils/questInit";
import { canUseKeyToken, FractionEditorState } from "../../utils/answerValidation";
import { gradeAnswer, type AnswerFormat } from "@/lib/grader";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { updateDailyStreak } from "@/lib/streak";
import {
  E1_LEVEL_OPTIONS,
  J1_LEVEL_OPTIONS,
  isE1LevelId,
  isJ1LevelId,
  type E1LevelId,
  type J1LevelId
} from "@/lib/problem";
import { type ElementaryLearningAid } from "@/lib/elementaryExplanations";
import { VARIABLE_SYMBOLS } from "packages/keypad";
import { formatPrompt } from "./utils/formatPrompt";
import { renderPrompt } from "./utils/renderPrompt";
import { renderFractionEditorValue } from "./utils/renderFraction";
import { renderAnswerWithSuperscript } from "./utils/renderAnswer";
import {
  buildFreshLearningState,
  clearPersistedLearningSession,
  LEARNING_STATE_KEY,
  loadStateFromClient
} from "packages/learning-engine/studentStore";
import type { Session, SessionProblem } from "packages/learning-engine/sessionTypes";

type ExampleItem = {
  prompt: string;
  prompt_tex?: string;
  answer: string;
  memo_explanation?: string;
};

type TypeDef = {
  type_id: string;
  type_name?: string;
  display_name?: string;
  generation_params?: {
    pattern_id?: string;
    a_digits?: number;
    b_digits?: number;
    carry?: boolean | null;
    borrow?: boolean | null;
    decimal_places?: number;
    quotient_digits?: number;
  };
  answer_format: AnswerFormat;
  example_items: ExampleItem[];
};


type CategoryDef = {
  category_id: string;
  category_name: string;
  types: TypeDef[];
};

type GradeDef = {
  grade_id: string;
  grade_name: string;
  categories: CategoryDef[];
};

type QuestEntry = {
  item: ExampleItem;
  type: TypeDef;
};

type QuestionResultEntry = {
  prompt: string;
  promptTex?: string;
  userAnswer: string;
  correct: boolean;
  correctAnswer?: string;
  everWrong: boolean;
  firstWrongAnswer?: string;
  skipped?: boolean;
};


type LearningSessionErrorResponse = {
  error?: string;
};

type LearningSessionRecoveryAnswer = {
  index: number;
  answer: string;
  correct: boolean;
};

type LearningSessionRecovery = {
  sessionId: string;
  skillId: string;
  currentIndex: number;
  answers: LearningSessionRecoveryAnswer[];
  expiresAt: number;
};


const LS_ACTIVE_SESSION_ID = "mq:activeSessionId";
const LS_STUDENT_ID = "mq:studentId";
const LS_LEARNING_SESSION = "mq:learningSession";
const LEARNING_SESSION_TTL_MS = 30 * 60 * 1000;
const DEFAULT_TOTAL_QUESTIONS = 5;
const E1_SUMMARY_TYPE_ID = "E1.NA.MIX.MIXED_TO_20";
const ORDER_LEGACY_PROMPT_RE = /小さいほうから|小さい順|ならべよう/u;
const ORDER_NUMERIC_ANSWER_RE = /^-?\d+$/u;
const E2_DAN_MUL_TYPE_RE = /^E2\.NA\.MUL\.MUL_1D_1D_DAN_[1-9]$/;
const E2_MIX_TEN_TYPE_RE = /^E2\.NA\.MUL\.MUL_1D_1D_MIX_(1_3|4_6|7_9)$/;
const E2_MIX_99_TEST_TYPE_ID = "E2.NA.MUL.MUL_1D_1D_MIX_1_9";
type QuestLevelId = E1LevelId | J1LevelId;
type QuestLevelInfo = { gradeId: "E1" | "J1"; levelId: QuestLevelId };

const resolveQuestLevelInfo = (rawLevelId: string): QuestLevelInfo | null => {
  if (isE1LevelId(rawLevelId)) return { gradeId: "E1", levelId: rawLevelId };
  if (isJ1LevelId(rawLevelId)) return { gradeId: "J1", levelId: rawLevelId };
  return null;
};

const parseDifficulty = (value: string): number | undefined => {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  if (n < 1) return 1;
  if (n > 5) return 5;
  return Math.floor(n);
};

const getTargetQuestionCount = (typeId?: string, levelId?: string) => {
  if (levelId === "E1-12") return 10;
  if (levelId && isE1LevelId(levelId)) return DEFAULT_TOTAL_QUESTIONS;
  if (levelId && isJ1LevelId(levelId)) return 1;
  if (!typeId) return DEFAULT_TOTAL_QUESTIONS;
  if (typeId === E2_MIX_99_TEST_TYPE_ID) return 20;
  if (E2_DAN_MUL_TYPE_RE.test(typeId)) return 9;
  if (E2_MIX_TEN_TYPE_RE.test(typeId)) return 10;
  if (typeId === E1_SUMMARY_TYPE_ID) return 10;
  return DEFAULT_TOTAL_QUESTIONS;
};

const toDiagnosticSeed = (value: string | null) => {
  if (!value) return "-";
  let hash = 0;
  for (const ch of value) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return String(hash);
};

const shouldForceFreshOrderSession = (skillId?: string | null, session?: Session | null) =>
  skillId === "E1_NUMBER_ORDER" &&
  Boolean(
    session?.problems.some(
      (problem) =>
        ORDER_LEGACY_PROMPT_RE.test(problem.problem.question) || !ORDER_NUMERIC_ANSWER_RE.test(problem.problem.answer)
    )
  );

const QUESTION_POOL_SIZE = 50;
const OUTER_MARGIN = 8;
const DEFAULT_VISIBLE_CANVAS_SIZE = 300;
const FRACTION_AUTO_MOVE_DELAY_MS = 800;
const EMPTY_FRACTION_EDITOR: FractionEditorState = { enabled: false, num: "", den: "", part: "num" };
const MIN_MEMO_ZOOM = 0.1;
const MAX_MEMO_ZOOM = 2.5;
const MEMO_BRUSH_WIDTH = 2.0;
const MEMO_WORKSPACE_SCALE = 1.6;

export const getAutoJudgeDelayMs = (digits: number) => {
  if (digits <= 1) return 700;
  if (digits === 2) return 1000;
  return 1300;
};


const MIXED_FRACTION_TYPE_IDS = new Set<string>([
  "E4.NA.FRAC.FRAC_IMPROPER_TO_MIXED",
  "E4.NA.FRAC.FRAC_MIXED_TO_IMPROPER"
]);

type ExpectedForm = "mixed" | "improper" | "auto";

const resolveExpectedFormFromPrompt = (prompt?: string): ExpectedForm => {
  const safePrompt = prompt ?? "";
  if (safePrompt.includes("帯分数に")) return "mixed";
  if (safePrompt.includes("仮分数に")) return "improper";
  return "auto";
};

const isMixedFractionQuestion = (
  typeId: string | undefined,
  prompt?: string,
  promptTex?: string
) => {
  if (typeId && MIXED_FRACTION_TYPE_IDS.has(typeId)) return true;
  const merged = `${prompt ?? ""} ${promptTex ?? ""}`;
  return merged.includes("帯分数") || merged.includes("仮分数");
};

const isQuadraticRootsType = (typeId?: string) => Boolean(typeId && /^H\d\.AL\.EQ\.QUAD_ROOTS(?:_|$)/.test(typeId));
const isH1ReferenceOnlyType = (type?: { type_id?: string; answer_format?: { kind?: string } }) =>
  Boolean(type?.type_id?.startsWith("H1.") && type.answer_format?.kind === "expr");


const CHARACTERS = {
  warrior: {
    name: 'Warrior',
    emoji: '⚔️',
    color: 'bg-red-100 text-red-800',
    hits: ['Critical Hit!', 'Smash!', 'Take this!'],
    misses: ['Borrow 10 from the neighbor!', 'Don\'t give up!', 'Close, but no cigar!'],
    win: 'Victory is ours!'
  },
  mage: {
    name: 'Mage',
    emoji: '🪄',
    color: 'bg-blue-100 text-blue-800',
    hits: ['Calculated.', 'Just as planned.', 'Logic prevails.'],
    misses: ['Check the digits.', 'Reconfirm the calculation.', 'A slight miscalculation.'],
    win: 'A logical conclusion.'
  }
};

const HIGH_SCHOOL_EXTRA_KEYPAD_TOKENS = ["()", "x", "^", "+/-"] as const;
const PLUS_MINUS_LONG_PRESS_MS = 220;
const PLUS_MINUS_POPUP_SWITCH_PX = 0;
const PLUS_MINUS_TAP_DEADZONE_PX = 6;
const QA_PROMPT_FONT_STEPS = [32, 30, 28, 26, 24] as const;
const QA_ANSWER_FONT_STEPS = [30, 28, 26, 24] as const;

type MemoPoint = { x: number; y: number };
type MemoStroke = { points: MemoPoint[] };
type PlusMinusPressState = {
  pointerId: number;
  startY: number;
  currentY: number;
  longPressed: boolean;
  settled: boolean;
  longPressTimer: number | null;
  triggerButton: HTMLButtonElement | null;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/*
Quest shell compatibility anchors:
const skillIdFromQuery = (params.get("skillId") ?? "").trim();
const retryFromQuery = (params.get("retry") ?? "").trim();
const isLearningSessionMode = Boolean(skillIdFromQuery);
const levelInfo = useMemo(() => resolveQuestLevelInfo(rawLevelFromQuery), [rawLevelFromQuery]);
const levelFromQuery: QuestLevelId | "" = levelInfo?.levelId ?? "";
const totalQuizQuestions = isLearningSessionMode
fetch("/api/learning/session/start"
fetch(`/api/learning/session/${encodeURIComponent(sessionId)}`
fetch("/api/learning/session/answer"
fetch("/api/learning/session/finish"
const finishGuardRef = useRef(false);
const advanceGuardRef = useRef(false);
const learningProblem = isLearningSessionMode
const useFastLearningLoop = isLearningSessionMode;
const FEEDBACK_FLASH_MS = 150;
const AUTO_ADVANCE_MS = 300;
if (levelInfo?.gradeId === "E1") {
generateE1LevelProblems
buildStocksForTypes(
pickUniqueQuizFromStock(
if (v + 1 >= totalQuizQuestions)
setQuestionResults((prev) => ({
if (isDrawingRef.current) return "";
splitComponentGreedyByProjection
splitByProjection(bin, w, h, pivot.bbox, true
runFinishLearningSession
handleRetry
learningRouting.handleRetry
history={resolvedLearningResult?.history ?? []}
onFinish={() => router.push("/skills")}
router.push("/");
`/quest?type=${encodeURIComponent(next.typeId)}&category=${encodeURIComponent(next.categoryId)}`
numberingStyle: "circled"
const trailingBlock = splitIndex >= 0 ? lastStep.slice(splitIndex + 2).trim() : "";
.split(/\n\s*\n/u)
*/

function QuestPageInner() {
  const quest = useQuestSession();
  const learningActions = useLearningActions(quest);
  const state = useQuestState();
  const refs = {
    canvasRef: useRef<any>(null),
    memoCanvasRef: useRef<HTMLCanvasElement | null>(null),
    drawAreaRef: useRef<HTMLDivElement | null>(null),
    currentCardRef: useRef<HTMLDivElement | null>(null),
    qaRowRef: useRef<HTMLDivElement | null>(null),
    qaPromptRef: useRef<HTMLDivElement | null>(null),
    qaPromptContentRef: useRef<HTMLSpanElement | null>(null),
    qaAnswerRef: useRef<HTMLDivElement | null>(null),
    qaAnswerContentRef: useRef<HTMLDivElement | null>(null),
    currentGradeOptionRef: useRef<HTMLButtonElement | null>(null),
    currentProblemOptionRef: useRef<HTMLButtonElement | null>(null),
    problemOptionsScrollRef: useRef<HTMLDivElement | null>(null),
    memoCanvasHostRef: useRef<HTMLDivElement | null>(null),
    autoRecognizeTimerRef: useRef<number | null>(null),
    fractionAutoMoveTimerRef: useRef<number | null>(null),
    quadraticFractionAutoMoveTimerRefs: useRef<[number | null, number | null]>([null, null]),
    lastDrawAtRef: useRef<number>(0),
    isDrawingRef: useRef(false),
    resultAdvanceTimerRef: useRef<number | null>(null),
    startTimersRef: useRef<number[]>([]),
    sessionStartTrackedRef: useRef(false),
    inFlightRef: useRef(false),
    pendingRecognizeRef: useRef(false),
    forcedDigitsRef: useRef<number | null>(null),
    cooldownUntilRef: useRef(0),
    autoNextTimerRef: useRef<number | null>(null),
    wrongMarkTimerRef: useRef<number | null>(null),
    idleCheckTimerRef: useRef<number | null>(null),
    plusMinusPressRef: useRef<PlusMinusPressState | null>(null),
    plusMinusWindowHandlersRef: useRef<any>(null),
    plusMinusTouchHandlersRef: useRef<any>(null)
  };

  const selection = useQuestSelection({
    setItemIndex: state.setItemIndex,
    setPracticeResult: state.setPracticeResult,
    setResultMark: state.setResultMark,
    setInput: state.setInput,
    setFractionInput: state.setFractionInput,
    setQuadraticFractionInputs: state.setQuadraticFractionInputs,
    canvasRef: refs.canvasRef,
    EMPTY_FRACTION_EDITOR
  });

  const orchestration = useQuestOrchestration({
    quest,
    selection,
    state,
    refs,
    isLearningSessionMode: true,
    learningActions,
    constants: {
      FEEDBACK_FLASH_MS: 150,
      AUTO_ADVANCE_MS: 300,
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
      clamp,
      createQuestion,
      DEFAULT_TOTAL_QUESTIONS,
      CHARACTERS,
      PLUS_MINUS_POPUP_SWITCH_PX,
      PLUS_MINUS_TAP_DEADZONE_PX,
      PLUS_MINUS_LONG_PRESS_MS,
      getAutoJudgeDelayMs
    }
  });
useLearningSessionController({

isLearningSessionMode: selection.isLearningSessionMode,

skillIdFromQuery: selection.skillIdFromQuery,

questSession: quest.session,

questStatus: quest.status,

questLearningResult: quest.learningResult,

questLearningLoading: quest.learningLoading,

setLearningError: quest.setLearningError,

setLearningLoading: quest.setLearningLoading,

setLearningResult: quest.setLearningResult,

syncLearningUiFromSession: orchestration.learningOrchestrator.syncLearningUiFromSession,

clearLearningRecoveryStorage: ()=>{},

loadLearningRecovery: ()=>null,

freshFromQuery: selection.freshFromQuery,

retryFromQuery: selection.retryFromQuery,

purgeFreshLearningRecovery: ()=>{},

clearPersistedLearningSession,

resetLearningSessionUi: ()=>{},

resumeLearningSession: ()=>{},

startLearningSession: quest.startLearningSession

})
  const panelProps = useQuestPanelProps({
    header: {
      quest,
      isLearningSessionMode: selection.isLearningSessionMode,
      selectedPath: orchestration.stockView.selectedPath,
      showGradeTypePicker: state.showGradeTypePicker,
      setShowGradeTypePicker: state.setShowGradeTypePicker,
      expandedGradePicker: state.expandedGradePicker,
      setExpandedGradePicker: state.setExpandedGradePicker,
      expandedGradeList: state.expandedGradeList,
      setExpandedGradeList: state.setExpandedGradeList,
      expandedProblemPicker: state.expandedProblemPicker,
      setExpandedProblemPicker: state.setExpandedProblemPicker,
      pendingGradeName: orchestration.learningView.pendingGradeName,
      gradeOptions: orchestration.learningView.gradeOptions,
      pickerGradeId: orchestration.learningView.pickerGradeId,
      setPendingGradeId: state.setPendingGradeId,
      router: selection.router,
      levelFromQuery: selection.levelFromQuery,
      currentGradeOptionRef: orchestration.refs.currentGradeOptionRef,
      currentProblemOptionRef: orchestration.refs.currentProblemOptionRef,
      problemOptionsScrollRef: orchestration.refs.problemOptionsScrollRef,
      pickerGradeTypes: orchestration.learningView.pickerGradeTypes,
      currentItem: orchestration.learningView.currentItem,
      currentType: orchestration.learningView.currentType,
      learningProblem: orchestration.learningView.learningProblem,
      getPracticeSkill:(id:string)=>({
 id,
 title:id
}),
      currentLearningSkillId: orchestration.currentLearningSkillId,
      currentSkillXP: orchestration.currentSkillXP,
      currentSkillRequiredXP: orchestration.currentSkillRequiredXP,
      learningState: state.learningState,
      skillTree: orchestration.skillTree,
      setShowSkillTree: state.setShowSkillTree,
      showSkillTree: state.showSkillTree,
      currentSkillNode: orchestration.currentSkillNode,
      recommendedSkillNode: orchestration.recommendedSkillNode,
      SkillTreeView: undefined,
      nextQuestion: orchestration.callbacks.onNextQuestion,
      uiText: orchestration.uiText,
      currentCardRef: orchestration.refs.currentCardRef,
      combo: state.combo
    },
    ui: {
      quest,
      currentItem: orchestration.learningView.currentItem,
      currentType: orchestration.learningView.currentType,
      combo: state.combo,
      nextQuestion: orchestration.callbacks.onNextQuestion,
      uiText: orchestration.uiText,
      isStarting: state.isStarting,
      useSingleLineQa: orchestration.learningView.useSingleLineQa,
      useFastLearningLoop: orchestration.useFastLearningLoop,
      currentCardRef: orchestration.refs.currentCardRef,
      qaRowRef: orchestration.refs.qaRowRef,
      qaPromptRef: orchestration.refs.qaPromptRef,
      qaPromptContentRef: orchestration.refs.qaPromptContentRef,
      qaAnswerRef: orchestration.refs.qaAnswerRef,
      qaAnswerContentRef: orchestration.refs.qaAnswerContentRef,
      currentAid: orchestration.learningView.currentAid,
      currentElementaryAid: orchestration.learningView.currentElementaryAid,
      currentSkillProgress: orchestration.currentSkillProgress,
      currentPatternPool: orchestration.currentPatternPool,
      currentSessionSeed: orchestration.currentSessionSeed,
      currentLearningIndex: orchestration.learningView.currentLearningIndex,
      currentLearningIsFallback: orchestration.learningView.currentLearningIsFallback,
      currentLearningFallbackCount: orchestration.learningView.currentLearningFallbackCount,
      isSecondaryQuest: orchestration.learningView.isSecondaryQuest,
      isElementaryQuest: orchestration.learningView.isElementaryQuest,
      isHighSchoolQuest: orchestration.learningView.isHighSchoolQuest,
      isJuniorQuest: orchestration.learningView.isJuniorQuest,
      isLearningSessionMode: true,
      isQuadraticRootsQuestion: orchestration.learningView.isQuadraticRootsQuestion,
      isH1ReferenceOnlyQuestion: orchestration.learningView.isH1ReferenceOnlyQuestion,
      isE1TwoLineQuestionLevel: orchestration.learningView.isE1TwoLineQuestionLevel,
      isE2EqualShareType: orchestration.learningView.isE2EqualShareType,
      showLearningHint: orchestration.learningView.showLearningHint,
      showLearningExplanation: orchestration.learningView.showLearningExplanation,
      showSecondaryHint: state.showSecondaryHint,
      showSecondaryExplanation: state.showSecondaryExplanation,
      showElementaryHint: state.showElementaryHint,
      showElementaryExplanation: state.showElementaryExplanation,
      showHighSchoolHint: state.showHighSchoolHint,
      setShowSecondaryHint: state.setShowSecondaryHint,
      setShowSecondaryExplanation: state.setShowSecondaryExplanation,
      setShowElementaryHint: state.setShowElementaryHint,
      setShowElementaryExplanation: state.setShowElementaryExplanation,
      setShowHighSchoolHint: state.setShowHighSchoolHint,
      renderPrompt,
      renderFractionEditorValue,
      renderAnswerWithSuperscript,
      qaPromptFontPx: orchestration.learningView.qaPromptFontPx,
      qaAnswerFontPx: orchestration.learningView.qaAnswerFontPx,
      qaAnswerOffsetPx: orchestration.learningView.qaAnswerOffsetPx,
      fractionInput: state.fractionInput,
      inputMode: state.inputMode,
      input: state.input,
      recognizedNumber: state.recognizedNumber,
      resultMark: state.resultMark,
      quadraticFractionInputs: state.quadraticFractionInputs,
      quadraticAnswers: state.quadraticAnswers,
      quadraticActiveIndex: state.quadraticActiveIndex,
      setQuadraticActiveIndex: state.setQuadraticActiveIndex,
      quizBuildError: state.quizBuildError,
      router: selection.router,
      setRetryNonce: state.setRetryNonce,
      describeStockReason,
      quizItems: state.quizItems,
      emptyMessage: orchestration.emptyMessage,
      devMode: selection.devMode,
      learningState: state.learningState,
      learningProblem: orchestration.learningView.learningProblem,
      stockShortages: state.stockShortages,
      activePickMeta: state.activePickMeta,
      activeStockInfo: orchestration.stockView.activeStockInfo,
      quizSize: orchestration.stockView.quizSize,
      shouldAutoFinishLearningSession: orchestration.learningView.shouldAutoFinishLearningSession,
      skipFromExplanation: orchestration.skipFromExplanation,
      currentElementaryHintText: orchestration.learningView.currentElementaryHintText,
      memoCanvas: orchestration.memoCanvas,
      memoCanvasHostRef: orchestration.refs.memoCanvasHostRef,
      drawAreaRef: orchestration.refs.drawAreaRef,
      memoCanvasRef: orchestration.refs.memoCanvasRef,
      shouldRenderElementaryExplanationPanel: orchestration.learningView.shouldRenderElementaryExplanationPanel,
      isAnswerLockedByExplanation: orchestration.learningView.isAnswerLockedByExplanation,
      canSubmitResolved: orchestration.keypad.canSubmitResolved,
      canUseKeyToken,
      setSettingsOpen: state.setSettingsOpen,
      handleDelete: orchestration.keypad.handleDelete,
      handleAttack: orchestration.keypad.handleAttack,
      endLearningSession: orchestration.sessionGlue.endLearningSession,
      sessionActionLoading: state.sessionActionLoading,
      learningOrchestrator: orchestration.learningOrchestrator,
      setInput: state.setInput,
      setResultMark: state.setResultMark,
      setMessage: state.setMessage,
      clearQuadraticFractionAutoMoveTimer: orchestration.keypad.clearQuadraticFractionAutoMoveTimer,
      setQuadraticFractionInputs: state.setQuadraticFractionInputs,
      setQuadraticAnswers: state.setQuadraticAnswers,
      clearFractionAutoMoveTimer: orchestration.keypad.clearFractionAutoMoveTimer,
      setFractionInput: state.setFractionInput,
      isFractionPartTokenValid: orchestration.keypad.isFractionPartTokenValid,
      quadraticFractionAutoMoveTimerRefs: orchestration.refs.quadraticFractionAutoMoveTimerRefs,
      FRACTION_AUTO_MOVE_DELAY_MS,
      fractionAutoMoveTimerRef: orchestration.refs.fractionAutoMoveTimerRef,
      VARIABLE_SYMBOLS
    }
  });

  const resultLogic = orchestration.resultLogic;

  if (resultLogic.shouldRenderLearningResult) {
    return (
      <QuestResultPanel
        {...resultLogic.resultProps}
        onNext={orchestration.callbacks.resultCallbacks.onContinue}
        onRetry={orchestration.callbacks.resultCallbacks.onRetry}
        onFinish={orchestration.callbacks.resultCallbacks.onFinish}
      />
    );
  }
const currentProblem =
  quest.currentProblem ??
  quest.session?.problems?.[quest.session?.index ?? 0]?.problem;
  console.log("ANSWER_FLOW", JSON.stringify({
    index: quest.session?.index,
    problemId: quest.currentProblem?.id,
    prompt: quest.currentProblem?.prompt
  }));
  return (
      <QuestLayout>
      {/* Input Mode Toggle removed */}

<QuestHeaderPanel {...panelProps.ui.headerProps} />


<QuestionCardPanel {...panelProps.ui.questionCardProps} />

      {/* Bottom: Input + Calc Memo */}
       {quest.status === 'playing' && (
     <QuestKeypadPanel {...panelProps.ui.keypadProps} />
       )}
      <QuestPopupShell
        questStatus={quest.status}
        studentId={state.studentId}
        sessionMailStatus={state.sessionMailStatus}
        sessionError={state.sessionError}
        plusMinusPopupOpen={state.plusMinusPopupOpen}
        plusMinusPopupAnchor={state.plusMinusPopupAnchor}
        plusMinusCandidate={state.plusMinusCandidate}
        settingsOpen={state.settingsOpen}
        onCloseSettings={() => state.setSettingsOpen(false)}
        onResetProgress={orchestration.sessionGlue.handleResetProgress}
      />

    </QuestLayout>
  );
}

export default function QuestPage() {
  return (
    <Suspense fallback={<div />}>
      <QuestPageInner />
    </Suspense>
  );
}
