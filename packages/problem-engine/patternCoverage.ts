import { patternConcepts, patternGrades, patternIndex, type PatternConcept } from "./patternIndex.ts";

const DIFFICULTY_LEVELS = [1, 2, 3, 4, 5] as const;

type GradeCoverage = Record<(typeof patternGrades)[number], number>;
type DifficultyCoverage = Record<(typeof DIFFICULTY_LEVELS)[number], number>;
type ConceptCoverage = Record<PatternConcept, number>;

const countBy = <T extends string | number>(
  keys: readonly T[],
  selector: (meta: (typeof patternIndex)[number]) => T
): Record<T, number> => {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
  for (const meta of patternIndex) {
    counts[selector(meta)] += 1;
  }
  return counts;
};

export const gradeCoverage: GradeCoverage = countBy(
  patternGrades,
  (meta) => meta.grade as (typeof patternGrades)[number]
);

export const difficultyCoverage: DifficultyCoverage = countBy(
  DIFFICULTY_LEVELS,
  (meta) => meta.difficulty as (typeof DIFFICULTY_LEVELS)[number]
);

export const conceptCoverage: ConceptCoverage = countBy(
  patternConcepts,
  (meta) => meta.concept as PatternConcept
);

export const formatPatternCoverage = (): string => {
  const sections = [
    ["grade", gradeCoverage],
    ["difficulty", difficultyCoverage],
    ["concept", conceptCoverage]
  ] as const;

  return sections
    .map(([label, counts]) => {
      const body = Object.entries(counts)
        .map(([key, count]) => `${key}: ${count}`)
        .join("\n");
      return `${label}\n${body}`;
    })
    .join("\n\n");
};
