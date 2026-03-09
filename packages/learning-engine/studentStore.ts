import type { PatternProgress } from "./patternProgressTypes";
import type { Session } from "./sessionTypes";
import type { SkillProgress } from "./skillProgressTypes";
import type { StudentState } from "./studentTypes";

type StoredGeneratedProblem = {
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

export const LEARNING_STATE_KEY = "mathquest_learning_state";
export const LEARNING_STATE_VERSION = 1;
export const CURRENT_ENGINE_VERSION = 1;

export type LearningState = {
  version: number;
  engineVersion: number;
  student: StudentState;
  patternProgress: Record<string, PatternProgress>;
  skillProgress: Record<string, SkillProgress>;
  session?: Session;
};

const createInitialStudentState = (): StudentState => ({
  difficulty: 1,
  correctStreak: 0,
  wrongStreak: 0,
  solved: 0,
  correct: 0,
  xp: 0,
  level: 0
});

const createInitialState = (): LearningState => ({
  version: LEARNING_STATE_VERSION,
  engineVersion: CURRENT_ENGINE_VERSION,
  student: createInitialStudentState(),
  patternProgress: {},
  skillProgress: {}
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseNumber = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

const parseStudentState = (value: unknown): StudentState => {
  if (!isRecord(value)) {
    return createInitialStudentState();
  }

  return {
    difficulty: Math.max(1, Math.min(4, Math.trunc(parseNumber(value.difficulty, 1)))),
    correctStreak: Math.max(0, Math.trunc(parseNumber(value.correctStreak, 0))),
    wrongStreak: Math.max(0, Math.trunc(parseNumber(value.wrongStreak, 0))),
    solved: Math.max(0, Math.trunc(parseNumber(value.solved, 0))),
    correct: Math.max(0, Math.trunc(parseNumber(value.correct, 0))),
    xp: Math.max(0, Math.trunc(parseNumber(value.xp, 0))),
    level: Math.max(0, Math.trunc(parseNumber(value.level, 0)))
  };
};

const parsePatternProgress = (value: unknown): Record<string, PatternProgress> => {
  if (!isRecord(value)) {
    return {};
  }

  const entries = Object.entries(value)
    .filter(([, progress]) => isRecord(progress) && typeof progress.patternKey === "string")
    .map(([key, progress]) => {
      const progressRecord = progress as Record<string, unknown>;
      return [
        key,
        {
          patternKey: progressRecord.patternKey as string,
          attempts: Math.max(0, Math.trunc(parseNumber(progressRecord.attempts, 0))),
          correct: Math.max(0, Math.trunc(parseNumber(progressRecord.correct, 0))),
          mastery: Math.max(0, Math.min(1, parseNumber(progressRecord.mastery, 0))),
          lastSeenAt: Math.max(0, Math.trunc(parseNumber(progressRecord.lastSeenAt, 0)))
        }
      ];
    });

  return Object.fromEntries(entries);
};

const parseSkillProgress = (value: unknown): Record<string, SkillProgress> => {
  if (!isRecord(value)) {
    return {};
  }

  const entries = Object.entries(value)
    .filter(([, progress]) => isRecord(progress) && typeof progress.skillId === "string")
    .map(([key, progress]) => {
      const progressRecord = progress as Record<string, unknown>;
      return [
        key,
        {
          skillId: progressRecord.skillId as string,
          mastery: Math.max(0, Math.min(1, parseNumber(progressRecord.mastery, 0))),
          mastered: progressRecord.mastered === true
        }
      ];
    });

  return Object.fromEntries(entries);
};

const parseSingleSkillProgress = (value: unknown): SkillProgress | undefined => {
  if (!isRecord(value) || typeof value.skillId !== "string") {
    return undefined;
  }

  return {
    skillId: value.skillId,
    mastery: Math.max(0, Math.min(1, parseNumber(value.mastery, 0))),
    mastered: value.mastered === true
  };
};

const parseSession = (value: unknown): Session | undefined => {
  if (!isRecord(value) || !Array.isArray(value.problems)) {
    return undefined;
  }

  if (value.mode !== "skill" && value.mode !== "adaptive") {
    return undefined;
  }

  const parseGeneratedProblem = (raw: unknown): StoredGeneratedProblem | null => {
    if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.question !== "string" || typeof raw.answer !== "string") {
      return null;
    }

    const meta = isRecord(raw.meta)
      ? {
          source: typeof raw.meta.source === "string" ? raw.meta.source : undefined,
          difficulty:
            typeof raw.meta.difficulty === "number" && Number.isFinite(raw.meta.difficulty)
              ? raw.meta.difficulty
              : undefined
        }
      : undefined;

    const variables = isRecord(raw.variables)
      ? Object.fromEntries(
          Object.entries(raw.variables)
            .filter(([, entry]) => typeof entry === "number" && Number.isFinite(entry))
            .map(([key, entry]) => [key, entry as number])
        )
      : undefined;

    const variableRanges = isRecord(raw.variableRanges)
      ? Object.fromEntries(
          Object.entries(raw.variableRanges)
            .filter(([, entry]) => {
              if (!Array.isArray(entry) || entry.length !== 2) {
                return false;
              }
              const [start, end] = entry;
              return typeof start === "number" && Number.isFinite(start) && typeof end === "number" && Number.isFinite(end);
            })
            .map(([key, entry]) => {
              const range = entry as [number, number];
              return [key, range];
            })
        )
      : undefined;

    return {
      id: raw.id,
      question: raw.question,
      answer: raw.answer,
      patternKey: typeof raw.patternKey === "string" ? raw.patternKey : undefined,
      variables: variables as Record<string, number> | undefined,
      variableRanges: variableRanges as Record<string, [number, number]> | undefined,
      meta
    };
  };

  const problems = value.problems
    .filter(
      (problem) =>
        isRecord(problem) &&
        typeof problem.skillId === "string" &&
        typeof problem.patternKey === "string" &&
        typeof problem.difficulty === "number" &&
        parseGeneratedProblem(problem.problem) !== null &&
        (problem.source === "skill" || problem.source === "weakness")
    )
    .map((problem) => ({
      problem: parseGeneratedProblem(problem.problem)!,
      skillId: problem.skillId as string,
      patternKey: problem.patternKey as string,
      difficulty: Math.max(1, Math.min(4, Math.trunc(problem.difficulty as number))),
      source: problem.source as "skill" | "weakness"
    }));

  return {
    mode: value.mode,
    skillId: typeof value.skillId === "string" ? value.skillId : undefined,
    startedDifficulty: Math.max(1, Math.min(4, Math.trunc(parseNumber(value.startedDifficulty, 1)))),
    skillProgressBefore: parseSingleSkillProgress(value.skillProgressBefore),
    problems,
    index: Math.max(0, Math.trunc(parseNumber(value.index, 0))),
    correct: Math.max(0, Math.trunc(parseNumber(value.correct, 0))),
    wrong: Math.max(0, Math.trunc(parseNumber(value.wrong, 0)))
  };
};

const sanitizeState = (value: unknown): LearningState => {
  if (!isRecord(value)) {
    return createInitialState();
  }

  if (value.version !== LEARNING_STATE_VERSION) {
    return createInitialState();
  }

  if (value.engineVersion !== CURRENT_ENGINE_VERSION) {
    return createInitialState();
  }

  return {
    version: LEARNING_STATE_VERSION,
    engineVersion: CURRENT_ENGINE_VERSION,
    student: parseStudentState(value.student),
    patternProgress: parsePatternProgress(value.patternProgress),
    skillProgress: parseSkillProgress(value.skillProgress),
    session: parseSession(value.session)
  };
};

export function serializeState(state: unknown): LearningState {
  return sanitizeState(state);
}

export function createLearningState(): LearningState {
  return createInitialState();
}

export function loadStateFromClient(): LearningState {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return createInitialState();
  }

  try {
    const raw = window.localStorage.getItem(LEARNING_STATE_KEY);
    if (!raw) {
      return createInitialState();
    }
    return sanitizeState(JSON.parse(raw));
  } catch {
    return createInitialState();
  }
}
