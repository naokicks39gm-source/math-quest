import type { SkillProgress } from "./skillProgressTypes";

import type { Explanation } from "packages/problem-explanation";
import type { Hint } from "packages/problem-hint";

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
    patternId?: string;
  };
  hint?: Hint;
  explanation?: Explanation;
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
};

export type Session = {
  mode: "skill" | "adaptive";
  skillId?: string;
  startedDifficulty: number;
  currentDifficulty: number;
  skillProgressBefore?: SkillProgress;
  skillXpBefore?: number;
  attemptCount: number;
  combo: number;
  failCount: number;
  history: SessionHistoryEntry[];
  recentProblems: string[];
  problems: SessionProblem[];
  index: number;
  correct: number;
  wrong: number;
};
