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
import { addOne, addZero, doubles, mustCarry, nearDoubles } from "./rules/addRules";
import { mustBorrow, noBorrow, subFacts } from "./rules/subRules";
import { sumIs10 } from "./rules/sumRules";
import {
  validateNumberCompare,
  validateNumberCompose,
  validateNumberCount,
  validateNumberDecompose,
  validateNumberLine,
  validateNumberOrder
} from "./rules/numberRules";

export const coreSingleRules = [
  hasQuestion,
  hasAnswer,
  hasDifficulty,
  patternKeyMatches,
  gradePedagogyRule,
  constraintsSatisfied,
  difficultyMatchesPattern
];

export const commonSingleRules = [...coreSingleRules, mathCorrect];

export const commonBatchRules = [validateDistribution];

export const skillRules: Record<string, SkillRuleSet> = {
  E1_NUMBER_COUNT: {
    single: [validateNumberCount],
    batch: []
  },
  E1_NUMBER_ORDER: {
    single: [validateNumberOrder],
    batch: []
  },
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
  E1_NUMBER_LINE: {
    single: [validateNumberLine],
    batch: []
  },
  E1_ADD_ZERO: {
    single: [addZero],
    batch: []
  },
  E1_ADD_ONE: {
    single: [addOne],
    batch: []
  },
  E1_ADD_DOUBLES: {
    single: [singleDigitOperands, doubles],
    batch: []
  },
  E1_ADD_NEAR_DOUBLES: {
    single: [singleDigitOperands, nearDoubles],
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
  E1_SUB_FACTS: {
    single: [subFacts],
    batch: []
  },
  E1_FACT_FAMILY: {
    single: [],
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
  const baseSingleRules = skillId === "E1_NUMBER_COMPARE" ? coreSingleRules : commonSingleRules;
  return {
    single: [...baseSingleRules, ...configured.single],
    batch: [...commonBatchRules, ...configured.batch]
  };
};
