import type { GeneratedProblem } from "packages/problem-engine";

export type SessionProblem = {
  problem: GeneratedProblem;
  skillId: string;
  patternKey: string;
  difficulty: number;
  source: "skill" | "weakness";
};

export type Session = {
  mode: "skill" | "adaptive";
  skillId?: string;
  startedDifficulty: number;
  problems: SessionProblem[];
  index: number;
  correct: number;
  wrong: number;
};
