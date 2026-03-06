export type StudentState = {
  difficulty: number;
  correctStreak: number;
  wrongStreak: number;
};

export const createInitialStudentState = (): StudentState => {
  return {
    difficulty: 3,
    correctStreak: 0,
    wrongStreak: 0
  };
};

export const updateDifficulty = (state: StudentState, isCorrect: boolean): StudentState => {
  const next = { ...state };

  if (isCorrect) {
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
};
