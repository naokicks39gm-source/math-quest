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
import type { PatternDSL } from "packages/problem-engine";
import { getPatterns as getSkillPatternBundles } from "packages/skill-system";

import type { LearningState } from "./studentStore";

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

export type WeakPattern = {
  skillId: string;
  patternKey: string;
  mastery: number;
};

export function resolvePatternBundles(patternBundleIds: string[]): PatternDSL[] {
  return patternBundleIds.flatMap((bundleId) => {
    const patterns = patternCatalog[bundleId];
    if (!patterns) {
      throw new Error(`Pattern not found for skill pattern: ${bundleId}`);
    }
    return patterns;
  });
}

export function resolveSkillPatterns(skillId: string): PatternDSL[] {
  const bundles = getSkillPatternBundles(skillId);
  console.log("SKILL PATTERN BUNDLES", bundles?.length);
  const patterns = resolvePatternBundles(bundles);
  console.log("RESOLVED SKILL PATTERNS", patterns?.length);
  return patterns;
}

export function getWeakPatterns(state: LearningState, skillId: string): WeakPattern[] {
  const { patternProgress } = state;
  const patterns = resolveSkillPatterns(skillId);

  return patterns
    .map((pattern) => {
      const progress = patternProgress[pattern.key];
      return {
        skillId,
        patternKey: pattern.key,
        mastery: progress?.mastery,
        attempts: progress?.attempts ?? 0
      };
    })
    .filter((pattern) => pattern.attempts >= 2 && (pattern.mastery ?? 0) < 0.7)
    .map(({ skillId: weakSkillId, patternKey, mastery }) => ({
      skillId: weakSkillId,
      patternKey,
      mastery: mastery ?? 0
    }));
}
