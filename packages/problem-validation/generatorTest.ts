import addBasicPatterns from "packages/problem-engine/patterns/E1/add-basic.json";
import addMake10Patterns from "packages/problem-engine/patterns/E1/add-make10.json";
import addCarryPatterns from "packages/problem-engine/patterns/E1/add-carry.json";
import subBasicPatterns from "packages/problem-engine/patterns/E1/sub-basic.json";
import subBorrowPatterns from "packages/problem-engine/patterns/E1/sub-borrow.json";
import numberComparePatterns from "packages/problem-engine/patterns/E1/number-compare.json";
import numberComposePatterns from "packages/problem-engine/patterns/E1/number-compose.json";
import numberDecomposePatterns from "packages/problem-engine/patterns/E1/number-decompose.json";
import add2DigitPatterns from "packages/problem-engine/patterns/E2/add-2digit.json";
import sub2DigitPatterns from "packages/problem-engine/patterns/E2/sub-2digit.json";
import { generateProblems, generateRuntimeProblems, type GeneratedProblem, type PatternDSL } from "packages/problem-engine";
import { getSkill } from "packages/skill-system/skillTree";
import type { Skill } from "packages/skill-system/skillTypes";

import { validateProblem, validateProblemBatch } from "./problemValidator";

const patternCatalog: Record<string, PatternDSL[]> = {
  E1_ADD_BASIC: addBasicPatterns as unknown as PatternDSL[],
  E1_ADD_10: addMake10Patterns as unknown as PatternDSL[],
  E1_ADD_CARRY: addCarryPatterns as unknown as PatternDSL[],
  E1_SUB_BASIC: subBasicPatterns as unknown as PatternDSL[],
  E1_SUB_BORROW: subBorrowPatterns as unknown as PatternDSL[],
  E1_NUMBER_COMPARE: numberComparePatterns as unknown as PatternDSL[],
  E1_NUMBER_COMPOSE: numberComposePatterns as unknown as PatternDSL[],
  E1_NUMBER_DECOMPOSE: numberDecomposePatterns as unknown as PatternDSL[],
  E2_ADD_2DIGIT: add2DigitPatterns as unknown as PatternDSL[],
  E2_SUB_2DIGIT: sub2DigitPatterns as unknown as PatternDSL[]
};

const runtimeMandatorySkills = new Set(["E1_NUMBER_COMPARE", "E1_NUMBER_COMPOSE", "E1_NUMBER_DECOMPOSE"]);

const syntheticNumberPatterns: Record<string, PatternDSL> = {
  NUM_COMPARE_UP_TO_20: {
    key: "NUM_COMPARE_UP_TO_20",
    template: "{a} ? {b}",
    variables: { a: [0, 20], b: [0, 20] },
    answer: "LESS_OR_GREATER"
  },
  NUM_COMP_10: {
    key: "NUM_COMP_10",
    template: "{a} + {b} =",
    variables: { a: [0, 10], b: [0, 10] },
    answer: "a + b"
  },
  NUM_DECOMP_10: {
    key: "NUM_DECOMP_10",
    template: "{whole} は{known}と？でできます。",
    variables: { whole: [10, 10], known: [0, 10] },
    answer: "whole - known"
  }
};

export type SkillValidationSummary = {
  skillId: string;
  checked: number;
};

const buildSyntheticNumberProblems = (patternId: string, count: number): GeneratedProblem[] => {
  if (patternId === "NUM_COMPARE_UP_TO_20") {
    return Array.from({ length: count }, (_, index) => {
      const a = index % 21;
      let b = (index * 13 + 5) % 21;
      if (a === b) {
        b = (b + 1) % 21;
      }
      return {
        id: `NUM_COMPARE_UP_TO_20:${index}`,
        question: `${a} ? ${b}`,
        answer: a < b ? "LESS" : "GREATER",
        patternKey: patternId,
        variables: { a, b },
        meta: { difficulty: 1 }
      };
    });
  }

  if (patternId === "NUM_COMP_10") {
    return Array.from({ length: count }, (_, index) => {
      const a = index % 11;
      const b = 10 - a;
      return {
        id: `NUM_COMP_10:${index}`,
        question: `${a} + ${b} =`,
        answer: "10",
        patternKey: patternId,
        variables: { a, b },
        meta: { difficulty: 1 }
      };
    });
  }

  if (patternId === "NUM_DECOMP_10") {
    return Array.from({ length: count }, (_, index) => {
      const known = index % 11;
      const whole = 10;
      return {
        id: `NUM_DECOMP_10:${index}`,
        question: `${whole} は${known}と？でできます。`,
        answer: String(whole - known),
        patternKey: patternId,
        variables: { whole, known },
        meta: { difficulty: 1 }
      };
    });
  }

  throw new Error(`Synthetic generator not found for pattern: ${patternId}`);
};

const resolvePatternsForSkill = (skill: Skill): PatternDSL[] =>
  skill.patterns.flatMap((patternId) => {
    const patterns = patternCatalog[patternId];
    if (patterns) {
      return patterns;
    }
    const synthetic = syntheticNumberPatterns[patternId];
    if (synthetic) {
      return [synthetic];
    }
    throw new Error(`Pattern not found for skill pattern: ${patternId}`);
  });

export function validateSkillGenerator(skillId: string, totalCount: number = 1000): SkillValidationSummary {
  const skill = getSkill(skillId);
  if (!skill) {
    throw new Error(`Skill not found: ${skillId}`);
  }

  const patterns = resolvePatternsForSkill(skill);
  if (patterns.length === 0) {
    throw new Error(`No patterns resolved for skill: ${skillId}`);
  }

  const perPatternCount = Math.max(1, Math.ceil(totalCount / patterns.length));
  let checked = 0;

  for (const pattern of patterns) {
    const problems = runtimeMandatorySkills.has(skillId)
      ? generateRuntimeProblems(pattern, perPatternCount)
      : pattern.key in syntheticNumberPatterns
        ? buildSyntheticNumberProblems(pattern.key, perPatternCount)
        : generateProblems(pattern, perPatternCount);
    for (const problem of problems) {
      const result = validateProblem(problem, pattern, skill);
      if (!result.valid) {
        throw new Error(
          `[${skillId}] invalid problem for ${pattern.key}: ${result.error ?? "validation failed"}`
        );
      }
      checked += 1;
    }

    const batchResult = validateProblemBatch(problems, pattern, skill);
    if (!batchResult.valid) {
      throw new Error(
        `[${skillId}] invalid batch for ${pattern.key}: ${batchResult.ruleName ?? "batch"} ${batchResult.error ?? "validation failed"} sample="${problems[0]?.question ?? "n/a"}"`
      );
    }
  }

  return {
    skillId,
    checked
  };
}
