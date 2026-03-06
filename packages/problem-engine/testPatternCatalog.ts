import {
  getAllPatterns,
  getPatternMeta,
  getPatternsByConcept,
  getPatternsByDifficulty,
  getPatternsByGrade
} from "./patternCatalog.ts";

console.log(getPatternsByGrade("E1").length);
console.log(getAllPatterns().length);
console.log(getPatternsByConcept("probability").length);
console.log(getPatternsByDifficulty(5).length);
console.log(getPatternMeta("E1-ADD-BASIC-01"));
