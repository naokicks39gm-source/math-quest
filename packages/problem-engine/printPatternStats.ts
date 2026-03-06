import { patternIndex } from "./patternIndex.ts";
import { conceptCoverage, difficultyCoverage, formatPatternCoverage, gradeCoverage } from "./patternCoverage.ts";

const EXPECTED_GRADE_COUNTS = {
  E1: 80,
  E2: 80,
  J1: 120,
  H1: 150
} as const;

const hasAllDifficultyLevels = Object.values(difficultyCoverage).every((count) => count > 0);
const missingConcepts = Object.entries(conceptCoverage)
  .filter(([, count]) => count === 0)
  .map(([concept]) => concept);

console.log("TOTAL PATTERNS:", patternIndex.length);
console.log("");
console.log(formatPatternCoverage());
console.log("");
console.log("GRADE COUNT CHECK:");

for (const [grade, expected] of Object.entries(EXPECTED_GRADE_COUNTS)) {
  const actual = gradeCoverage[grade as keyof typeof gradeCoverage];
  console.log(`WARNING ${grade}: actual=${actual}, expected≈${expected}`);
}

console.log("");
console.log(
  `DIFFICULTY LEVELS PRESENT: ${hasAllDifficultyLevels ? "YES" : "NO"} (${Object.entries(difficultyCoverage)
    .map(([level, count]) => `${level}:${count}`)
    .join(", ")})`
);
console.log(
  `CONCEPT COVERAGE: ${Object.entries(conceptCoverage)
    .map(([concept, count]) => `${concept}:${count}`)
    .join(", ")}`
);
console.log(`MISSING CONCEPTS: ${missingConcepts.length > 0 ? missingConcepts.join(", ") : "none"}`);
