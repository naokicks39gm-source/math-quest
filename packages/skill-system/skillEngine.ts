import type { GeneratedProblem, PatternDSL } from "packages/problem-engine";
import { generateProblems } from "packages/problem-engine";
import addBasicPatterns from "packages/problem-engine/patterns/E1/add-basic.json";
import addCarryPatterns from "packages/problem-engine/patterns/E1/add-carry.json";
import subBasicPatterns from "packages/problem-engine/patterns/E1/sub-basic.json";
import subBorrowPatterns from "packages/problem-engine/patterns/E1/sub-borrow.json";
import add2DigitPatterns from "packages/problem-engine/patterns/E2/add-2digit.json";
import sub2DigitPatterns from "packages/problem-engine/patterns/E2/sub-2digit.json";
import skillsData from "./skills.json";
import type { Skill } from "./skillTypes";

const skills = skillsData as Skill[];

const asPatternCatalog = (patterns: unknown): PatternDSL[] => patterns as PatternDSL[];

const patternCatalog: Record<string, PatternDSL[]> = {
  E1_ADD_BASIC: asPatternCatalog(addBasicPatterns),
  E1_ADD_CARRY: asPatternCatalog(addCarryPatterns),
  E1_SUB_BASIC: asPatternCatalog(subBasicPatterns),
  E1_SUB_BORROW: asPatternCatalog(subBorrowPatterns),
  E2_ADD_2DIGIT: asPatternCatalog(add2DigitPatterns),
  E2_SUB_2DIGIT: asPatternCatalog(sub2DigitPatterns)
};
type PatternStockEntry = {
  stock: GeneratedProblem[];
  cursor: number;
};

// patternStockCache is process-level cache.
// It persists during the Node.js process lifetime.
// In serverless environments the cache may reset between requests.
const patternStockCache = new Map<string, PatternStockEntry>();

const findSkill = (skillId: string): Skill => {
  const skill = skills.find((entry) => entry.id === skillId);
  if (!skill) {
    throw new Error("Skill not found");
  }
  return skill;
};

const resolvePatternsForSkillPattern = (patternId: string): PatternDSL[] => {
  const patterns = patternCatalog[patternId];
  if (!patterns) {
    throw new Error(`Pattern not found for skill pattern: ${patternId}`);
  }
  return patterns;
};

const getPatternStock = (pattern: PatternDSL): PatternStockEntry => {
  const cached = patternStockCache.get(pattern.key);
  if (cached) {
    return cached;
  }

  const entry = {
    stock: shuffle(generateProblems(pattern, 200)),
    cursor: 0
  };
  patternStockCache.set(pattern.key, entry);
  return entry;
};

const takeFromStock = (pattern: PatternDSL, count: number): GeneratedProblem[] => {
  const targetCount = Math.max(0, Math.trunc(count));
  if (targetCount <= 0) {
    return [];
  }

  const entry = getPatternStock(pattern);
  const start = entry.cursor;
  const end = start + targetCount;
  const quiz = entry.stock.slice(start, end);

  if (quiz.length === targetCount) {
    entry.cursor = end;
    return quiz;
  }

  const remaining = targetCount - quiz.length;
  entry.stock = shuffle(entry.stock);
  entry.cursor = remaining;
  return [...quiz, ...entry.stock.slice(0, remaining)];
};

const shuffle = <T>(array: T[]): T[] => {
  const arr = [...array];

  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));

    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }

  return arr;
};

export function getPatterns(skillId: string): string[] {
  return findSkill(skillId).patterns;
}

export function generateSkillQuiz(skillId: string, count: number = 5): GeneratedProblem[] {
  const skill = findSkill(skillId);
  const targetCount = Math.max(0, Math.trunc(count));
  if (targetCount <= 0) {
    return [];
  }

  const patterns = skill.patterns.flatMap((skillPattern) => resolvePatternsForSkillPattern(skillPattern));
  const shuffledPatterns = shuffle([...patterns]);
  const pool: GeneratedProblem[] = [];
  let addedInLastRound = true;

  while (pool.length < targetCount && addedInLastRound) {
    addedInLastRound = false;

    for (const pattern of shuffledPatterns) {
      const problem = takeFromStock(pattern, 1);

      if (problem.length > 0) {
        pool.push(problem[0]);
        addedInLastRound = true;
      }

      if (pool.length >= targetCount) {
        break;
      }
    }
  }

  if (pool.length === 0) {
    throw new Error("generateSkillQuiz: no problems generated");
  }

  return pool.slice(0, targetCount);
}
