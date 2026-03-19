import { useMemo } from "react";

export function useQuestResultLogic(args: any) {
  const {
    quest,
    learningState,
    currentLearningSkillId,
    getPracticeSkill,
    practiceSkills,
    skillTree
  } = args;

  const resolvedLearningResult = quest.learningResult;

  const recommendedLearningSkillId = useMemo(() => {
    if (!resolvedLearningResult || !learningState) {
      return null;
    }

    if (resolvedLearningResult.recommendation?.type === "skill") {
      return resolvedLearningResult.recommendation.skillId;
    }

    return (
      practiceSkills.find(
        (skill: any) =>
          learningState.unlockedSkills.includes(skill.id) && (learningState.skillProgress[skill.id]?.mastery ?? 0) < 0.8
      )?.id ?? null
    );
  }, [resolvedLearningResult, learningState, practiceSkills]);

  const currentLearningSkillTitle = getPracticeSkill(currentLearningSkillId ?? "")?.title ?? currentLearningSkillId ?? "";

  const currentSkillNode = useMemo(() => {
    if (!currentLearningSkillId) return null;
    return skillTree.find((skill: any) => skill.id === currentLearningSkillId) ?? null;
  }, [currentLearningSkillId, skillTree]);

  const currentSkillRequiredXP =
    currentSkillNode?.requiredXP ?? getPracticeSkill(currentLearningSkillId ?? "")?.requiredXP ?? 100;

  const currentSkillXP =
    currentSkillNode?.xp ?? (currentLearningSkillId ? learningState?.skillXP[currentLearningSkillId] ?? 0 : 0);

  const recommendedSkillNode = useMemo(() => {
    const unresolvedSkills = skillTree.filter((skill: any) => !skill.mastered);
    const unlockedCandidates = unresolvedSkills.filter((skill: any) => skill.unlocked);
    return unlockedCandidates[0] ?? unresolvedSkills[0] ?? null;
  }, [skillTree]);

  const shouldRenderLearningResult = quest.status === "cleared" && Boolean(quest.learningResult);

  return {
    resolvedLearningResult,
    recommendedLearningSkillId,
    currentLearningSkillTitle,
    currentSkillNode,
    currentSkillRequiredXP,
    currentSkillXP,
    recommendedSkillNode,
    shouldRenderLearningResult,
    resultProps: {
      currentLearningSkillTitle,
      currentSkillNode,
      resolvedLearningResult,
      recommendedSkillNode,
      recommendedLearningSkillId
    }
  };
}
