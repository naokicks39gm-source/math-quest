import { evaluateExpression, formatEvaluationValue } from "packages/problem-format/expressionEvaluator";
import type { VariableMap } from "packages/problem-format/types";

type RenderContext = {
  variables: VariableMap;
  answer?: string;
};

const BRACE_EXPR = /\{([^}]+)\}/gu;

export const renderTemplate = (template: string, context: RenderContext): string =>
  template.replace(BRACE_EXPR, (_whole, expr: string) => {
    const normalized = expr.trim();
    if (normalized === "answer") return context.answer ?? "";
    const value = evaluateExpression(normalized, context.variables);
    return formatEvaluationValue(value);
  });

export const renderTemplateLines = (templates: string[], context: RenderContext): string[] =>
  templates.map((template) => renderTemplate(template, context));
