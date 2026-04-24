import type { GeneratedProblem } from "packages/problem-engine";
import type { SkillProgress } from "./skillProgressTypes";

import type { Explanation } from "packages/problem-explanation";
import type { Hint } from "packages/problem-hint";

export type SessionProblem = {
  problemId: string;
  readonly id: string;
  readonly prompt: string;
  readonly problem: GeneratedProblem;
  readonly hint: Hint;
  readonly explanation: Explanation;
  attemptCount: number;
  showHint: boolean;
  showExplanation: boolean;
  isFallback: boolean;
  fallbackCount: number;
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
  isFallbackSession: boolean;
  sessionType: "normal" | "fallback";
  skillId?: string;
  startedDifficulty: number;
  currentDifficulty: number;
  skillProgressBefore?: SkillProgress;
  skillXpBefore?: number;
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
