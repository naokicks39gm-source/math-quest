import { evaluateExpression, formatEvaluationValue } from "packages/problem-format/expressionEvaluator";

export type VariableRule = {
  min?: number;
  max?: number;
  exclude?: number[];
  choices?: number[];
};

export type Pattern = {
  pattern_id: string;
  problem_template: string;
  variables: Record<string, VariableRule>;
  answer_expression: string;
  hint_templates?: string[];
  explanation_template?: string[];
};

export type GeneratedProblem = {
  pattern_id: string;
  problem: string;
  answer: string;
  hints: string[];
  explanation: string[];
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const renderTemplate = (template: string, vars: Record<string, number>) =>
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

const pickVariable = (rule: VariableRule): number => {
  if (Array.isArray(rule.choices) && rule.choices.length > 0) {
    const idx = randomInt(0, rule.choices.length - 1);
    return rule.choices[idx];
  }

  const min = typeof rule.min === "number" ? rule.min : -9;
  const max = typeof rule.max === "number" ? rule.max : 9;
  const excluded = new Set(rule.exclude ?? []);

  let attempts = 0;
  while (attempts < 200) {
    attempts += 1;
    const value = randomInt(min, max);
    if (!excluded.has(value)) return value;
  }

  for (let value = min; value <= max; value += 1) {
    if (!excluded.has(value)) return value;
  }
  throw new Error("Unable to pick variable from rule");
};

const expandFunctions = (
  text: string,
  vars: Record<string, number>,
  answer: string
) => text.replace(/\{([^}]+)\}/gu, (_whole, expr: string) => {
  const normalized = expr.trim();
  if (normalized === "answer") return answer;
  if (/^[A-Za-z_]\w*$/u.test(normalized)) {
    return vars[normalized] === undefined ? "" : String(vars[normalized]);
  }
  try {
    return formatEvaluationValue(evaluateExpression(normalized, vars));
  } catch {
    return "";
  }
});

export const generateProblem = (pattern: Pattern): GeneratedProblem => {
  const vars: Record<string, number> = {};
  for (const key of Object.keys(pattern.variables)) {
    vars[key] = pickVariable(pattern.variables[key]);
  }

  const problem = renderTemplate(pattern.problem_template, vars);
  const answer = formatEvaluationValue(evaluateExpression(pattern.answer_expression, vars));
  const hints = (pattern.hint_templates ?? []).map((line) => expandFunctions(line, vars, answer));
  const explanation = (pattern.explanation_template ?? []).map((line) => expandFunctions(line, vars, answer));

  return {
    pattern_id: pattern.pattern_id,
    problem,
    answer,
    hints,
    explanation
  };
};

export const generateProblems = (pattern: Pattern, n: number): GeneratedProblem[] => {
  const count = Math.max(0, Math.trunc(n));
  const problems: GeneratedProblem[] = [];
  for (let i = 0; i < count; i += 1) {
    problems.push(generateProblem(pattern));
  }
  return problems;
};
