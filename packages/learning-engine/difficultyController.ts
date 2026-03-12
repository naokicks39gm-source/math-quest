import type { StudentState } from "./studentTypes";

export function updateDifficulty(studentState: StudentState, correct: boolean): StudentState {
  const next: StudentState = { ...studentState };

  if (correct) {
    next.correctStreak += 1;
    next.wrongStreak = 0;
  } else {
    next.wrongStreak += 1;
    next.correctStreak = 0;
  }

  if (next.correctStreak >= 3) {
    next.difficulty = Math.min(5, next.difficulty + 1);
    next.correctStreak = 0;
  }

  if (next.wrongStreak >= 2) {
    next.difficulty = Math.max(1, next.difficulty - 1);
    next.wrongStreak = 0;
  }

  return next;
}
