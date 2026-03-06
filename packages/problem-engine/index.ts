export { buildDslEntriesForType, generateDslArtifactsForType, loadPatternCatalog } from "packages/problem-engine/adapters";
export {
  evaluateAnswer,
  evaluateConstraints,
  generateProblem,
  generateProblems,
  generateVariables,
  parsePatternDSL,
  renderTemplate
} from "packages/problem-engine/dsl-engine";
export type { GeneratedProblem, Pattern, PatternDSL, Range } from "packages/problem-engine/dsl-engine";
export {
  parsePatternDSLMinimal,
  generateVariablesMinimal,
  evaluateConstraintsMinimal,
  renderTemplateMinimal,
  evaluateAnswerMinimal,
  generateMinimalProblem,
  generateMinimalProblems
} from "packages/problem-engine/dsl-engine";
export type {
  MinimalRange,
  MinimalPatternDSL,
  MinimalGeneratedProblem
} from "packages/problem-engine/dsl-engine";
