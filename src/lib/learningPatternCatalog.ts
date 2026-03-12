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

type PatternDSL = {
  key: string;
  template: string;
  variables: Record<string, [number, number]>;
  constraints?: string[];
  answer: string;
};

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

const patternBundles: Record<string, PatternDSL[]> = {
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
