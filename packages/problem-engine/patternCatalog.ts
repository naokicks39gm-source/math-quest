import { patternIndex, type PatternMeta } from "./patternIndex.ts";

export function getAllPatterns(): PatternMeta[] {
  return patternIndex;
}

export function getPatternsByGrade(grade: string): PatternMeta[] {
  return patternIndex.filter((pattern) => pattern.grade === grade);
}

export function getPatternsByConcept(concept: string): PatternMeta[] {
  return patternIndex.filter((pattern) => pattern.concept === concept);
}

export function getPatternsByDifficulty(level: number): PatternMeta[] {
  return patternIndex.filter((pattern) => pattern.difficulty === level);
}

export function getPatternMeta(key: string): PatternMeta | undefined {
  return patternIndex.find((pattern) => pattern.key === key);
}
