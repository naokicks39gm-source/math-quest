import type { GeneratedProblem } from "packages/problem-engine";
import { DEFAULT_HINT, hintTemplates } from "packages/problem-hint/hint-templates";

const TRAILING_INDEX_PATTERN = /-\d+$/u;
const VARIABLE_PATTERN = /\{([^}]+)\}/gu;

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
    const template = hintTemplates[candidate];
    if (template) return template;
  }
  return undefined;
};

const buildMakeTenHint = (problem: GeneratedProblem): string | undefined => {
  const a = problem.variables?.a;
  const b = problem.variables?.b;
  if (!hasValue(a) || !hasValue(b)) return undefined;

  const build = (left: number, right: number) => {
    const toTen = 10 - left;
    const rest = right - toTen;
    if (toTen <= 0 || rest < 0) return undefined;
    return `${left} + ${toTen} + ${rest}`;
  };

  const primary = build(a, b);
  if (primary) {
    return `まず10を作ります\n${a} + ${b}\n↓\n${primary}`;
  }

  const secondary = build(b, a);
  if (!secondary) return undefined;

  return `まず10を作ります\n${a} + ${b}\n↓\n${secondary}`;
};

const renderTemplate = (template: string, problem: GeneratedProblem): string | undefined =>
  template.replace(VARIABLE_PATTERN, (_whole, rawName: string) => {
    const name = rawName.trim();
    const value = problem.variables?.[name];
    return hasValue(value) ? String(value) : "__MISSING_VARIABLE__";
  });

const buildHintFromTemplate = (problem: GeneratedProblem): string => {
  const template = resolveTemplate(problem.patternKey);
  if (!template) return DEFAULT_HINT;

  if (resolvePatternKeys(problem.patternKey).includes("E1-ADD-MAKE10")) {
    const makeTenHint = buildMakeTenHint(problem);
    if (makeTenHint) return makeTenHint;
  }

  const rendered = renderTemplate(template, problem);
  if (!rendered || rendered.includes("__MISSING_VARIABLE__")) {
    return DEFAULT_HINT;
  }

  return rendered;
};

export const generateHint = (problem: GeneratedProblem): string => buildHintFromTemplate(problem);

export { DEFAULT_HINT };
