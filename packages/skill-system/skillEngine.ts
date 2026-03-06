import type { GeneratedProblem, PatternDSL } from "packages/problem-engine";
import { generateProblems } from "packages/problem-engine";
import addBasicPatterns from "packages/problem-engine/patterns/E1/add-basic.json";
import addCarryPatterns from "packages/problem-engine/patterns/E1/add-carry.json";
import skillsData from "./skills.json";
import type { Skill } from "./skillTypes";

const skills = skillsData as Skill[];

const asPatternCatalog = (patterns: unknown): PatternDSL[] => patterns as PatternDSL[];

const patternCatalog: Record<string, PatternDSL[]> = {
  E1_ADD_BASIC: asPatternCatalog(addBasicPatterns),
  E1_ADD_CARRY: asPatternCatalog(addCarryPatterns)
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

  const problems: GeneratedProblem[] = [];

  for (const skillPattern of skill.patterns) {
    const resolvedPatterns = resolvePatternsForSkillPattern(skillPattern);

    for (const pattern of resolvedPatterns) {
      const entry = getPatternStock(pattern);
      const start = entry.cursor;
      const end = start + targetCount;
      const quiz = entry.stock.slice(start, end);

      if (quiz.length === targetCount) {
        entry.cursor = end;
        problems.push(...quiz);
        continue;
      }

      const remaining = targetCount - quiz.length;
      entry.stock = shuffle(entry.stock);
      entry.cursor = remaining;
      problems.push(...quiz, ...entry.stock.slice(0, remaining));
    }
  }

  return problems.slice(0, targetCount);
}
