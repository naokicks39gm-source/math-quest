import { LEARNING_STATE_KEY } from "packages/learning-engine/studentStore";
import { STREAK_STORAGE_KEY } from "@/lib/streak";
import { XP_STORAGE_KEY } from "@/lib/xp";

export const LEARNING_SESSION_STORAGE_KEY = "mq:learningSession";

export const resetProgress = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(XP_STORAGE_KEY);
  window.localStorage.removeItem(STREAK_STORAGE_KEY);
  window.localStorage.removeItem(LEARNING_SESSION_STORAGE_KEY);
  window.localStorage.removeItem(LEARNING_STATE_KEY);
};
