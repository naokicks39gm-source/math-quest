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

const byPrefix = (patterns: PatternDSL[], prefix: string) => patterns.filter((pattern) => pattern.key.startsWith(prefix));

const patternCatalog: Record<string, PatternDSL[]> = {
  E1_NUMBER_COUNT: byPrefix(numberComparePatterns as unknown as PatternDSL[], "E1-NUM-COUNT-"),
  E1_NUMBER_ORDER: byPrefix(numberComparePatterns as unknown as PatternDSL[], "E1-NUM-ORDER-"),
  E1_NUMBER_COMPARE: byPrefix(numberComparePatterns as unknown as PatternDSL[], "E1-NUM-COMPARE-"),
  E1_NUMBER_COMPOSE: numberComposePatterns as unknown as PatternDSL[],
  E1_NUMBER_DECOMPOSE: numberDecomposePatterns as unknown as PatternDSL[],
  E1_NUMBER_LINE: byPrefix(numberComparePatterns as unknown as PatternDSL[], "E1-NUM-LINE-"),
  E1_ADD_ZERO: byPrefix(addBasicPatterns as unknown as PatternDSL[], "E1-ADD-ZERO-"),
  E1_ADD_ONE: byPrefix(addBasicPatterns as unknown as PatternDSL[], "E1-ADD-ONE-"),
  E1_ADD_DOUBLES: byPrefix(addBasicPatterns as unknown as PatternDSL[], "E1-ADD-DOUBLES-"),
  E1_ADD_NEAR_DOUBLES: byPrefix(addBasicPatterns as unknown as PatternDSL[], "E1-ADD-NEAR-DOUBLES-"),
  E1_ADD_BASIC: byPrefix(addBasicPatterns as unknown as PatternDSL[], "E1-ADD-BASIC-"),
  E1_ADD_10: addMake10Patterns as unknown as PatternDSL[],
  E1_ADD_CARRY: addCarryPatterns as unknown as PatternDSL[],
  E1_SUB_BASIC: byPrefix(subBasicPatterns as unknown as PatternDSL[], "E1-SUB-BASIC-"),
  E1_SUB_FACTS: byPrefix(subBasicPatterns as unknown as PatternDSL[], "E1-SUB-FACTS-"),
  E1_FACT_FAMILY: byPrefix(subBasicPatterns as unknown as PatternDSL[], "E1-FACT-FAMILY-"),
  E1_SUB_BORROW: subBorrowPatterns as unknown as PatternDSL[],
  E2_ADD_2DIGIT: add2DigitPatterns as unknown as PatternDSL[],
  E2_SUB_2DIGIT: sub2DigitPatterns as unknown as PatternDSL[]
};

const runtimeMandatorySkills = new Set(["E1_NUMBER_COMPARE"]);

export type SkillValidationSummary = {
  skillId: string;
  checked: number;
};

const resolvePatternsForSkill = (skill: Skill): PatternDSL[] =>
  skill.patterns.flatMap((patternId) => {
    const patterns = patternCatalog[patternId];
    if (patterns) {
      return patterns;
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
