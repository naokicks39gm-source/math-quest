import type { SkillProgress } from "./skillProgressTypes";

const computeMedian = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
};

export function computeSkillMastery(patternMasteries: number[]): number {
  if (patternMasteries.length === 0) {
    return 0;
  }

  const weakestPattern = patternMasteries.find((mastery) => mastery < 0.6);
  if (weakestPattern !== undefined) {
    return Math.min(...patternMasteries);
  }

  return computeMedian(patternMasteries);
}

export function updateSkillProgress(
  current: SkillProgress | undefined,
  skillId: string,
  patternMasteries: number[]
): SkillProgress {
  const mastery = computeSkillMastery(patternMasteries);

  return {
    skillId,
    mastery,
    mastered: mastery >= 0.75
  };
}
