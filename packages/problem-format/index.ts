export { buildDslEntriesForType, generateDslArtifactsForType } from "packages/problem-format/engine";
export { evaluateExpression, formatEvaluationValue } from "packages/problem-format/expressionEvaluator";
export { getCurriculumByLevel, getPatternByGradeAndId, resolveGradeBucketFromTypeId } from "packages/problem-format/registry";
export { validatePatternSchema } from "packages/problem-format/schema";
export { renderTemplate, renderTemplateLines } from "packages/problem-format/templateRenderer";
export { generateVariables } from "packages/problem-format/variableGenerator";
export type {
  DslBuildOptions,
  PatternArtifact,
  PatternSpec,
  PatternVariableRule,
  PatternVariables,
  VariableMap
} from "packages/problem-format/types";
