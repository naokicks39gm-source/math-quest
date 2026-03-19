
'use client';

import {useLearningOrchestrator}
from "./hooks/useLearningOrchestrator"
import { useLearningSessionController }
from "./hooks/useLearningSessionController"
import {useLearningRecovery}
from "./hooks/useLearningRecovery"
import { useCanSubmitAnswer } from "./hooks/useCanSubmitAnswer";
import { useSkipFromExplanation } from "./hooks/useSkipFromExplanation";
import { useQuestAnswerFlow } from "./hooks/useQuestAnswerFlow";
import { useMemoCanvas } from "./hooks/useMemoCanvas";
import { useQuestLearningFlow } from "./hooks/useQuestLearningFlow";
import { useQuestStock, describeStockReason } from "./hooks/useQuestStock";
import { useQuestRecognition } from "./hooks/useQuestRecognition";
import { useQuestUiWiring } from "./hooks/useQuestUiWiring";
import { useQuestHeaderProps } from "./hooks/useQuestHeaderProps";
import { useQuestState } from "./hooks/useQuestState";
import { useQuestEffects } from "./hooks/useQuestEffects";
import { useQuestCallbacks } from "./hooks/useQuestCallbacks";
import { useQuestSession } from "../../../packages/ui/hooks/useQuestSession";
import { QuestHeaderPanel } from "./components/QuestHeaderPanel";
import { QuestionCardPanel } from "./components/QuestionCardPanel";
import { QuestLayout } from "./components/QuestLayout";
import { QuestResultPanel } from "./components/QuestResultPanel";
import { QuestKeypadPanel } from "./components/QuestKeypadPanel";import {
  canUseKeyToken,
  isFractionEditorReady,
  FractionEditorState,
  fractionEditorToAnswerText,
  isValidAnswerText
} from "../../utils/answerValidation";
import {useLearningRouting}
from "./hooks/useLearningRouting"
import { useQuestionReset } from "./hooks/useQuestionReset";
import { Suspense, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import * as tf from '@tensorflow/tfjs'; // Import TensorFlow.js
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { gradeAnswer, AnswerFormat } from '@/lib/grader';
import { getPracticeSkill, practiceSkills } from "@/lib/learningSkillCatalog";
import { getLearningPattern, learningPatternCatalog } from "@/lib/learningPatternCatalog";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { resetProgress } from "@/lib/resetProgress";
import { updateDailyStreak } from "@/lib/streak";
import { getCatalogGrades } from '@/lib/gradeCatalog';
import { useLearningActions } from "./hooks/useLearningActions";
import {
  E1_LEVEL_OPTIONS,
  J1_LEVEL_OPTIONS,
  generateE1LevelProblems,
  generateJ1LevelProblems,
  isE1LevelId,
  isJ1LevelId,
  type E1LevelId,
  type J1LevelId
} from "@/lib/problem";
import SecondaryExplanationPanel from "@/components/SecondaryExplanationPanel";
import QuestSettingsPanel from "@/components/QuestSettingsPanel";
import ElementaryExplanationPanel from "@/components/ElementaryExplanationPanel";
import { isElementaryGrade, type ElementaryLearningAid } from "@/lib/elementaryExplanations";
import ElementaryKeypad from "@/components/keypad/ElementaryKeypad";
import JuniorKeypad from "@/components/keypad/JuniorKeypad";
import HighSchoolKeypad from "@/components/keypad/HighSchoolKeypad";
import { QuestHeader, SkillProgressBar, SkillTreeView } from "packages/ui";
import { VARIABLE_SYMBOLS } from "packages/keypad";
import { formatPrompt } from "./utils/formatPrompt";
import { renderPrompt } from "./utils/renderPrompt";
import { renderFractionEditorValue } from "./utils/renderFraction";
import { renderAnswerWithSuperscript } from "./utils/renderAnswer";
import type {
  LearningSessionAnswerResponse,
  LearningSessionFinishResponse,
  LearningSessionResumeResponse,
  LearningSessionStartResponse
} from "packages/problem-format/learningSessionApi";
import {
  buildFreshLearningState,
  clearPersistedLearningSession,
  LEARNING_STATE_KEY,
  loadStateFromClient
} from "packages/learning-engine/studentStore";
import { getSkillTree } from "packages/skill-system/skillTree";
import type { Session, SessionProblem } from "packages/learning-engine/sessionTypes";
import {
  loadMnistModel,
  loadMnist2DigitModel,
  predictMnistDigitWithProbs,
  predictMnist2DigitWithProbs,
  isModelLoaded,
  is2DigitModelLoaded
} from '@/utils/mnistModel'; // Import MNIST model utilities
import { div } from 'framer-motion/m';

interface Question {
  val1: number;
  val2: number;
  operator: '+' | '-';
  answer: number;
}

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

function QuestPageInner() {
  const quest = useQuestSession();
  const setLearningResult = quest.setLearningResult;
  const setStatus = quest.setStatus;
  const learningActions = useLearningActions(quest);
  const router = useRouter();
  const params = useSearchParams();
  const devMode = params.get("dev") === "1";
  const skillIdFromQuery = (params.get("skillId") ?? "").trim();
  const retryFromQuery = (params.get("retry") ?? "").trim();
  const freshFromQuery = (params.get("fresh") ?? "").trim();
  const patternIdFromQuery = (params.get("patternId") ?? "").trim();
  const typeFromQuery = (params.get("type") ?? "").trim();
  const categoryFromQuery = params.get("category");
  const difficultyFromQuery = parseDifficulty((params.get("difficulty") ?? "").trim());
  const rawLevelFromQuery = (params.get("levelId") ?? "").trim();
  const levelInfo = useMemo(() => resolveQuestLevelInfo(rawLevelFromQuery), [rawLevelFromQuery]);
  const levelGradeId = levelInfo?.gradeId ?? "";
  const levelFromQuery: QuestLevelId | "" = levelInfo?.levelId ?? "";
  const state = useQuestState();
  const {
    combo,
    setCombo,
    inputMode,
    setInputMode,
    fractionInput,
    setFractionInput,
    message,
    setMessage,
    character,
    setCharacter,
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
    setIsStarting,
    hasStarted,
    setHasStarted,
    startPopup,
    setStartPopup,
    inkFirstMode,
    setInkFirstMode,
    showRecognitionGuides,
    setShowRecognitionGuides,
    autoJudgeEnabled,
    setAutoJudgeEnabled,
    autoNextEnabled,
    setAutoNextEnabled,
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
    lastAutoDrawExpected,
    setLastAutoDrawExpected,
    autoDrawBatchSummary,
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
    learningError,
    setLearningError,
    learningSessionId,
    setLearningSessionId,
    quizBuildError,
    setQuizBuildError,
    typeStocks,
    setTypeStocks,
    stockShortages,
    setStockShortages,
    stockReady,
    setStockReady,
    activePickMeta,
    setActivePickMeta,
    quizItems,
    setQuizItems,
    retryNonce,
    setRetryNonce,
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
    memoRedoStack,
    setMemoRedoStack
  } = state;
  const canvasRef = useRef<any>(null); // Ref for legacy handwriting canvas adapter
  const memoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawAreaRef = useRef<HTMLDivElement | null>(null);
  const currentCardRef = useRef<HTMLDivElement | null>(null);
  const qaRowRef = useRef<HTMLDivElement | null>(null);
  const qaPromptRef = useRef<HTMLDivElement | null>(null);
  const qaPromptContentRef = useRef<HTMLSpanElement | null>(null);
  const qaAnswerRef = useRef<HTMLDivElement | null>(null);
  const qaAnswerContentRef = useRef<HTMLDivElement | null>(null);
  const currentGradeOptionRef = useRef<HTMLButtonElement | null>(null);
  const currentProblemOptionRef = useRef<HTMLButtonElement | null>(null);
  const problemOptionsScrollRef = useRef<HTMLDivElement | null>(null);
  const memoCanvasHostRef = useRef<HTMLDivElement | null>(null);
  const autoRecognizeTimerRef = useRef<number | null>(null);
  const fractionAutoMoveTimerRef = useRef<number | null>(null);
  const quadraticFractionAutoMoveTimerRefs = useRef<[number | null, number | null]>([null, null]);
  const lastDrawAtRef = useRef<number>(0);
  const isDrawingRef = useRef(false);
  const resultAdvanceTimerRef = useRef<number | null>(null);
  const startTimersRef = useRef<number[]>([]);
  const sessionStartTrackedRef = useRef(false);
  const inFlightRef = useRef(false);
  const pendingRecognizeRef = useRef(false);
  const forcedDigitsRef = useRef<number | null>(null);
  const cooldownUntilRef = useRef(0);
  const FEEDBACK_FLASH_MS = 150;
  const AUTO_ADVANCE_MS = 300;
  const autoNextTimerRef = useRef<number | null>(null);
  const wrongMarkTimerRef = useRef<number | null>(null);
  const idleCheckTimerRef = useRef<number | null>(null);
  const plusMinusPressRef = useRef<PlusMinusPressState | null>(null);
  const plusMinusWindowHandlersRef = useRef<{
    move: (event: PointerEvent) => void;
    up: (event: PointerEvent) => void;
    cancel: (event: PointerEvent) => void;
  } | null>(null);
  const plusMinusTouchHandlersRef = useRef<{
    move: (event: TouchEvent) => void;
    end: (event: TouchEvent) => void;
    cancel: (event: TouchEvent) => void;
  } | null>(null);
  const grades = useMemo(
    () => getCatalogGrades() as GradeDef[],
    []
  );
  const defaultType = grades[0]?.categories[0]?.types[0] ?? null;
  const [selectedType, setSelectedType] = useState<TypeDef | null>(defaultType);
  const lastSelectionSyncKeyRef = useRef<string | null>(null);
  
  const learningRecovery = useLearningRecovery({

quest,

setLearningSessionId,
setLearningResultSkillId,

setItemIndex,
setCombo,

setLearningAttemptCount,

})
  const learningRouting =useLearningRouting({

skillIdFromQuery,

setLearningSessionId,

clearLearningRecoveryStorage:
learningRecovery.clearLearningRecoveryStorage,

clearPersistedLearningSession,

setLearningResult

})
const learningOrchestrator =useLearningOrchestrator({

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
setMessage,
canvasRef,
sessionStartTrackedRef

})
const skillId =
learningRouting.resolveSkillId()
const {

history,
results,
questionIndex,
correctCount,

question,


questionResults,

setHistory,
setResults,
setQuestionIndex,

setQuestion,

setQuestionResults

}=learningOrchestrator

  const finishGuardRef = useRef(false);
  const advanceGuardRef = useRef(false);
  const sessionStartInFlightRef = useRef<Promise<string | null> | null>(null);
  const forceFractionRecognitionRef = useRef(false);
  const forceMixedRecognitionRef = useRef(false);
  const forcedFractionAnswerRef = useRef<string | null>(null);
  const forcedExpectedFormRef = useRef<ExpectedForm | null>(null);
  const memoStrokesRef = useRef<MemoStroke[]>([]);
  const memoActiveStrokeRef = useRef<MemoStroke | null>(null);
  const memoActivePointerIdRef = useRef<number | null>(null);
  const memoDrawRafRef = useRef<number | null>(null);
  const memoPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const memoPinchStartRef = useRef<{
    distance: number;
    zoom: number;
    mid: { x: number; y: number };
    pan: { x: number; y: number };
  } | null>(null);
  const memoCanvas = useMemoCanvas({
    memoCanvasRef,
    drawAreaRef,
    memoStrokesRef,
    memoActiveStrokeRef,
    memoActivePointerIdRef,
    memoDrawRafRef,
    memoPointersRef,
    memoPinchStartRef,
    memoCanvasSize,
    calcZoom,
    calcPan,
    isPinchingMemo,
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
  const clearResults = useMemo(
    () => Object.entries(questionResults).sort((a, b) => Number(a[0]) - Number(b[0])),
    [questionResults]
  );
  const isLearningSessionMode = Boolean(skillIdFromQuery);
 
  const currentLearningSkillId = quest.session?.skillId ?? learningResultSkillId ?? null;
  const currentSkillProgress = currentLearningSkillId
    ? (learningState?.skillProgress[currentLearningSkillId] ?? null)
    : null;
  const currentPatternPool = currentLearningSkillId
    ? learningPatternCatalog
        .filter((entry) => entry.skillId === currentLearningSkillId)
        .map((entry) => entry.patternId)
    : [];
  const currentSessionSeed = toDiagnosticSeed(learningSessionId);
  const resolvedLearningResult: any = quest.learningResult;
  const recommendedLearningSkillId = useMemo(() => {
    if (!resolvedLearningResult || !learningState) {
      return null;
    }

    if (resolvedLearningResult.recommendation?.type === "skill") {
      return resolvedLearningResult.recommendation.skillId;
    }

    return (
      practiceSkills.find(
        (skill) =>
          learningState.unlockedSkills.includes(skill.id) && (learningState.skillProgress[skill.id]?.mastery ?? 0) < 0.8
      )?.id ?? null
    );
  }, [resolvedLearningResult, learningState]);

  const skillTree = useMemo(() => {
    if (!learningState) return [];
    return getSkillTree(learningState);
  }, [learningState]);
  const currentLearningSkillTitle = getPracticeSkill(currentLearningSkillId ?? "")?.title ?? currentLearningSkillId ?? "";
  const currentSkillNode = useMemo(() => {
    if (!currentLearningSkillId) return null;
    return skillTree.find((skill) => skill.id === currentLearningSkillId) ?? null;
  }, [currentLearningSkillId, skillTree]);
  const currentSkillRequiredXP = currentSkillNode?.requiredXP ?? getPracticeSkill(currentLearningSkillId ?? "")?.requiredXP ?? 100;
  const currentSkillXP = currentSkillNode?.xp ?? (currentLearningSkillId ? learningState?.skillXP[currentLearningSkillId] ?? 0 : 0);
  const recommendedSkillNode = useMemo(() => {
    const unresolvedSkills = skillTree.filter((skill) => !skill.mastered);
    const unlockedCandidates = unresolvedSkills.filter((skill) => skill.unlocked);
    return unlockedCandidates[0] ?? unresolvedSkills[0] ?? null;
  }, [skillTree]);
  const useFastLearningLoop = isLearningSessionMode;
  const nextQuestionRef = useRef<() => void>(() => {});

  const postJson = async (url: string, payload: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(String(json?.error ?? "request_failed"));
    }
    return json;
  };

const clearAllFractionAutoMoveTimers = () => {
    clearFractionAutoMoveTimer();
    clearQuadraticFractionAutoMoveTimer(0);
    clearQuadraticFractionAutoMoveTimer(1);
  };

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

  const syncLearningUiFromAnswer = useCallback((response: LearningSessionAnswerResponse) => {
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
  }, []);

  const loadLearningRecovery = (): LearningSessionRecovery | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(LS_LEARNING_SESSION);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<LearningSessionRecovery>;
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
        answers: parsed.answers
          .filter(
            (entry): entry is LearningSessionRecoveryAnswer =>
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
    console.log("preserve learning progress key:", LEARNING_STATE_KEY);
  }, []);


const resetLearningLocalState = useCallback(() => {
  finishGuardRef.current = false;
  setLearningResultSkillId(null);
  setLearningSessionId(null);
}, []);

const resetBattleUiState = useCallback(() => {
  setQuestionResults({});
  setItemIndex(0);
  setCombo(0);
  setMessage("Battle Start!");
  resetQuestionUi();
}, [resetQuestionUi]);

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
    console.log("LEARNING RESULT CLEARED")
    setLearningResult(null);
    setLearningSessionId(null);
    setLearningError(null);
    setQuestionResults({});
    setSettingsOpen(false);
    router.push("/skills");
  };

  const saveLearningRecovery = (recovery: LearningSessionRecovery) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LS_LEARNING_SESSION, JSON.stringify(recovery));
  };

 
  const startLearningSession = async (
    skillId: string,
    options?: {
      fresh?: boolean;
      carryoverHistory?: LearningSessionFinishResponse["result"]["history"];
      recentProblems?: LearningSessionFinishResponse["result"]["recentProblems"];
    }
  ) => {
    sessionStartTrackedRef.current = false;
    quest.setLearningLoading(true);
    setLearningError(null);
    learningOrchestrator.resetLearningSessionUi();

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
      const data = (await response.json()) as LearningSessionStartResponse | LearningSessionErrorResponse;
      if (!response.ok) {
        throw new Error("error" in data && data.error ? data.error : "learning_session_start_failed");
      }
      if (!("session" in data) || !data.session?.problems?.length) {
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
      console.log("STATUS CHANGE →", "playing");quest.setStatus("playing");
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

  const resumeLearningSession = async (sessionId: string, skillId: string) => {
    finishGuardRef.current = false;
    quest.setLearningLoading(true);
    setLearningError(null);
    console.log("LEARNING RESULT CLEARED")
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
      const data = (await response.json()) as LearningSessionResumeResponse | LearningSessionErrorResponse;
      if (!response.ok) {
        throw new Error("error" in data && data.error ? data.error : "learning_session_resume_failed");
      }
      if (!("session" in data) || !data.session?.problems?.length) {
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

useLearningSessionController({

isLearningSessionMode,
skillIdFromQuery,
quest,
setLearningError: quest.setLearningError,
setLearningResult: quest.setLearningResult,
syncLearningUiFromSession:
learningOrchestrator.syncLearningUiFromSession,
clearLearningRecoveryStorage,
loadLearningRecovery,
freshFromQuery,
retryFromQuery,
purgeFreshLearningRecovery,
clearPersistedLearningSession,
resetLearningSessionUi:
learningOrchestrator.resetLearningSessionUi,
resumeLearningSession,
learningActions,
loadStateFromClient

});

  // Load MNIST model on component mount
  useEffect(() => {
    const loadModel = async () => {
      await loadMnistModel();
      await loadMnist2DigitModel();
      if (isModelLoaded) {
        setIsModelReady(true);
      }
      if (is2DigitModelLoaded) {
        setIs2DigitModelReady(true);
      }
    };
    loadModel();
  }, [isModelLoaded]);

  // Initialize first question (legacy)
  useEffect(() => {
    const first = createQuestion();
    setQuestion(first);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sid = localStorage.getItem(LS_STUDENT_ID);
    const sessionId = localStorage.getItem(LS_ACTIVE_SESSION_ID);
    setStudentId(sid);
    setActiveSessionId(sessionId);
  }, []);

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

  useEffect(() => {
    return () => {
      if (autoRecognizeTimerRef.current) {
        window.clearTimeout(autoRecognizeTimerRef.current);
      }
      if (resultAdvanceTimerRef.current) {
        window.clearTimeout(resultAdvanceTimerRef.current);
      }
      startTimersRef.current.forEach((t) => window.clearTimeout(t));
      if (autoNextTimerRef.current) {
        window.clearTimeout(autoNextTimerRef.current);
      }
      if (wrongMarkTimerRef.current) {
        window.clearTimeout(wrongMarkTimerRef.current);
      }
      if (idleCheckTimerRef.current) {
        window.clearInterval(idleCheckTimerRef.current);
      }
      clearAllFractionAutoMoveTimers();
    };
  }, []);

  const startReadyGo = () => {
    if (isStarting) return;
    setHasStarted(true);
    setIsStarting(true);
    setStartPopup('ready');
    setMessage("Ready...");
    const speak = (text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      utter.rate = 0.9;
      utter.pitch = 1.0;
      utter.volume = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    };
    speak('Ready');
    startTimersRef.current.forEach((t) => window.clearTimeout(t));
    const t1 = window.setTimeout(() => {
      setStartPopup('go');
      setMessage("Go!");
      speak('Go');
    }, 700);
    const t2 = window.setTimeout(() => {
      setStartPopup(null);
      setIsStarting(false);
      setMessage("Battle Start!");
      if (autoJudgeEnabled && pendingRecognizeRef.current) {
        pendingRecognizeRef.current = false;
        if (autoRecognizeTimerRef.current) {
          window.clearTimeout(autoRecognizeTimerRef.current);
        }
        const nextDelay = getAutoJudgeDelayMs(getAnswerDigits());
        autoRecognizeTimerRef.current = window.setTimeout(() => {
          runInference();
        }, nextDelay);
      }
    }, 2000);
    startTimersRef.current = [t1, t2];
  };

  useEffect(() => {
    const el = memoCanvasHostRef.current;
    if (!el || status !== "playing") return;
    const updateSize = () => {
      const width = Math.max(180, Math.floor(el.clientWidth));
      const height = Math.max(180, Math.floor(el.clientHeight));
      setMemoCanvasSize({ width, height });
      setVisibleCanvasSize(Math.max(180, Math.min(width, height)));
    };
    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(el);
    return () => observer.disconnect();
  }, [quest.status]);

  const learning = useQuestLearningFlow({
    quest,
    isLearningSessionMode,
    quizItems,
    itemIndex,
    selectedType,
    levelFromQuery,
    learningState,
    pendingGradeId,
    grades,
    currentSkillXP,
    currentSkillRequiredXP,
    correctCount,
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
  const {
    normalizedLearningSession,
    currentLearningIndex,
    learningProblem,
    shouldAutoFinishLearningSession,
    currentQuestionIndex,
    currentItem,
    currentType,
    currentGradeId,
    isSecondaryQuest,
    isJuniorQuest,
    isHighSchoolQuest,
    isE2EqualShareType,
    isE1TwoLineQuestionLevel,
    useSingleLineQa,
    qaAnswerOffsetPx,
    qaPromptFontPx,
    qaAnswerFontPx,
    currentAid,
    currentLearningAttemptCount,
    currentLearningShowHint,
    currentLearningShowExplanation,
    currentLearningIsFallback,
    currentLearningFallbackCount,
    currentElementaryHintText,
    currentElementaryAid,
    isQuadraticRootsQuestion,
    isH1ReferenceOnlyQuestion,
    gradeOptions,
    pickerGradeId,
    pendingGradeName,
    pickerGrade,
    pickerGradeTypes,
    isEarlyElementary,
    isElementaryQuest,
    showLearningHint,
    showLearningExplanation,
    shouldShowElementaryExplanation,
    shouldRenderElementaryExplanationPanel,
    isAnswerLockedByExplanation
  } = learning.learningView;

  useEffect(() => {
    memoCanvas.scheduleMemoRedraw();
  }, [memoCanvasSize.width, memoCanvasSize.height, memoStrokes, calcZoom, calcPan, quest.status]);

  useEffect(() => {
    return () => {
      if (memoDrawRafRef.current) {
        window.cancelAnimationFrame(memoDrawRafRef.current);
        memoDrawRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (idleCheckTimerRef.current) {
      window.clearInterval(idleCheckTimerRef.current);
    }
    if (inkFirstMode) return;
    idleCheckTimerRef.current = window.setInterval(() => {
      if (!autoJudgeEnabled) return;
      if (isStarting) return;
      if (quest.status !== 'playing') return;
      if (isDrawingRef.current) return;
      if (Date.now() < cooldownUntilRef.current) return;
      if (isRecognizing || inFlightRef.current) return;
      const idleFor = Date.now() - lastDrawAtRef.current;
      const nextDelay = getAutoJudgeDelayMs(getAnswerDigits());
      if (idleFor >= nextDelay && lastDrawAtRef.current > 0) {
        runInference();
      }
    }, 200);
    return () => {
      if (idleCheckTimerRef.current) {
        window.clearInterval(idleCheckTimerRef.current);
      }
    };
  }, [inkFirstMode, autoJudgeEnabled, isStarting, quest.status, isRecognizing, itemIndex]);


  useEffect(() => {
    if (isLearningSessionMode) {
      return;
    }
    const applySelection = (nextType: TypeDef, key: string) => {
      if (lastSelectionSyncKeyRef.current === key) return;
      lastSelectionSyncKeyRef.current = key;
      clearAllFractionAutoMoveTimers();
      setSelectedType(nextType);
      setItemIndex(0);
      setPracticeResult(null);
      setResultMark(null);
      setInput("");
      setFractionInput({ ...EMPTY_FRACTION_EDITOR });
      setQuadraticFractionInputs([{ ...EMPTY_FRACTION_EDITOR }, { ...EMPTY_FRACTION_EDITOR }]);
      canvasRef.current?.clear();
    };

    if (levelInfo?.gradeId === "E1") {
      const seeded = generateE1LevelProblems(levelInfo.levelId as E1LevelId, 1)[0];
      if (seeded?.type) {
        applySelection(seeded.type as TypeDef, `level:${levelInfo.levelId}:${seeded.type.type_id}`);
        return;
      }
    }

    if (levelInfo?.gradeId === "J1") {
      const seeded = generateJ1LevelProblems(levelInfo.levelId as J1LevelId, 1)[0];
      if (seeded?.type) {
        applySelection(seeded.type as TypeDef, `level:${levelInfo.levelId}:${seeded.type.type_id}`);
        return;
      }
    }

    let found: TypeDef | null = null;
    if (typeFromQuery) {
      for (const g of grades) {
        for (const c of g.categories) {
          const hit = c.types.find((t) => t.type_id === typeFromQuery);
          if (hit) {
            found = hit;
            break;
          }
        }
        if (found) break;
      }
    }
    if (found) {
      applySelection(found, `type:${found.type_id}`);
      return;
    }
    if (categoryFromQuery) {
      const category = grades
        .flatMap((g) => g.categories)
        .find((c) => c.category_id === categoryFromQuery);
      if (category && category.types[0]) {
        applySelection(category.types[0], `category:${category.category_id}:${category.types[0].type_id}`);
        return;
      }
    }
    if (!selectedType && defaultType) {
      applySelection(defaultType, `default:${defaultType.type_id}`);
    }
  }, [isLearningSessionMode, levelGradeId, levelFromQuery, typeFromQuery, categoryFromQuery, grades, selectedType, defaultType]);

  const stock = useQuestStock({
    grades,
    categoryFromQuery,
    levelFromQuery,
    typeFromQuery,
    selectedType,
    typeStocks,
    getTargetQuestionCount,
    levelInfo,
    patternIdFromQuery,
    difficultyFromQuery,
    E1_LEVEL_OPTIONS,
    J1_LEVEL_OPTIONS
  });
  const {
    selectedPath,
    allTypePaths,
    targetStockTypes,
    activeTypeId,
    activeStockInfo,
    targetQuestionCount,
    quizSize,
    hasLevelQuery,
    hasPatternQuery
  } = stock.stockView;

  useEffect(() => {
    if (isLearningSessionMode) {
      setTypeStocks(new Map());
      setStockShortages([]);
      setStockReady(true);
      return;
    }
    setStockReady(false);
    if (hasLevelQuery) {
      setTypeStocks(new Map());
      setStockShortages([]);
      setStockReady(true);
      return;
    }
    const stockState = stock.buildStockState();
    setTypeStocks(stockState.stocks);
    setStockShortages(stockState.shortages);
    setStockReady(true);
  }, [isLearningSessionMode, hasLevelQuery, targetStockTypes, retryNonce, stock]);
  useEffect(() => {
    if (isLearningSessionMode) {
      return;
    }
    clearAllFractionAutoMoveTimers();
    if (!stockReady) {
      setQuizItems([]);
      setItemIndex(0);
      setQuestionResults({});
      quest.setStatus("blocked");
      setQuizBuildError("出題ストックを準備中です。少しお待ちください。");
      return;
    }
    const picked = stock.pickQuestSet();
    setActivePickMeta(picked.pickMeta ?? null);
    if (picked.kind === "blocked") {
      setQuizItems([]);
      setItemIndex(0);
      setQuestionResults({});
      setStatus("blocked");
      setQuizBuildError(picked.message ?? null);
      setPracticeResult(null);
      setResultMark(null);
      setRecognizedNumber(null);
      setInput("");
      setFractionInput({ ...EMPTY_FRACTION_EDITOR });
      setQuadraticAnswers(["", ""]);
      setQuadraticFractionInputs([{ ...EMPTY_FRACTION_EDITOR }, { ...EMPTY_FRACTION_EDITOR }]);
      setQuadraticActiveIndex(0);
      return;
    }
    setQuizItems(picked.entries ?? []);
    setItemIndex(0);
    setQuestionResults({});
    console.log("STATUS CHANGE →", "playing");quest.setStatus("playing");
    setMessage("Battle Start!");
    setPracticeResult(null);
    setResultMark(null);
    setRecognizedNumber(null);
    setQuizBuildError(picked.shortageMessage ?? null);
    setInput("");
    setFractionInput({ ...EMPTY_FRACTION_EDITOR });
    setQuadraticAnswers(["", ""]);
    setQuadraticFractionInputs([{ ...EMPTY_FRACTION_EDITOR }, { ...EMPTY_FRACTION_EDITOR }]);
    setQuadraticActiveIndex(0);
  }, [isLearningSessionMode, hasPatternQuery, patternIdFromQuery, levelGradeId, levelFromQuery, stockReady, typeStocks, activeTypeId, quizSize, retryNonce, difficultyFromQuery, stock]);

  const { queueAdvanceAfterFeedback } = learning;
  const learningResultUi = learning.handleLearningResult({
    practiceOk: practiceResult?.ok,
    questStatus: quest.status
  });
  useQuestEffects({
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
    setLearningResultSkillIdRef: setLearningResultSkillId,
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
  });
  useEffect(() => {
    if (!showGradeTypePicker || !expandedProblemPicker) return;
    const raf = window.requestAnimationFrame(() => {
      if (currentProblemOptionRef.current) {
        currentProblemOptionRef.current.scrollIntoView({ block: "start", inline: "nearest" });
        return;
      }
      if (problemOptionsScrollRef.current) {
        problemOptionsScrollRef.current.scrollTop = 0;
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [showGradeTypePicker, expandedProblemPicker, currentType?.type_id, pickerGradeId, levelFromQuery]);
  useEffect(() => {
    if (!showGradeTypePicker || !expandedGradeList) return;
    const raf = window.requestAnimationFrame(() => {
      currentGradeOptionRef.current?.scrollIntoView({ block: "start", inline: "nearest" });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [showGradeTypePicker, expandedGradeList, pickerGradeId]);
  const totalQuizQuestions = isLearningSessionMode
    ? Math.max(1, quest.session?.problems.length ?? DEFAULT_TOTAL_QUESTIONS)
    : Math.max(1, Math.min(targetQuestionCount, quizItems.length || targetQuestionCount));
  const uiText = isEarlyElementary
    ? {
        summary: `${totalQuizQuestions}もん かんりょう / せいかい ${correctCount}もん`,
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
        summary: `${totalQuizQuestions}題完了 / 正解 ${correctCount}題`,
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
  const emptyMessage = uiText.noItems;
  const callbacks = useQuestCallbacks({
    quest,
    isLearningSessionMode,
    currentSkillXP,
    currentSkillRequiredXP,
    learningActions,
    learningState,
    learningSessionId,
    skillIdFromQuery,
    finishGuardRef,
    advanceGuardRef,
    autoNextTimerRef,
    wrongMarkTimerRef,
    learningRecovery,
    setLearningSessionId,
    updateDailyStreak,
    trackAnalyticsEvent,
    setLearningResultSkillId,
    setLearningResult,
    setMessage,
    setResultMark,
    setLearningError,
    setQuizBuildError,
    resetQuestionUi,
    setItemIndex,
    totalQuizQuestions,
    levelInfo,
    E1_LEVEL_OPTIONS,
    J1_LEVEL_OPTIONS,
    router,
    allTypePaths,
    currentType,
    selectedType,
    learningRouting,
    recommendedLearningSkillId,
    currentLearningSkillId,
    skipFromExplanation: undefined
  });
  nextQuestionRef.current = callbacks.onNextQuestion;

const { skipFromExplanation } = useSkipFromExplanation({

 quest,
 currentItem,
 currentQuestionIndex,

 setQuestionResults,
 setPracticeResult,

 setShowSecondaryExplanation,
 setShowSecondaryHint,
 setShowElementaryHint,
 setShowElementaryExplanation,

 isLearningSessionMode,

  resetQuestionUi,
 nextQuestion: callbacks.onNextQuestion

});

  function createQuestion(): Question {
    // Generate simple addition/subtraction
    const isAddition = Math.random() > 0.5;
    let val1, val2, ans;

    if (isAddition) {
      val1 = Math.floor(Math.random() * 20) + 1;
      val2 = Math.floor(Math.random() * 20) + 1;
      ans = val1 + val2;
    } else {
      val1 = Math.floor(Math.random() * 20) + 5;
      val2 = Math.floor(Math.random() * val1); // Ensure result is non-negative
      ans = val1 - val2;
    }

    return {
      val1,
      val2,
      operator: isAddition ? '+' : '-',
      answer: ans
    };
  }

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
  const isFractionPartTokenValid = (current: string, token: string) => {
    if (/^\d$/.test(token)) return true;
    if (token === "-") return current.length === 0;
    return false;
  };

  const keypadAnswerKind: AnswerFormat["kind"] = isQuadraticRootsQuestion
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
   const canSubmitResolved = isH1ReferenceOnlyQuestion ? false : canSubmitCurrentAnswer;
  const { handleAttack, handleDelete, sendSessionAnswer, sendLearningAnswer } = useQuestAnswerFlow({
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
    resolveExpectedFormFromPrompt,
    ensureActiveSession,
    postJson,
    setSessionError,
    isLearningSessionMode,
    learningActions,
    learningState,
    learningSessionId,
    setLearningError,
    setQuizBuildError,
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
    nextQuestion: callbacks.onNextQuestion,
    EMPTY_FRACTION_EDITOR,
    setQuadraticActiveIndex,
    setMessage
  });
  
  const clearPlusMinusPressTimer = (state: PlusMinusPressState | null) => {
    if (!state || state.longPressTimer === null) return;
    window.clearTimeout(state.longPressTimer);
    state.longPressTimer = null;
  };
  const detachPlusMinusWindowTracking = () => {
    const handlers = plusMinusWindowHandlersRef.current;
    if (!handlers) return;
    window.removeEventListener("pointermove", handlers.move);
    window.removeEventListener("pointerup", handlers.up);
    window.removeEventListener("pointercancel", handlers.cancel);
    plusMinusWindowHandlersRef.current = null;
  };
  const detachPlusMinusTouchTracking = () => {
    const handlers = plusMinusTouchHandlersRef.current;
    if (!handlers) return;
    window.removeEventListener("touchmove", handlers.move);
    window.removeEventListener("touchend", handlers.end);
    window.removeEventListener("touchcancel", handlers.cancel);
    plusMinusTouchHandlersRef.current = null;
  };
  const resolvePlusMinusTokenFromDelta = (deltaY: number) =>
    deltaY < PLUS_MINUS_POPUP_SWITCH_PX ? "+" as const : "-" as const;
  const resetPlusMinusInputState = (skipDetach = false) => {
    clearPlusMinusPressTimer(plusMinusPressRef.current);
    const active = plusMinusPressRef.current;
    if (active?.triggerButton && active.triggerButton.hasPointerCapture(active.pointerId)) {
      active.triggerButton.releasePointerCapture(active.pointerId);
    }
    plusMinusPressRef.current = null;
    if (!skipDetach) detachPlusMinusWindowTracking();
    if (!skipDetach) detachPlusMinusTouchTracking();
    setPlusMinusPopupOpen(false);
    setPlusMinusCandidate(null);
    setPlusMinusPopupAnchor(null);
  };
  const finalizePlusMinusPress = (
    event: Pick<PointerEvent, "pointerId" | "clientY"> | null,
    cancelled: boolean
  ) => {
    const active = plusMinusPressRef.current;
    if (!active) {
      resetPlusMinusInputState();
      return;
    }
    if (active.settled) {
      resetPlusMinusInputState();
      return;
    }
    if (event && event.pointerId !== active.pointerId) return;
    active.settled = true;
    if (event) {
      active.currentY = event.clientY;
    }
    const deltaY = active.currentY - active.startY;
    const movedBeyondTap = Math.abs(deltaY) > PLUS_MINUS_TAP_DEADZONE_PX;
    const token = cancelled
      ? null
      : (movedBeyondTap ? resolvePlusMinusTokenFromDelta(deltaY) : "+" as const);
    resetPlusMinusInputState();
    if (token) learningOrchestrator.handleInput(token);
  };
  const attachPlusMinusWindowTracking = () => {
    detachPlusMinusWindowTracking();
    const move = (event: PointerEvent) => {
      const active = plusMinusPressRef.current;
      if (!active || active.pointerId !== event.pointerId || active.settled) return;
      active.currentY = event.clientY;
      if (!active.longPressed) return;
      setPlusMinusCandidate(resolvePlusMinusTokenFromDelta(active.currentY - active.startY));
      event.preventDefault();
    };
    const up = (event: PointerEvent) => {
      finalizePlusMinusPress(event, false);
    };
    const cancel = (event: PointerEvent) => {
      finalizePlusMinusPress(event, true);
    };
    plusMinusWindowHandlersRef.current = { move, up, cancel };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
  };
  const findTouchById = (touches: TouchList, id: number) => {
    for (let i = 0; i < touches.length; i += 1) {
      if (touches[i].identifier === id) return touches[i];
    }
    return null;
  };
  const attachPlusMinusTouchTracking = () => {
    detachPlusMinusTouchTracking();
    const move = (event: TouchEvent) => {
      const active = plusMinusPressRef.current;
      if (!active || active.settled) return;
      const touch = findTouchById(event.touches, active.pointerId) ?? findTouchById(event.changedTouches, active.pointerId);
      if (!touch) return;
      active.currentY = touch.clientY;
      if (active.longPressed) {
        setPlusMinusCandidate(resolvePlusMinusTokenFromDelta(active.currentY - active.startY));
      }
      event.preventDefault();
    };
    const end = (event: TouchEvent) => {
      const active = plusMinusPressRef.current;
      if (!active || active.settled) return;
      const touch = findTouchById(event.changedTouches, active.pointerId);
      if (!touch) return;
      finalizePlusMinusPress({ pointerId: active.pointerId, clientY: touch.clientY }, false);
    };
    const cancel = (event: TouchEvent) => {
      const active = plusMinusPressRef.current;
      if (!active || active.settled) return;
      const touch = findTouchById(event.changedTouches, active.pointerId);
      if (!touch) return;
      finalizePlusMinusPress({ pointerId: active.pointerId, clientY: touch.clientY }, true);
    };
    plusMinusTouchHandlersRef.current = { move, end, cancel };
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", cancel);
  };
  const handlePlusMinusFlickStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (quest.status !== "playing" || isStarting) return;
    e.preventDefault();
    resetPlusMinusInputState();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const state: PlusMinusPressState = {
      pointerId: e.pointerId,
      startY: e.clientY,
      currentY: e.clientY,
      longPressed: false,
      settled: false,
      longPressTimer: null,
      triggerButton: e.currentTarget
    };
    attachPlusMinusWindowTracking();
    state.longPressTimer = window.setTimeout(() => {
      const active = plusMinusPressRef.current;
      if (!active || active.pointerId !== e.pointerId) return;
      active.longPressed = true;
      active.longPressTimer = null;
      const candidate = resolvePlusMinusTokenFromDelta(active.currentY - active.startY);
      setPlusMinusPopupAnchor({ left: rect.left + rect.width / 2, top: rect.top - 72 });
      setPlusMinusPopupOpen(true);
      setPlusMinusCandidate(candidate);
    }, PLUS_MINUS_LONG_PRESS_MS);
    plusMinusPressRef.current = state;
  };
  const handlePlusMinusTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (quest.status !== "playing" || isStarting) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    e.preventDefault();
    resetPlusMinusInputState();
    const rect = e.currentTarget.getBoundingClientRect();
    const state: PlusMinusPressState = {
      pointerId: touch.identifier,
      startY: touch.clientY,
      currentY: touch.clientY,
      longPressed: false,
      settled: false,
      longPressTimer: null,
      triggerButton: e.currentTarget
    };
    attachPlusMinusTouchTracking();
    state.longPressTimer = window.setTimeout(() => {
      const active = plusMinusPressRef.current;
      if (!active || active.pointerId !== touch.identifier) return;
      active.longPressed = true;
      active.longPressTimer = null;
      const candidate = resolvePlusMinusTokenFromDelta(active.currentY - active.startY);
      setPlusMinusPopupAnchor({ left: rect.left + rect.width / 2, top: rect.top - 72 });
      setPlusMinusPopupOpen(true);
      setPlusMinusCandidate(candidate);
    }, PLUS_MINUS_LONG_PRESS_MS);
    plusMinusPressRef.current = state;
  };
  const handlePlusMinusFlickEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (quest.status !== "playing" || isStarting) return;
    finalizePlusMinusPress({ pointerId: e.pointerId, clientY: e.clientY }, false);
  };
  const handlePlusMinusFlickCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    finalizePlusMinusPress({ pointerId: e.pointerId, clientY: e.clientY }, true);
  };
  useEffect(() => {
    resetPlusMinusInputState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIndex, currentType?.type_id, quest.status]);
  useEffect(
    () => () => {
      resetPlusMinusInputState();
    },
    []
  );

  const toggleCharacter = () => {
    setCharacter(prev => prev === 'warrior' ? 'mage' : 'warrior');
  };
  const recognition = useQuestRecognition({
    inputMode,
    quest,
    isDrawingRef,
    isModelReady,
    cooldownUntilRef,
    isRecognizing,
    inFlightRef,
    pendingRecognizeRef,
    isStarting,
    autoJudgeEnabled,
    canvasRef,
    visibleCanvasSize,
    currentItem,
    currentType,
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
    sendSessionAnswer,
    sendLearningAnswer,
    setQuestionResults,
    itemIndex,
    combo,
    setCombo,
    useFastLearningLoop,
    queueAdvanceAfterFeedback,
    autoNextEnabled,
    AUTO_ADVANCE_MS,
    autoNextTimerRef,
    autoRecognizeTimerRef,
    wrongMarkTimerRef,
    FEEDBACK_FLASH_MS,
    nextQuestion: callbacks.onNextQuestion,
    isLearningSessionMode,
    setResultMark,
    setIsRecognizing,
    setPreviewImages,
    setLastAutoDrawExpected,
    setAutoDrawBatchSummary,
    lastDrawAtRef,
    forcedDigitsRef,
    getAutoJudgeDelayMs,
    resolveExpectedFormFromPrompt,
    isMixedFractionQuestion,
    isQuadraticRootsType,
    gradeAnswer,
    is2DigitModelReady,
    isQuadraticRootsQuestion,
    inkFirstMode
  });
  const {
    getAnswerDigits,
    runInference,
    handleResetAnswer,
    handleCanvasChange,
    handleDrawStart,
    handleDrawEnd,
    runAutoDrawTest,
    runAutoDrawDecimalTest,
    runAutoDrawBatchTest,
    runAutoDrawDecimalBatchTest,
    runAutoDrawFractionTest,
    runAutoDrawFractionBatchTest,
    runAutoDrawMixedTest,
    runAutoDrawMixedBatchTest
  } = recognition;

  const header = useQuestHeaderProps({
    quest,
    isLearningSessionMode,
    selectedPath,
    showGradeTypePicker,
    setShowGradeTypePicker,
    expandedGradePicker,
    setExpandedGradePicker,
    expandedGradeList,
    setExpandedGradeList,
    expandedProblemPicker,
    setExpandedProblemPicker,
    pendingGradeName,
    gradeOptions,
    pickerGradeId,
    setPendingGradeId,
    router,
    levelFromQuery,
    currentGradeOptionRef,
    currentProblemOptionRef,
    problemOptionsScrollRef,
    pickerGradeTypes,
    currentItem,
    currentType,
    learningProblem,
    getPracticeSkill,
    currentLearningSkillId,
    currentSkillXP,
    currentSkillRequiredXP,
    learningState,
    skillTree,
    setShowSkillTree,
    showSkillTree,
    currentSkillNode,
    recommendedSkillNode,
    SkillTreeView,
    nextQuestion: callbacks.onNextQuestion,
    uiText,
    currentCardRef,
    combo
  });
  const ui = useQuestUiWiring({
    headerProps: header.headerProps,
    quest,
    currentItem,
    currentType,
    combo,
    nextQuestion: callbacks.onNextQuestion,
    uiText,
    isStarting,
    useSingleLineQa,
    useFastLearningLoop,
    currentCardRef,
    qaRowRef,
    qaPromptRef,
    qaPromptContentRef,
    qaAnswerRef,
    qaAnswerContentRef,
    currentAid,
    currentElementaryAid,
    currentSkillProgress,
    currentPatternPool,
    currentSessionSeed,
    currentLearningIndex,
    currentLearningIsFallback,
    currentLearningFallbackCount,
    isSecondaryQuest,
    isElementaryQuest,
    isHighSchoolQuest,
    isJuniorQuest,
    isLearningSessionMode,
    isQuadraticRootsQuestion,
    isH1ReferenceOnlyQuestion,
    isE1TwoLineQuestionLevel,
    isE2EqualShareType,
    showLearningHint,
    showLearningExplanation,
    showSecondaryHint,
    showSecondaryExplanation,
    showElementaryHint,
    showElementaryExplanation,
    showHighSchoolHint,
    setShowSecondaryHint,
    setShowSecondaryExplanation,
    setShowElementaryHint,
    setShowElementaryExplanation,
    setShowHighSchoolHint,
    renderPrompt,
    renderFractionEditorValue,
    renderAnswerWithSuperscript,
    qaPromptFontPx,
    qaAnswerFontPx,
    qaAnswerOffsetPx,
    fractionInput,
    inputMode,
    input,
    recognizedNumber,
    resultMark,
    quadraticFractionInputs,
    quadraticAnswers,
    quadraticActiveIndex,
    setQuadraticActiveIndex,
    quizBuildError,
    router,
    setRetryNonce,
    describeStockReason,
    quizItems,
    emptyMessage,
    devMode,
    learningState,
    learningProblem,
    stockShortages,
    activePickMeta,
    activeStockInfo,
    quizSize,
    shouldAutoFinishLearningSession,
    skipFromExplanation,
    currentElementaryHintText,
    memoCanvas,
    memoCanvasHostRef,
    drawAreaRef,
    memoCanvasRef,
    shouldRenderElementaryExplanationPanel,
    isAnswerLockedByExplanation,
    canSubmitResolved,
    canUseKeyToken,
    setSettingsOpen,
    handleDelete,
    handleAttack,
    endLearningSession,
    sessionActionLoading,
    learningOrchestrator,
    setInput,
    setResultMark,
    clearQuadraticFractionAutoMoveTimer,
    setQuadraticFractionInputs,
    setQuadraticAnswers,
    clearFractionAutoMoveTimer,
    setFractionInput,
    isFractionPartTokenValid,
    quadraticFractionAutoMoveTimerRefs,
    FRACTION_AUTO_MOVE_DELAY_MS,
    fractionAutoMoveTimerRef,
    VARIABLE_SYMBOLS
  });

console.log(" quest.learningResult =", quest.learningResult)
console.log("quest.status =", quest.status)


 if (quest.status === "cleared" && quest.learningResult) {

 console.log("CLEAR RENDER")

 return (
  <QuestResultPanel
   currentLearningSkillTitle={currentLearningSkillTitle}
   currentSkillNode={currentSkillNode}
   resolvedLearningResult={resolvedLearningResult}
   recommendedSkillNode={recommendedSkillNode}
   recommendedLearningSkillId={recommendedLearningSkillId}
   onNext={callbacks.resultCallbacks.onContinue}
   onRetry={callbacks.resultCallbacks.onRetry}
   onFinish={callbacks.resultCallbacks.onFinish}
  />
 )

}

  return (
      <QuestLayout>
      {/* Input Mode Toggle removed */}

<QuestHeaderPanel {...ui.headerProps} />


<QuestionCardPanel {...ui.questionCardProps} />

      {/* Bottom: Input + Calc Memo */}
       {quest.status === 'playing' && (
     <QuestKeypadPanel {...ui.keypadProps} />
       )}

      {quest.status === 'playing' && (
        <section className="w-full pb-1 space-y-1">
          {!studentId && (
            <div className="text-[10px] text-right text-slate-600 bg-white/90 border border-slate-200 rounded px-2 py-1">
              保護者設定が未保存のためレポート配信はできません。
            </div>
          )}
          {sessionMailStatus && (
            <div className="text-[10px] text-right text-emerald-700 font-semibold bg-emerald-50/95 border border-emerald-200 rounded px-2 py-1">{sessionMailStatus}</div>
          )}
          {sessionError && (
            <div className="text-[10px] text-right text-red-700 bg-red-50/95 border border-red-200 rounded px-2 py-1">{sessionError}</div>
          )}
        </section>
      )}
      {plusMinusPopupOpen && plusMinusPopupAnchor && typeof document !== "undefined"
        ? createPortal(
          <div
            className="pointer-events-none fixed z-[120] inline-flex w-[52px] -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-slate-300 bg-white/95 shadow-xl"
            style={{ left: plusMinusPopupAnchor.left, top: plusMinusPopupAnchor.top }}
            aria-hidden="true"
          >
            <div className={`flex h-8 items-center justify-center text-sm font-bold ${plusMinusCandidate === "+" ? "bg-emerald-100 text-emerald-800" : "bg-white text-slate-700"}`}>+</div>
            <div className={`flex h-8 items-center justify-center text-sm font-bold border-t border-slate-200 ${plusMinusCandidate === "-" ? "bg-rose-100 text-rose-700" : "bg-white text-slate-700"}`}>-</div>
          </div>,
          document.body
        )
        : null}
      <QuestSettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onResetProgress={handleResetProgress}
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
