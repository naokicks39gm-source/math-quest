import { useCallback, useMemo } from "react";
import { getPracticeSkill } from "@/lib/learningSkillCatalog";
import { getSecondaryLearningAid } from "@/lib/secondaryExplanations";
import {
  getElementaryLearningAid,
  isElementaryGrade,
  type ElementaryLearningAid
} from "@/lib/elementaryExplanations";

const QA_PROMPT_FONT_STEPS = [32, 30, 28, 26, 24] as const;
const QA_ANSWER_FONT_STEPS = [30, 28, 26, 24] as const;
const DEFAULT_TOTAL_QUESTIONS = 5;

const buildMemoExplanationAid = (memoText?: string): ElementaryLearningAid | null => {
  if (!memoText) return null;
  const lines = memoText
    .split("\n")
    .map((line) => line.replace(/\s+$/u, ""));
  const steps: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (/^[①②③④⑤⑥]\s/u.test(line)) {
      if (current.length > 0) steps.push(current.join("\n").trim());
      current = [line];
      continue;
    }
    if (current.length === 0 && line.trim().length === 0) continue;
    current.push(line);
  }
  if (current.length > 0) steps.push(current.join("\n").trim());
  if (steps.length === 0) return null;
  const lastStep = steps[steps.length - 1] ?? "";
  const splitIndex = lastStep.lastIndexOf("\n\n");
  const trailingBlock = splitIndex >= 0 ? lastStep.slice(splitIndex + 2).trim() : "";
  const conclusion =
    trailingBlock ||
    memoText
      .trim()
      .split(/\n\s*\n/u)
      .map((block) => block.trim())
      .filter((block) => block.length > 0)
      .at(-1) ||
    "";
  const normalizedSteps = trailingBlock
    ? [...steps.slice(0, -1), lastStep.slice(0, splitIndex).trim()].filter((step) => step.length > 0)
    : steps;
  return {
    kind: "simple",
    title: "けいさんメモ",
    steps: normalizedSteps,
    conclusion,
    numberingStyle: "circled"
  };
};

const adaptLearningSessionProblem = (sessionProblem: any) => ({
  item: {
    prompt: sessionProblem.problem.question,
    answer: sessionProblem.problem.answer
  },
  type: {
    type_id: `LEARNING.${sessionProblem.skillId}.${sessionProblem.patternKey}`,
    display_name: getPracticeSkill(sessionProblem.skillId)?.title ?? sessionProblem.skillId,
    generation_params: {
      pattern_id: sessionProblem.patternKey
    },
    answer_format: { kind: "int" },
    example_items: []
  }
});

const buildCountElementaryAid = (item?: any): ElementaryLearningAid | null => {
  if (!item) return null;
  const countFromPrompt = Number((item.prompt ?? "").match(/(\d+)/)?.[1] ?? item.answer ?? "");
  const count = Number.isFinite(countFromPrompt) ? Math.max(0, Math.floor(countFromPrompt)) : 0;
  if (count <= 0) return null;
  const fiveGroup = Math.floor(count / 5) * 5;
  const rest = count - fiveGroup;
  const conclusion = fiveGroup > 0 && rest > 0 ? `${fiveGroup} + ${rest} = ${count}` : `${count}`;
  return {
    kind: "abacus",
    title: "かぞえかた",
    steps:
      fiveGroup > 0 && rest > 0
        ? ["5を ひとまとまりで みる", `${fiveGroup}と あと${rest}`]
        : ["1こずつ かぞえる", `${count}こ あります`],
    conclusion,
    cleanAnswerText: String(count),
    visual: {
      mode: "abacus",
      result: count,
      groupSize: 5,
      groupedTotal: count
    }
  };
};

