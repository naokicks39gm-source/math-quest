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
import skillsData from "packages/skill-system/skills.json";
import type { PatternDSL } from "packages/problem-engine";

type SkillDefinition = {
  id: string;
  title: string;
  patterns: string[];
};

export type LearningPatternCatalogEntry = {
  patternId: string;
  skillId: string;
  skillTitle: string;
  title: string;
  pattern: PatternDSL;
};

const byPrefix = (patterns: PatternDSL[], prefix: string) => patterns.filter((pattern) => pattern.key.startsWith(prefix));

const patternBundles: Record<string, PatternDSL[]> = {
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

const supportedSkills = (skillsData as SkillDefinition[]).filter((skill) =>
  (skill.patterns ?? []).some((patternBundleId) => patternBundleId in patternBundles)
);

const catalogEntries: LearningPatternCatalogEntry[] = supportedSkills.flatMap((skill) =>
  (skill.patterns ?? []).flatMap((patternBundleId) =>
    (patternBundles[patternBundleId] ?? []).map((pattern) => ({
      patternId: pattern.key,
      skillId: skill.id,
      skillTitle: skill.title,
      title: pattern.template,
      pattern
    }))
  )
);

export const learningPatternCatalog = catalogEntries;

export const getLearningPattern = (patternId: string) =>
  catalogEntries.find((entry) => entry.patternId === patternId);
