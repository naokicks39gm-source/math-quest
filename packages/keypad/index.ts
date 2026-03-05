import { ELEMENTARY_KEYPAD } from "./layouts/elementaryLayout";
import { HIGH_KEYPAD } from "./layouts/highLayout";
import { JUNIOR_KEYPAD } from "./layouts/juniorLayout";

export * from "./keys";
export * from "./layouts/elementaryLayout";
export * from "./layouts/juniorLayout";
export * from "./layouts/highLayout";

export const KEYPAD_LAYOUT_BY_MODE = {
  elementary: ELEMENTARY_KEYPAD,
  junior: JUNIOR_KEYPAD,
  highschool: HIGH_KEYPAD
} as const;
