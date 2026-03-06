import { patternIndex } from "./patternIndex.ts";

const expectedConcepts = [
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "equation",
  "fraction",
  "probability",
  "geometry"
] as const;

const expectedDifficulty = [1, 2, 3, 4, 5] as const;
const expectedGrades = ["E1", "E2", "J1", "H1"] as const;

const gradeCounts = Object.fromEntries(expectedGrades.map((grade) => [grade, 0])) as Record<
  (typeof expectedGrades)[number],
  number
>;
const conceptCounts = Object.fromEntries(expectedConcepts.map((concept) => [concept, 0])) as Record<
  (typeof expectedConcepts)[number],
  number
>;
const difficultyCounts = Object.fromEntries(expectedDifficulty.map((difficulty) => [difficulty, 0])) as Record<
  (typeof expectedDifficulty)[number],
  number
>;

for (const pattern of patternIndex) {
  if (pattern.grade in gradeCounts) {
    gradeCounts[pattern.grade as keyof typeof gradeCounts] += 1;
  }
  if (pattern.concept in conceptCounts) {
    conceptCounts[pattern.concept as keyof typeof conceptCounts] += 1;
  }
  if (pattern.difficulty in difficultyCounts) {
    difficultyCounts[pattern.difficulty as keyof typeof difficultyCounts] += 1;
  }
}

const gaps = [
  ...expectedDifficulty
    .filter((difficulty) => difficultyCounts[difficulty] === 0)
    .map((difficulty) => `GAP: difficulty ${difficulty} missing`),
  ...expectedConcepts
    .filter((concept) => conceptCounts[concept] === 0)
    .map((concept) => `GAP: concept ${concept} missing`)
];

console.log("GRADE");
for (const grade of expectedGrades) {
  console.log(`${grade} ${gradeCounts[grade]}`);
}

console.log("");
console.log("GAPS");
if (gaps.length === 0) {
  console.log("none");
} else {
  for (const gap of gaps) {
    console.log(gap);
  }
}
