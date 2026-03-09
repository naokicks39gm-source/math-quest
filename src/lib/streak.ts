export const STREAK_STORAGE_KEY = "mq:streak";

export type DailyStreak = {
  streak: number;
  lastStudyDate: string;
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const shiftDate = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

export const readDailyStreak = (): DailyStreak | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STREAK_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<DailyStreak>;
    if (typeof parsed.streak !== "number" || typeof parsed.lastStudyDate !== "string") {
      return null;
    }

    return {
      streak: Math.max(0, Math.trunc(parsed.streak)),
      lastStudyDate: parsed.lastStudyDate
    };
  } catch {
    return null;
  }
};

export const updateDailyStreak = (now: Date = new Date()): DailyStreak | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const today = toDateKey(now);
  const yesterday = toDateKey(shiftDate(now, -1));
  const current = readDailyStreak();

  let nextStreak = 1;
  if (current?.lastStudyDate === today) {
    nextStreak = current.streak;
  } else if (current?.lastStudyDate === yesterday) {
    nextStreak = current.streak + 1;
  }

  const nextValue = {
    streak: nextStreak,
    lastStudyDate: today
  };

  window.localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(nextValue));
  return nextValue;
};
