export const ANALYTICS_STORAGE_KEY = "mq:analytics";
const MAX_ANALYTICS_EVENTS = 100;

export type AnalyticsEventName =
  | "app_start"
  | "session_start"
  | "session_finish"
  | "skill_open"
  | "review_open";

export type AnalyticsEvent = {
  event: AnalyticsEventName;
  timestamp: number;
};

const isAnalyticsEvent = (value: unknown): value is AnalyticsEvent => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AnalyticsEvent>;
  return typeof candidate.event === "string" && typeof candidate.timestamp === "number";
};

export const readAnalytics = (): AnalyticsEvent[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isAnalyticsEvent).slice(-MAX_ANALYTICS_EVENTS);
  } catch {
    return [];
  }
};

export const trackAnalyticsEvent = (
  event: AnalyticsEventName,
  now = Date.now()
): AnalyticsEvent[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const nextEvents = [...readAnalytics(), { event, timestamp: now }].slice(-MAX_ANALYTICS_EVENTS);
  window.localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(nextEvents));
  return nextEvents;
};
