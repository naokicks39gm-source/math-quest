import { evaluateExpression, formatEvaluationValue } from "packages/problem-format/expressionEvaluator";

export type Range = [number, number];

export type PatternDSL = {
  key: string;
  template: string;
  variables: Record<string, Range>;
  constraints?: string[];
  answer: string;
};

export type Pattern = PatternDSL;

export type GeneratedProblem = {
  id: string;
  question: string;
  answer: string;
  patternKey?: string;
  variables?: Record<string, number>;
  meta?: Record<string, unknown>;
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const parsePatternDSL = (raw: unknown): PatternDSL => {
  if (!isRecord(raw)) throw new Error("pattern must be an object");
  const key = raw.key;
  const template = raw.template;
  const variablesRaw = raw.variables;
  const constraints = raw.constraints;
  const answer = raw.answer;

  if (typeof key !== "string" || !key.trim()) throw new Error("pattern.key is required");
  if (typeof template !== "string" || !template.trim()) throw new Error("pattern.template is required");
  if (!isRecord(variablesRaw)) throw new Error("pattern.variables must be an object");
  if (typeof answer !== "string" || !answer.trim()) throw new Error("pattern.answer is required");
  if (constraints !== undefined && (!Array.isArray(constraints) || !constraints.every((item) => typeof item === "string"))) {
    throw new Error("pattern.constraints must be string[] when set");
  }

  const variables: Record<string, Range> = {};
  for (const [name, rangeRaw] of Object.entries(variablesRaw)) {
    if (!Array.isArray(rangeRaw) || rangeRaw.length !== 2) {
      throw new Error(`pattern.variables.${name} must be [min,max]`);
    }
    const min = Number(rangeRaw[0]);
    const max = Number(rangeRaw[1]);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new Error(`pattern.variables.${name} range must be finite numbers`);
    }
    if (min > max) {
      throw new Error(`pattern.variables.${name} has invalid range`);
    }
    variables[name] = [Math.trunc(min), Math.trunc(max)];
  }

  return {
    key,
    template,
    variables,
    constraints: constraints as string[] | undefined,
    answer
  };
};

export const renderTemplate = (template: string, vars: Record<string, number>) =>
  template.replace(/\{([^}]+)\}/gu, (_whole, expr: string) => {
    const normalized = expr.trim();
    if (/^[A-Za-z_]\w*$/u.test(normalized)) {
      const value = vars[normalized];
      return value === undefined ? "" : String(value);
    }
    try {
      return formatEvaluationValue(evaluateExpression(normalized, vars));
    } catch {
      return "";
    }
  });

export const generateVariables = (pattern: PatternDSL): Record<string, number> => {
  const vars: Record<string, number> = {};
  for (const [name, range] of Object.entries(pattern.variables)) {
    vars[name] = randomInt(range[0], range[1]);
  }
  return vars;
};

export const evaluateConstraints = (pattern: PatternDSL, vars: Record<string, number>) => {
  const constraints = pattern.constraints ?? [];
  for (const constraint of constraints) {
    const result = evaluateExpression(constraint, vars);
    if (typeof result === "boolean") {
      if (!result) return false;
      continue;
    }
    if (result === 0) return false;
  }
  return true;
};

export const evaluateAnswer = (answerExpr: string, vars: Record<string, number>) =>
  formatEvaluationValue(evaluateExpression(answerExpr, vars));

const MAX_CONSTRAINT_ATTEMPTS = 500;

export const generateProblem = (rawPattern: PatternDSL): GeneratedProblem => {
  const pattern = parsePatternDSL(rawPattern);
  let vars: Record<string, number> = {};
  let matched = false;
  for (let attempts = 0; attempts < MAX_CONSTRAINT_ATTEMPTS; attempts += 1) {
    vars = generateVariables(pattern);
    if (evaluateConstraints(pattern, vars)) {
      matched = true;
      break;
    }
  }
  if (!matched) {
    throw new Error(`Unable to satisfy constraints for pattern: ${pattern.key}`);
  }

  const question = renderTemplate(pattern.template, vars);
  const answer = evaluateAnswer(pattern.answer, vars);
  const id = `${pattern.key}:${question}:${answer}`;

  return {
    id,
    question,
    answer,
    patternKey: pattern.key,
    variables: vars,
    meta: {
      source: "pattern-dsl"
    }
  };
};

export const generateProblems = (pattern: PatternDSL, n: number): GeneratedProblem[] => {
  const parsed = parsePatternDSL(pattern);
  const count = Math.max(0, Math.trunc(n));
  const problems: GeneratedProblem[] = [];
  for (let i = 0; i < count; i += 1) {
    problems.push(generateProblem(parsed));
  }
  return problems;
};