export function useQuestLearningFlow(args: any) {
  const {
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
    targetQuestionCount,
    getSecondaryLearningAid: getSecondaryLearningAidOverride,
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
    nextQuestion
  } = args;

  const learningView = useMemo(() => {
    const normalizedLearningSession = (() => {
      if (!quest.session) return null;
      const normalizedIndex = Math.min(quest.session.index, quest.session.problems.length);
      return {
        session: quest.session,
        index: normalizedIndex
      };
    })();
    const safeIndex = quizItems.length > 0 ? itemIndex % quizItems.length : 0;
    const currentLearningIndex = normalizedLearningSession?.index ?? 0;
    const learningProblem = isLearningSessionMode
      ? quest.currentProblem ?? normalizedLearningSession?.session.problems[currentLearningIndex] ?? null
      : null;
    const shouldAutoFinishLearningSession =
      isLearningSessionMode &&
      quest.status === "playing" &&
      Boolean(normalizedLearningSession) &&
      currentLearningIndex >= (normalizedLearningSession?.session.problems.length ?? 0);
    const currentEntry = learningProblem ? adaptLearningSessionProblem(learningProblem) : (quizItems[safeIndex] ?? null);
    const currentQuestionIndex = isLearningSessionMode ? currentLearningIndex : itemIndex;
    const currentItem = currentEntry?.item ?? null;
    const currentType = currentEntry?.type ?? selectedType;
    const currentGradeId = currentType?.type_id.split(".")[0] ?? "";
    const isSecondaryQuest = /^(J1|J2|J3|H1|H2|H3)$/.test(currentGradeId);
    const isJuniorQuest = /^(J1|J2|J3)$/.test(currentGradeId);
    const isHighSchoolQuest = /^(H1|H2|H3)$/.test(currentGradeId);
    const isE2EqualShareType = currentType?.type_id === "E2.NA.DIV.DIV_EQUAL_SHARE_BASIC";
    const isE1TwoLineQuestionLevel =
      levelFromQuery === "E1-1" ||
      levelFromQuery === "E1-3" ||
      Boolean(
        currentType?.display_name?.startsWith("Lv:E1-1 ") ||
        currentType?.display_name?.startsWith("Lv:E1-3 ")
      );
    const useSingleLineQa = !isSecondaryQuest && !isE2EqualShareType && !isE1TwoLineQuestionLevel;
    const qaAnswerOffsetPx = 0;
    const qaPromptFontPx = isE2EqualShareType
      ? 20
      : isSecondaryQuest
        ? QA_PROMPT_FONT_STEPS[0]
        : QA_PROMPT_FONT_STEPS[2];
    const qaAnswerFontPx = isSecondaryQuest ? QA_ANSWER_FONT_STEPS[0] : QA_ANSWER_FONT_STEPS[2];
    const currentAid = (getSecondaryLearningAidOverride ?? getSecondaryLearningAid)({
      gradeId: currentType?.type_id.split(".")[0] ?? "",
      typeId: currentType?.type_id,
      patternId: currentType?.generation_params?.pattern_id,
      answer: currentItem?.answer,
      prompt: currentItem?.prompt,
      promptTex: currentItem?.prompt_tex
    });
    const currentLearningAttemptCount = quest.learningAttemptCount;
    const currentLearningShowHint = learningProblem?.showHint ?? false;
    const currentLearningShowExplanation = learningProblem?.showExplanation ?? false;
    const currentLearningIsFallback = learningProblem?.isFallback ?? false;
    const currentLearningFallbackCount = learningProblem?.fallbackCount ?? 0;
    const currentCountAid = buildCountElementaryAid(currentItem);
    const currentElementaryHintText = (() => {
      if (isLearningSessionMode && quest.learningHint) return quest.learningHint;
      if (currentCountAid) return "5とあといくつ？";
      return "もういちど よく みてみよう";
    })();
    const learningExplanationAid =
      isLearningSessionMode && quest.learningExplanation ? buildMemoExplanationAid(quest.learningExplanation) : null;
    const currentElementaryAid =
      learningExplanationAid ??
      currentCountAid ??
      buildMemoExplanationAid(currentItem?.memo_explanation) ??
      getElementaryLearningAid({
        gradeId: currentType?.type_id.split(".")[0] ?? "",
        typeId: currentType?.type_id,
        patternId: currentType?.generation_params?.pattern_id,
        prompt: currentItem?.prompt,
        aDigits: currentType?.generation_params?.a_digits,
        bDigits: currentType?.generation_params?.b_digits
      });
    const isQuadraticRootsQuestion = isQuadraticRootsType(currentType?.type_id);
    const isH1ReferenceOnlyQuestion = isH1ReferenceOnlyType(currentType);
    const gradeOptions = grades.map((grade: any) => ({
      gradeId: grade.grade_id,
      gradeName: grade.grade_name
    }));
    const pickerGradeId = pendingGradeId || currentGradeId;
    const pendingGradeName =
      gradeOptions.find((grade: any) => grade.gradeId === pickerGradeId)?.gradeName ?? "学年を選択";
    const pickerGrade = grades.find((grade: any) => grade.grade_id === pickerGradeId) ?? null;
    const pickerGradeTypes = (() => {
      const base = (pickerGrade?.categories ?? []).flatMap((category: any) =>
        category.types.map((type: any) => ({
          kind: "type" as const,
          typeId: type.type_id,
          typeName: type.display_name ?? type.type_name ?? type.type_id
        }))
      );
      if (pickerGrade?.grade_id === "E1") {
        return args.E1_LEVEL_OPTIONS.map((entry: any) => ({
          kind: "level" as const,
          levelId: entry.levelId,
          typeName: `Lv:${entry.levelId} ${entry.title}`
        }));
      }
      if (pickerGrade?.grade_id === "J1") {
        return args.J1_LEVEL_OPTIONS.map((entry: any) => ({
          kind: "level" as const,
          levelId: entry.levelId,
          typeName: `Lv:${entry.levelId} ${entry.title}`
        }));
      }
      return base;
    })();
    const isEarlyElementary = currentGradeId === "E1" || currentGradeId === "E2";
    const isElementaryQuest = isElementaryGrade(currentGradeId);
    const showLearningHint =
      isLearningSessionMode && quest.status === "playing" && args.practiceResult?.ok === false && currentLearningShowHint;
    const showLearningExplanation =
      isLearningSessionMode &&
      quest.status === "playing" &&
      args.practiceResult?.ok === false &&
      currentLearningShowExplanation;
    const shouldShowElementaryExplanation =
      quest.status === "playing" &&
      isElementaryQuest &&
      (showLearningExplanation || (!args.useFastLearningLoop && args.practiceResult?.ok === false)) &&
      Boolean(currentElementaryAid);
    const shouldRenderElementaryExplanationPanel =
      quest.status === "playing" &&
      isElementaryQuest &&
      Boolean(currentElementaryAid) &&
      (args.showElementaryExplanation || shouldShowElementaryExplanation);
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
    const isAnswerLockedByExplanation =
      (isSecondaryQuest && args.showSecondaryExplanation) ||
      (isElementaryQuest && shouldRenderElementaryExplanationPanel);

    return {
      normalizedLearningSession,
      safeIndex,
      currentLearningIndex,
      learningProblem,
      shouldAutoFinishLearningSession,
      currentEntry,
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
      learningExplanationAid,
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
      totalQuizQuestions,
      uiText,
      emptyMessage,
      isAnswerLockedByExplanation
    };
  }, [
    quest,
    quizItems,
    itemIndex,
    isLearningSessionMode,
    selectedType,
    levelFromQuery,
    learningState,
    pendingGradeId,
    grades,
    currentSkillXP,
    currentSkillRequiredXP,
    correctCount,
    targetQuestionCount,
    getSecondaryLearningAidOverride,
    isQuadraticRootsType,
    isH1ReferenceOnlyType,
    args.E1_LEVEL_OPTIONS,
    args.J1_LEVEL_OPTIONS,
    args.practiceResult?.ok,
    args.useFastLearningLoop,
    args.showElementaryExplanation,
    args.showSecondaryExplanation
  ]);

  const buildLearningState = useCallback(() => learningView, [learningView]);

  const handleLearningResult = useCallback((params: any) => {
    const { practiceOk, questStatus } = params;
    const next = {
      showSecondaryHint: false,
      showSecondaryExplanation: false,
      showElementaryHint: false,
      showElementaryExplanation: false
    };
    if (!isLearningSessionMode || questStatus !== "playing") {
      return next;
    }
    if (practiceOk === true) {
      return next;
    }
    if (practiceOk === false && learningView.currentLearningShowExplanation) {
      if (learningView.isSecondaryQuest) {
        next.showSecondaryExplanation = true;
      }
      if (isElementaryGrade(learningView.currentGradeId)) {
        next.showElementaryExplanation = true;
      }
      return next;
    }
    if (practiceOk === false && learningView.currentLearningShowHint) {
      if (learningView.isSecondaryQuest) {
        next.showSecondaryHint = true;
      }
      if (isElementaryGrade(learningView.currentGradeId)) {
        next.showElementaryHint = true;
      }
    }
    return next;
  }, [isLearningSessionMode, learningView]);

  const processLearningAttempt = useCallback((params: any) => ({
    attemptCount: learningView.currentLearningAttemptCount,
    isFallback: learningView.currentLearningIsFallback,
    fallbackCount: learningView.currentLearningFallbackCount,
    showHint: learningView.currentLearningShowHint,
    showExplanation: learningView.currentLearningShowExplanation,
    result: params?.result ?? null
  }), [learningView]);

  const queueAdvanceAfterFeedback = useCallback((verdict: { ok: boolean }) => {
    if (advanceGuardRef.current) return;
    advanceGuardRef.current = true;
    if (wrongMarkTimerRef.current) {
      window.clearTimeout(wrongMarkTimerRef.current);
      wrongMarkTimerRef.current = null;
    }
    if (autoNextTimerRef.current) {
      window.clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    if (autoRecognizeTimerRef.current) {
      window.clearTimeout(autoRecognizeTimerRef.current);
      autoRecognizeTimerRef.current = null;
    }
    pendingRecognizeRef.current = false;
    setResultMark(verdict.ok ? "correct" : "wrong");
    wrongMarkTimerRef.current = window.setTimeout(() => {
      setResultMark(null);
      wrongMarkTimerRef.current = null;
    }, FEEDBACK_FLASH_MS);
    cooldownUntilRef.current = Date.now() + AUTO_ADVANCE_MS;
    autoNextTimerRef.current = window.setTimeout(() => {
      autoNextTimerRef.current = null;
      advanceGuardRef.current = false;
      nextQuestion();
    }, AUTO_ADVANCE_MS);
  }, [
    advanceGuardRef,
    wrongMarkTimerRef,
    autoNextTimerRef,
    autoRecognizeTimerRef,
    pendingRecognizeRef,
    setResultMark,
    FEEDBACK_FLASH_MS,
    cooldownUntilRef,
    AUTO_ADVANCE_MS,
    nextQuestion
  ]);

  return {
    learningView,
    buildLearningState,
    handleLearningResult,
    processLearningAttempt,
    queueAdvanceAfterFeedback
  };
}
