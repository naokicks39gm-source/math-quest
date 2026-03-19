import { SkillClearView } from "packages/ui";

type Props = {
  currentLearningSkillTitle: string;
  currentSkillNode: any;
  resolvedLearningResult: any;
  recommendedSkillNode: any;
  recommendedLearningSkillId: string | null;
  onNext?: () => void;
  onRetry: () => void;
  onFinish: () => void;
};

export function QuestResultPanel({
  currentLearningSkillTitle,
  currentSkillNode,
  resolvedLearningResult,
  recommendedSkillNode,
  recommendedLearningSkillId,
  onNext,
  onRetry,
  onFinish
}: Props) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <SkillClearView
        skillTitle={currentLearningSkillTitle}
        gradeLevel={currentSkillNode?.gradeLevel}
        earnedXp={resolvedLearningResult?.earnedXp}
        skillXp={resolvedLearningResult?.skillXpAfter}
        requiredXP={resolvedLearningResult?.requiredXP}
        nextSkillTitle={recommendedSkillNode?.title ?? null}
        history={resolvedLearningResult?.history ?? []}
        onNext={recommendedLearningSkillId ? onNext : undefined}
        onRetry={onRetry}
        onFinish={onFinish}
      />
    </div>
  );
}
