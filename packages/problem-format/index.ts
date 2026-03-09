export * from "packages/problem-engine";
export { buildDslEntriesForType, generateDslArtifactsForType } from "packages/problem-format/engine";
export { evaluateExpression, formatEvaluationValue } from "packages/problem-format/expressionEvaluator";
export { getCurriculumByLevel, getPatternByGradeAndId, resolveGradeBucketFromTypeId } from "packages/problem-format/registry";
export { validatePatternSchema } from "packages/problem-format/schema";
export { renderTemplate, renderTemplateLines } from "packages/problem-format/templateRenderer";
export { generateVariables } from "packages/problem-format/variableGenerator";
export type {
  LearningSessionAnswerRequest,
  LearningClientRecommendation,
  LearningSessionResumeResponse,
  LearningSessionStartResponse,
  LearningSessionAnswerResponse,
  LearningSessionFinishResponse
} from "packages/problem-format/learningSessionApi";
export type {
  SkillPracticeProblem,
  SkillPracticeResponse
} from "packages/problem-format/skillPracticeResponse";
export type {
  DslBuildOptions,
  PatternArtifact,
  PatternSpec,
  PatternVariableRule,
  PatternVariables,
  VariableMap
} from "packages/problem-format/types";
