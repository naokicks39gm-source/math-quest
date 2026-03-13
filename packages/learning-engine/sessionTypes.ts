import type { SkillProgress } from "./skillProgressTypes";

type SessionGeneratedProblem = {
  id: string;
  question: string;
  answer: string;
  patternKey?: string;
  variables?: Record<string, number>;
  variableRanges?: Record<string, [number, number]>;
  meta?: {
    source?: string;
    difficulty?: number;
  };
};

export type SessionProblem = {
  problem: SessionGeneratedProblem;
  skillId: string;
  patternKey: string;
  difficulty: number;
  source: "skill" | "weakness";
};

export type SessionHistoryEntry = {
  problemId: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  attemptCount: number;
};

export type Session = {
  mode: "skill" | "adaptive";
  skillId?: string;
  startedDifficulty: number;
  currentDifficulty: number;
  skillProgressBefore?: SkillProgress;
  skillXpBefore?: number;
  attemptCount: number;
  currentHint?: string;
  currentExplanation?: string;
  combo: number;
  failCount: number;
  history: SessionHistoryEntry[];
  recentProblems: string[];
  problems: SessionProblem[];
  index: number;
  correct: number;
  wrong: number;
};
