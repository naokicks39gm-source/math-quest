import type { GeneratedProblem } from "packages/problem-engine";
import { DEFAULT_EXPLANATION, explanationTemplates } from "packages/problem-explanation/explanation-templates";

const TRAILING_INDEX_PATTERN = /-\d+$/u;

const hasValue = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const resolvePatternKeys = (patternKey?: string): string[] => {
  if (!patternKey) return [];

  const candidates: string[] = [];
  const seen = new Set<string>();
  const push = (value: string) => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    candidates.push(value);
  };

  push(patternKey);

  const withoutIndex = patternKey.replace(TRAILING_INDEX_PATTERN, "");
  push(withoutIndex);

  const parts = withoutIndex.split("-");
  while (parts.length > 1) {
    parts.pop();
    push(parts.join("-"));
  }

  return candidates;
};

const resolveTemplate = (patternKey?: string) => {
  for (const candidate of resolvePatternKeys(patternKey)) {
    if (Object.prototype.hasOwnProperty.call(explanationTemplates, candidate)) {
      return { candidate, template: explanationTemplates[candidate] };
    }
  }
  return undefined;
};

const hasRequiredVariables = (candidate: string, variables: Record<string, number> | undefined): boolean => {
  if (!variables) return false;
  if (candidate === "E1-ADD-BASIC" || candidate === "E1-ADD-MAKE10") {
    return hasValue(variables.a) && hasValue(variables.b);
  }
  return true;
};

export const generateExplanation = (problem: GeneratedProblem): string => {
  const resolved = resolveTemplate(problem.patternKey);
  if (!resolved) return DEFAULT_EXPLANATION;
  if (!hasRequiredVariables(resolved.candidate, problem.variables)) return DEFAULT_EXPLANATION;
  return resolved.template(problem.variables ?? {});
};

export { DEFAULT_EXPLANATION };
