"use client";

type Props = {
  skillTitle: string;
  patternId: string;
  difficulty: number;
  index: number;
  total: number;
  xpSession: number;
  xpTotal: number;
};

export default function QuestHeader({
  skillTitle,
  patternId,
  difficulty,
  index,
  total,
  xpSession,
  xpTotal
}: Props) {
  const stars = "★★★★★".slice(0, difficulty);

  return (
    <div className="mb-4 text-sm text-gray-600">
      <div>Skill: {skillTitle}</div>
      <div>Pattern: {patternId}</div>
      <div>Difficulty: {stars}</div>
      <div>Progress: {index + 1} / {total}</div>
      <div>XP +{xpSession}</div>
      <div>Total XP {xpTotal}</div>
    </div>
  );
}
