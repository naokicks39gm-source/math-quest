import {
  ELEMENTARY_KEYPAD,
  HIGH_KEYPAD,
  JUNIOR_KEYPAD,
  KEYS
} from "packages/keypad";

export type MathKeypadToken = (typeof KEYS)[keyof typeof KEYS];

export const KEYPAD_LAYOUT = HIGH_KEYPAD;

export const KEYPAD_LAYOUT_BY_MODE = {
  elementary: ELEMENTARY_KEYPAD,
  junior: JUNIOR_KEYPAD,
  highschool: HIGH_KEYPAD
} as const;
