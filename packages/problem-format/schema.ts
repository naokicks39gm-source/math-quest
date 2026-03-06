import type { PatternSpec } from "packages/problem-format/types";

const SUPPORTED_FUNCTIONS = new Set(["abs", "sign", "pow", "gcd", "lcm"]);

type ValidationResult =
  | { ok: true; pattern: PatternSpec }
  | { ok: false; errors: string[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const extractFunctionNames = (text: string) => {
  const names = new Set<string>();
  const regex = /([A-Za-z_]\w*)\s*\(/g;
  let match: RegExpExecArray | null = regex.exec(text);
  while (match) {
    names.add(match[1]);
    match = regex.exec(text);
  }
  return [...names];
};

const validateFunctionUsage = (expression: string, errors: string[], label: string) => {
  const names = extractFunctionNames(expression);
  for (const name of names) {
    if (SUPPORTED_FUNCTIONS.has(name)) continue;
    errors.push(`${label} uses unsupported function: ${name}`);
  }
};

const validateVariableRule = (name: string, raw: unknown, errors: string[]) => {
  if (!isRecord(raw)) {
    errors.push(`variables.${name} must be an object`);
    return;
  }
  const hasRange = typeof raw.min === "number" && typeof raw.max === "number";
  const hasChoices = Array.isArray(raw.choices) && raw.choices.every((item) => typeof item === "number");
  if (!hasRange && !hasChoices) {
    errors.push(`variables.${name} requires min/max or choices`);
  }
  if (hasRange && Number(raw.min) > Number(raw.max)) {
    errors.push(`variables.${name} has invalid range`);
  }
  if (raw.step !== undefined && (typeof raw.step !== "number" || Number(raw.step) <= 0)) {
    errors.push(`variables.${name}.step must be > 0`);
  }
  if (raw.exclude !== undefined && (!Array.isArray(raw.exclude) || !raw.exclude.every((item) => typeof item === "number"))) {
    errors.push(`variables.${name}.exclude must be number[]`);
  }
};

export const validatePatternSchema = (raw: unknown): ValidationResult => {
  const errors: string[] = [];
  if (!isRecord(raw)) {
    return { ok: false, errors: ["pattern must be an object"] };
  }
  const patternId = raw.pattern_id;
  const problemTemplate = raw.problem_template;
  const variables = raw.variables;
  const answerExpression = raw.answer_expression;
  const hintTemplates = raw.hint_templates;
  const explanationTemplate = raw.explanation_template;
  const constraint = raw.constraint;

  if (typeof patternId !== "string" || !patternId.trim()) errors.push("pattern_id is required");
  if (typeof problemTemplate !== "string" || !problemTemplate.trim()) errors.push("problem_template is required");
  if (!isRecord(variables)) errors.push("variables must be an object");
  if (typeof answerExpression !== "string" || !answerExpression.trim()) errors.push("answer_expression is required");
  if (!Array.isArray(hintTemplates) || !hintTemplates.every((item) => typeof item === "string")) {
    errors.push("hint_templates must be string[]");
  }
  if (!Array.isArray(explanationTemplate) || !explanationTemplate.every((item) => typeof item === "string")) {
    errors.push("explanation_template must be string[]");
  }
  if (constraint !== undefined && typeof constraint !== "string") {
    errors.push("constraint must be a string when set");
  }
  if (isRecord(variables)) {
    for (const [name, rule] of Object.entries(variables)) {
      validateVariableRule(name, rule, errors);
    }
  }

  if (typeof answerExpression === "string") {
    validateFunctionUsage(answerExpression, errors, "answer_expression");
  }
  if (Array.isArray(hintTemplates)) {
    for (const template of hintTemplates) {
      validateFunctionUsage(template, errors, "hint_templates");
    }
  }
  if (Array.isArray(explanationTemplate)) {
    for (const template of explanationTemplate) {
      validateFunctionUsage(template, errors, "explanation_template");
    }
  }
  if (typeof constraint === "string" && constraint.trim()) {
    validateFunctionUsage(constraint, errors, "constraint");
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    pattern: raw as PatternSpec
  };
};
