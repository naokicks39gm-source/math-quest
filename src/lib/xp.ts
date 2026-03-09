export const XP_STORAGE_KEY = "mq:xp";

export type StoredXp = {
  totalXp: number;
};

export const readXp = (): StoredXp => {
  if (typeof window === "undefined") {
    return { totalXp: 0 };
  }

  try {
    const raw = window.localStorage.getItem(XP_STORAGE_KEY);
    if (!raw) {
      return { totalXp: 0 };
    }

    const parsed = JSON.parse(raw) as Partial<StoredXp>;
    if (typeof parsed.totalXp !== "number") {
      return { totalXp: 0 };
    }

    return {
      totalXp: Math.max(0, Math.trunc(parsed.totalXp))
    };
  } catch {
    return { totalXp: 0 };
  }
};

export const updateXpFromSession = (correctCount: number) => {
  if (typeof window === "undefined") {
    return { totalXp: 0, earnedXp: 0 };
  }

  const earnedXp = Math.max(0, Math.trunc(correctCount)) * 10;
  const current = readXp();
  const nextValue = {
    totalXp: current.totalXp + earnedXp
  };

  window.localStorage.setItem(XP_STORAGE_KEY, JSON.stringify(nextValue));

  return {
    totalXp: nextValue.totalXp,
    earnedXp
  };
};
