export function useQuestCallbacks(args: any) {
  const {
    quest,
    isLearningSessionMode,
    currentSkillXP,
    currentSkillRequiredXP,
    setMessage,
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
    skipFromExplanation,
    finishSession
  } = args;

  const onNextQuestion = () => {
    if (quest.status !== "playing") return;
    if (isLearningSessionMode) {
      if (!quest.session) return;
      if (currentSkillXP >= currentSkillRequiredXP || quest.session.index >= quest.session.problems.length) {
        void finishSession();
        return;
      }
      resetQuestionUi();
      return;
    }
    setItemIndex((v: number) => {
      if (v + 1 >= totalQuizQuestions) {
        console.log("STATUS CHANGE →", "cleared");
        quest.setStatus("cleared");
        setMessage("クリアー！");
        return v;
      }
      return v + 1;
    });
  };

  const onNextLevel = () => {
    if (levelInfo?.gradeId === "E1") {
      const currentIndex = E1_LEVEL_OPTIONS.findIndex((entry: any) => entry.levelId === levelInfo.levelId);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % E1_LEVEL_OPTIONS.length : 0;
      const nextLevel = E1_LEVEL_OPTIONS[nextIndex];
      router.push(`/quest?levelId=${encodeURIComponent(nextLevel.levelId)}`);
      return;
    }
    if (levelInfo?.gradeId === "J1") {
      const currentIndex = J1_LEVEL_OPTIONS.findIndex((entry: any) => entry.levelId === levelInfo.levelId);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % J1_LEVEL_OPTIONS.length : 0;
      const nextLevel = J1_LEVEL_OPTIONS[nextIndex];
      router.push(`/quest?levelId=${encodeURIComponent(nextLevel.levelId)}`);
      return;
    }
    if (allTypePaths.length === 0) return;
    const currentTypeId = currentType?.type_id ?? selectedType?.type_id ?? "";
    const currentIndex = allTypePaths.findIndex((entry: any) => entry.typeId === currentTypeId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % allTypePaths.length : 0;
    const next = allTypePaths[nextIndex];
    router.push(`/quest?type=${encodeURIComponent(next.typeId)}&category=${encodeURIComponent(next.categoryId)}`);
  };

  const onRetry = () => learningRouting.handleRetry(currentLearningSkillId ?? "");
  const onContinue = recommendedLearningSkillId
    ? () => learningRouting.handleFreshStart(recommendedLearningSkillId)
    : undefined;
  const onFinish = () => router.push("/skills");

  return {
    onNextQuestion,
    onNextLevel,
    resultCallbacks: {
      onRetry,
      onContinue,
      onFinish
    },
    questionCardCallbacks: {
      nextQuestion: onNextQuestion,
      skipFromExplanation
    }
  };
}
