import { evaluateExpression, formatEvaluationValue } from "packages/problem-format/expressionEvaluator";

export type Range = [number, number];

export type PatternDSL = {
  key: string;
  template: string;
  variables: Record<string, Range>;
  constraints?: string[];
  answer: string;
};

export type GeneratedProblem = {
  id: string;
  question: string;
  answer: string;
  patternKey?: string;
  variables?: Record<string, number>;
  variableRanges?: Record<string, [number, number]>;
  meta?: {
    source?: string;
    difficulty?: number;
  };
};

const MAX_CONSTRAINT_ATTEMPTS = 500;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const hasFiniteValue = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

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

export const generateVariables = (pattern: PatternDSL): Record<string, number> => {
  const vars: Record<string, number> = {};
  for (const [name, range] of Object.entries(pattern.variables)) {
    vars[name] = randomInt(range[0], range[1]);
  }
  return vars;
};

const applyDerivedVariables = (pattern: PatternDSL, vars: Record<string, number>): Record<string, number> => {
  if (!hasFiniteValue(vars.a) || !hasFiniteValue(vars.b) || !hasFiniteValue(vars.x)) {
    return vars;
  }

  if (pattern.key === "J1-LIN-NEG-01") {
    return { ...vars, c: vars.a * vars.x + vars.b };
  }

  if (pattern.key === "J1-LIN-NEG-02") {
    return { ...vars, c: vars.a * vars.x - vars.b };
  }

  if (pattern.key === "J1-LIN-NEG-03") {
    return { ...vars, c: -vars.a * vars.x + vars.b };
  }

  if (pattern.key === "J1-LIN-NEG-04") {
    return { ...vars, c: vars.a * (vars.x - vars.b) };
  }

  return vars;
};

export const evaluateConstraints = (pattern: PatternDSL, vars: Record<string, number>) => {
  const context = Object.fromEntries(
    Object.entries(vars)
      .filter(([, value]) => Number.isFinite(value))
      .map(([key, value]) => [key, Number(value)])
  ) as Record<string, number>;

  for (const constraint of pattern.constraints ?? []) {
    const result = evaluateExpression(constraint, context);
    if (typeof result === "boolean") {
      if (!result) return false;
      continue;
    }
    if (result === 0) return false;
  }

  return true;
};

export const renderTemplate = (template: string, vars: Record<string, number>) =>
  template.replace(/\{([^}]+)\}/gu, (_whole, expr: string) => {
    const key = expr.trim();
    if (!/^[A-Za-z_]\w*$/u.test(key)) {
      throw new Error("DSL template variable not defined");
    }

    const value = vars[key];
    if (value === undefined) {
      throw new Error("DSL template variable not defined");
    }

    return String(value);
  });

export const evaluateAnswer = (answerExpr: string, vars: Record<string, number>) =>
  formatEvaluationValue(evaluateExpression(answerExpr, vars));

export const computeDifficulty = (problem: GeneratedProblem): number => {
  let score = 1;
  const vars = Object.values(problem.variables ?? {});
  const maxVar = Math.max(...vars.map((value) => Math.abs(value)), 0);

  if (maxVar > 20) score += 1;
  if (maxVar > 50) score += 1;

  const question = problem.question;
  if (question.includes("x")) score += 1;
  if (question.includes("^2")) score += 1;

  return Math.min(score, 5);
};

export const generateMinimalProblem = (rawPattern: PatternDSL): GeneratedProblem => {
  const pattern = parsePatternDSL(rawPattern);
  let vars: Record<string, number> = {};
  let matched = false;

  for (let attempts = 0; attempts < MAX_CONSTRAINT_ATTEMPTS; attempts += 1) {
    vars = applyDerivedVariables(pattern, generateVariables(pattern));
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
  const difficulty = computeDifficulty({
    id,
    question,
    answer,
    patternKey: pattern.key,
    variables: vars,
    variableRanges: pattern.variables
  });

  return {
    id,
    question,
    answer,
    patternKey: pattern.key,
    variables: vars,
    variableRanges: pattern.variables,
    meta: {
      source: "pattern-dsl",
      difficulty
    }
  };
};

export const generateMinimalProblems = (pattern: PatternDSL, n: number): GeneratedProblem[] => {
  const parsed = parsePatternDSL(pattern);
  const count = Math.max(0, Math.trunc(n));
  const problems: GeneratedProblem[] = [];

  for (let i = 0; i < count; i += 1) {
    problems.push(generateMinimalProblem(parsed));
  }

  return problems;
};
