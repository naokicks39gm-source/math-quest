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
  problems: SessionProblem[];
  index: number;
  correct: number;
  wrong: number;
};
