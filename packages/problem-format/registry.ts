import type { PatternSpec } from "packages/problem-format/types";
import ELEMENTARY_ADD_1D_1D_NO from "packages/problem-format/patterns/elementary/ADD_1D_1D_NO.json";
import JUNIOR_INT_ADD from "packages/problem-format/patterns/junior/INT_ADD.json";
import HIGH_LOG_VAL from "packages/problem-format/patterns/high/LOG_VAL.json";
import E1_1 from "packages/problem-format/curriculum/E1-1.json";
import J1_3 from "packages/problem-format/curriculum/J1-3.json";
import H1_1 from "packages/problem-format/curriculum/H1-1.json";

type CurriculumDef = {
  level: string;
  patterns: string[];
};

const PATTERN_REGISTRY: Record<string, Record<string, PatternSpec>> = {
  elementary: {
    ADD_1D_1D_NO: ELEMENTARY_ADD_1D_1D_NO as PatternSpec
  },
  junior: {
    INT_ADD: JUNIOR_INT_ADD as PatternSpec
  },
  high: {
    LOG_VAL: HIGH_LOG_VAL as PatternSpec
  }
};

const CURRICULUM_REGISTRY: Record<string, CurriculumDef> = {
  "E1-1": E1_1 as CurriculumDef,
  "J1-3": J1_3 as CurriculumDef,
  "H1-1": H1_1 as CurriculumDef
};

export const resolveGradeBucketFromTypeId = (typeId: string) => {
  if (/^E\d/u.test(typeId)) return "elementary";
  if (/^J\d/u.test(typeId)) return "junior";
  if (/^H\d/u.test(typeId)) return "high";
  return "";
};

export const getPatternByGradeAndId = (grade: string, patternId: string) =>
  PATTERN_REGISTRY[grade]?.[patternId];

export const getCurriculumByLevel = (level: string) => CURRICULUM_REGISTRY[level];
