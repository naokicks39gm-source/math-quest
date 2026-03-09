export type LearningStudentState = {
  difficulty: number;
  correctStreak: number;
  wrongStreak: number;
  solved: number;
  correct: number;
  xp: number;
  level: number;
};

export type LearningPatternProgress = {
  patternKey: string;
  attempts: number;
  correct: number;
  mastery: number;
  lastSeenAt: number;
};

export type LearningSkillProgress = {
  skillId: string;
  mastery: number;
  mastered: boolean;
};

export type LearningGeneratedProblem = {
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

export type LearningSessionProblem = {
  problem: LearningGeneratedProblem;
  skillId: string;
  patternKey: string;
  difficulty: number;
  source: "skill" | "weakness";
};

export type LearningSession = {
  mode: "skill" | "adaptive";
  skillId?: string;
  startedDifficulty: number;
  problems: LearningSessionProblem[];
  index: number;
  correct: number;
  wrong: number;
};

export type LearningState = {
  version: number;
  engineVersion: number;
  student: LearningStudentState;
  patternProgress: Record<string, LearningPatternProgress>;
  skillProgress: Record<string, LearningSkillProgress>;
  session?: LearningSession;
};

export type Recommendation =
  | { type: "adaptive"; reason: "weak_patterns"; weakPatterns: number }
  | { type: "skill"; skillId: string; reason: "next_skill" }
  | { type: "done"; reason: "all_mastered" };

export type SessionResult = {
  score: number;
  totalQuestions: number;
  difficultyBefore: number;
  difficultyAfter: number;
  weakPatternsDetected: number;
  skillProgressBefore: LearningSkillProgress | null;
  skillProgressAfter: LearningSkillProgress | null;
  recommendation: Recommendation;
};

export type LearningSessionStartResponse = {
  sessionId: string;
  expiresAt: number;
  state: LearningState;
  session: LearningSession;
};

export type LearningSessionAnswerResponse = {
  sessionId: string;
  expiresAt: number;
  state: LearningState;
  session: LearningSession;
};

export type LearningSessionAnswerRequest = {
  sessionId: string;
  index: number;
  answer: string;
  correct: boolean;
};

export type LearningSessionFinishResponse = {
  sessionId: string;
  expiresAt: number;
  state: LearningState;
  result: SessionResult;
};

export type LearningSessionResumeResponse = {
  sessionId: string;
  expiresAt: number;
  state: LearningState;
  session: LearningSession;
};

export type LearningClientRecommendation = {
  action: Recommendation;
};
