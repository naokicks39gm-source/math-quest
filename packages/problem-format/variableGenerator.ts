import { evaluateExpression } from "packages/problem-format/expressionEvaluator";
import type { PatternVariables, VariableMap } from "packages/problem-format/types";

type GeneratorOptions = {
  constraint?: string;
  maxAttempts?: number;
};

const toCandidates = (rule: PatternVariables[string]): number[] => {
  if (Array.isArray(rule.choices) && rule.choices.length > 0) {
    return [...rule.choices];
  }
  if (typeof rule.min !== "number" || typeof rule.max !== "number") return [];
  const step = typeof rule.step === "number" && rule.step > 0 ? rule.step : 1;
  const out: number[] = [];
  for (let value = rule.min; value <= rule.max; value += step) {
    out.push(value);
  }
  return out;
};

const pickOne = (list: number[]) => list[Math.floor(Math.random() * list.length)];

export const generateVariables = (rules: PatternVariables, options?: GeneratorOptions): VariableMap | null => {
  const maxAttempts = options?.maxAttempts ?? 200;
  const entries = Object.entries(rules);
  if (entries.length === 0) return {};
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const generated: VariableMap = {};
    let valid = true;
    for (const [name, rule] of entries) {
      const excluded = new Set(rule.exclude ?? []);
      const candidates = toCandidates(rule).filter((value) => !excluded.has(value));
      if (candidates.length === 0) {
        valid = false;
        break;
      }
      generated[name] = pickOne(candidates);
    }
    if (!valid) continue;
    if (options?.constraint) {
      try {
        const condition = evaluateExpression(options.constraint, generated);
        if (typeof condition === "boolean" ? !condition : condition === 0) continue;
      } catch {
        continue;
      }
    }
    return generated;
  }
  return null;
};
