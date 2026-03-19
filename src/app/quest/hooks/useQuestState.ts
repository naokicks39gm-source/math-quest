import { useState } from "react";
import type { FractionEditorState } from "../../../utils/answerValidation";
import type { LearningState } from "packages/learning-engine/studentStore";
import type { PickMeta, TypeStockResult } from "@/lib/questStockFactory";

type CharacterType = "warrior" | "mage";
type MemoPoint = { x: number; y: number };
type MemoStroke = { points: MemoPoint[] };

const EMPTY_FRACTION_EDITOR: FractionEditorState = { enabled: false, num: "", den: "", part: "num" };
const DEFAULT_VISIBLE_CANVAS_SIZE = 300;

export function useQuestState() {
  const [combo, setCombo] = useState(0);
  const [inputMode, setInputMode] = useState("numpad");
  const [fractionInput, setFractionInput] = useState<FractionEditorState>(EMPTY_FRACTION_EDITOR);
  const [message, setMessage] = useState("Battle Start!");
  const [character, setCharacter] = useState<CharacterType>("warrior");
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognizedNumber, setRecognizedNumber] = useState<string | null>(null);
  const [quadraticAnswers, setQuadraticAnswers] = useState<[string, string]>(["", ""]);
  const [quadraticFractionInputs, setQuadraticFractionInputs] = useState<[FractionEditorState, FractionEditorState]>([
    { ...EMPTY_FRACTION_EDITOR },
    { ...EMPTY_FRACTION_EDITOR }
  ]);
  const [quadraticActiveIndex, setQuadraticActiveIndex] = useState<0 | 1>(0);
  const [isModelReady, setIsModelReady] = useState(false);
  const [is2DigitModelReady, setIs2DigitModelReady] = useState(false);
  const [previewImages, setPreviewImages] = useState<ImageData[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [startPopup, setStartPopup] = useState<"ready" | "go" | null>(null);
  const [inkFirstMode, setInkFirstMode] = useState(true);
  const [showRecognitionGuides, setShowRecognitionGuides] = useState(false);
  const [autoJudgeEnabled, setAutoJudgeEnabled] = useState(false);
  const [autoNextEnabled, setAutoNextEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [itemIndex, setItemIndex] = useState(0);
  const [learningAttemptCount, setLearningAttemptCount] = useState(0);
  const [practiceResult, setPracticeResult] = useState<{ ok: boolean; correctAnswer: string } | null>(null);
  const [resultMark, setResultMark] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [lastAutoDrawExpected, setLastAutoDrawExpected] = useState("");
  const [autoDrawBatchSummary, setAutoDrawBatchSummary] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionMailStatus, setSessionMailStatus] = useState<string | null>(null);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [learningState, setLearningState] = useState<LearningState | null>(null);
  const [learningResultSkillId, setLearningResultSkillId] = useState<string | null>(null);
  const [learningError, setLearningError] = useState<string | null>(null);
  const [learningSessionId, setLearningSessionId] = useState<string | null>(null);
  const [quizBuildError, setQuizBuildError] = useState<string | null>(null);
  const [typeStocks, setTypeStocks] = useState<Map<string, TypeStockResult>>(new Map());
  const [stockShortages, setStockShortages] = useState<any[]>([]);
  const [stockReady, setStockReady] = useState(false);
  const [activePickMeta, setActivePickMeta] = useState<PickMeta | null>(null);
  const [quizItems, setQuizItems] = useState<any[]>([]);
  const [retryNonce, setRetryNonce] = useState(0);
  const [showSkillTree, setShowSkillTree] = useState(false);
  const [visibleCanvasSize, setVisibleCanvasSize] = useState(DEFAULT_VISIBLE_CANVAS_SIZE);
  const [memoCanvasSize, setMemoCanvasSize] = useState({
    width: DEFAULT_VISIBLE_CANVAS_SIZE,
    height: DEFAULT_VISIBLE_CANVAS_SIZE
  });
  const [calcZoom, setCalcZoom] = useState(1);
  const [calcPan, setCalcPan] = useState({ x: 0, y: 0 });
  const [showGradeTypePicker, setShowGradeTypePicker] = useState(false);
  const [expandedGradePicker, setExpandedGradePicker] = useState(true);
  const [expandedGradeList, setExpandedGradeList] = useState(false);
  const [expandedProblemPicker, setExpandedProblemPicker] = useState(true);
  const [pendingGradeId, setPendingGradeId] = useState("");
  const [showHighSchoolHint, setShowHighSchoolHint] = useState(false);
  const [plusMinusPopupOpen, setPlusMinusPopupOpen] = useState(false);
  const [plusMinusCandidate, setPlusMinusCandidate] = useState<"+" | "-" | null>(null);
  const [plusMinusPopupAnchor, setPlusMinusPopupAnchor] = useState<{ left: number; top: number } | null>(null);
  const [isPinchingMemo, setIsPinchingMemo] = useState(false);
  const [showSecondaryHint, setShowSecondaryHint] = useState(false);
  const [showSecondaryExplanation, setShowSecondaryExplanation] = useState(false);
  const [showElementaryHint, setShowElementaryHint] = useState(false);
  const [showElementaryExplanation, setShowElementaryExplanation] = useState(false);
  const [memoStrokes, setMemoStrokes] = useState<MemoStroke[]>([]);
  const [memoRedoStack, setMemoRedoStack] = useState<MemoStroke[]>([]);

  return {
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
  };
}
