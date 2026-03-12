import type { SkillRuleSet } from "./types";
import {
  constraintsSatisfied,
  hasAnswer,
  hasDifficulty,
  hasQuestion,
  mathCorrect,
  patternKeyMatches
} from "./rules/mathRules";
import { difficultyMatchesPattern } from "./rules/difficultyRules";
import { gradePedagogyRule } from "./rules/gradeRules";
import { validateDistribution } from "./rules/distributionRules";
import { singleDigitOperands, twoDigitOperands } from "./rules/digitRules";
import { mustCarry } from "./rules/addRules";
import { mustBorrow, noBorrow } from "./rules/subRules";
import { sumIs10 } from "./rules/sumRules";
import { validateNumberCompare, validateNumberCompose, validateNumberDecompose } from "./rules/numberRules";

export const commonSingleRules = [
  hasQuestion,
  hasAnswer,
  hasDifficulty,
  patternKeyMatches,
  gradePedagogyRule,
  constraintsSatisfied,
  mathCorrect,
  difficultyMatchesPattern
];

export const numberCommonSingleRules = [hasQuestion, hasAnswer, hasDifficulty, patternKeyMatches, gradePedagogyRule];

export const commonBatchRules = [validateDistribution];

export const skillRules: Record<string, SkillRuleSet> = {
  E1_NUMBER_COMPARE: {
    single: [validateNumberCompare],
    batch: []
  },
  E1_NUMBER_COMPOSE: {
    single: [validateNumberCompose],
    batch: []
  },
  E1_NUMBER_DECOMPOSE: {
    single: [validateNumberDecompose],
    batch: []
  },
  E1_ADD_BASIC: {
    single: [singleDigitOperands],
    batch: []
  },
  E1_ADD_10: {
    single: [singleDigitOperands, sumIs10],
    batch: []
  },
  E1_ADD_CARRY: {
    single: [singleDigitOperands, mustCarry],
    batch: []
  },
  E1_SUB_BASIC: {
    single: [singleDigitOperands, noBorrow],
    batch: []
  },
  E1_SUB_BORROW: {
    single: [mustBorrow],
    batch: []
  },
  E2_ADD_2DIGIT: {
    single: [twoDigitOperands],
    batch: []
  },
  E2_SUB_2DIGIT: {
    single: [twoDigitOperands],
    batch: []
  },
  H1_BINOMIAL: {
    single: [],
    batch: []
  }
};

export const getRulesForSkill = (skillId: string): SkillRuleSet => {
  const configured = skillRules[skillId] ?? { single: [], batch: [] };
  const baseSingleRules = skillId.startsWith("E1_NUMBER_") ? numberCommonSingleRules : commonSingleRules;
  return {
    single: [...baseSingleRules, ...configured.single],
    batch: [...commonBatchRules, ...configured.batch]
  };
};
