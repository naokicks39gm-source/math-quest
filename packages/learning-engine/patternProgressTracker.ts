import type { PatternProgress } from "./patternProgressTypes";

export function computeMastery(correct: number, attempts: number): number {
  return (correct + 1) / (attempts + 2);
}

export function updatePatternProgress(
  patternKey: string,
  correct: boolean,
  current?: PatternProgress,
  now: () => number = Date.now
): PatternProgress {
  const attempts = (current?.attempts ?? 0) + 1;
  const correctCount = (current?.correct ?? 0) + (correct ? 1 : 0);

  return {
    patternKey,
    attempts,
    correct: correctCount,
    mastery: computeMastery(correctCount, attempts),
    lastSeenAt: now()
  };
}
