import { patternIndex, patternGrades } from "./patternIndex.ts";

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const seenKeys = new Set<string>();
const allowedGrades = new Set(patternGrades);

for (const pattern of patternIndex) {
  if (seenKeys.has(pattern.key)) {
    fail(`ERROR: ${pattern.key} duplicate pattern key`);
  }
  seenKeys.add(pattern.key);

  if (!Number.isInteger(pattern.difficulty) || pattern.difficulty < 1 || pattern.difficulty > 5) {
    fail(`ERROR: ${pattern.key} difficulty must be 1..5`);
  }

  if (!allowedGrades.has(pattern.grade as (typeof patternGrades)[number])) {
    fail(`ERROR: ${pattern.key} grade must be E1, E2, J1, or H1`);
  }

  if (!pattern.concept.trim()) {
    fail(`ERROR: ${pattern.key} concept must not be empty`);
  }
}

console.log("VALIDATION OK");
