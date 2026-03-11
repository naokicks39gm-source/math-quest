import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const PATTERN_GRADES = ["E1", "E2", "J1", "H1"] as const;

const CONCEPTS = [
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "equation",
  "fraction",
  "probability",
  "geometry"
] as const;

type PatternGrade = (typeof PATTERN_GRADES)[number];
export type PatternConcept = (typeof CONCEPTS)[number];

export type PatternMeta = {
  key: string;
  grade: string;
  difficulty: number;
  concept: string;
};

type PatternFileEntry = {
  grade: PatternGrade;
  fileName: string;
  pattern: PatternDsl;
};

const PATTERN_ROOT = path.join(process.cwd(), "packages/problem-engine/patterns");

type PatternDsl = {
  key: string;
  template: string;
  variables: Record<string, [number, number]> | { pairs: [number, number][] };
  generator?: Record<string, string>;
};

const hasPairVariables = (variables: PatternDsl["variables"]): variables is { pairs: [number, number][] } =>
  "pairs" in variables;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parsePatternEntry = (raw: unknown): PatternDsl => {
  if (!isRecord(raw)) {
    throw new Error("Pattern entry must be an object");
  }

  const { key, template, variables, generator } = raw;
  if (typeof key !== "string" || !key.trim()) {
    throw new Error("Pattern key is required");
  }
  if (typeof template !== "string" || !template.trim()) {
    throw new Error(`Pattern template is required: ${key}`);
  }
  if (!isRecord(variables)) {
    throw new Error(`Pattern variables must be an object: ${key}`);
  }

  const pairs = variables.pairs;
  if (pairs !== undefined) {
    if (
      !Array.isArray(pairs) ||
      pairs.length === 0 ||
      pairs.some(
        (pair) =>
          !Array.isArray(pair) ||
          pair.length !== 2 ||
          typeof pair[0] !== "number" ||
          typeof pair[1] !== "number"
      )
    ) {
      throw new Error(`Pattern variable pairs must be [number, number][]: ${key}`);
    }
    if (!isRecord(generator) || Object.values(generator).some((value) => typeof value !== "string")) {
      throw new Error(`Pattern generator must be Record<string, string>: ${key}`);
    }
    return {
      key,
      template,
      variables: {
        pairs: pairs.map((pair) => [Math.trunc(pair[0]), Math.trunc(pair[1])] as [number, number])
      },
      generator: Object.fromEntries(Object.entries(generator).map(([name, expr]) => [name, String(expr)]))
    };
  }

  const parsedVariables: Record<string, [number, number]> = {};
  for (const [name, range] of Object.entries(variables)) {
    if (
      !Array.isArray(range) ||
      range.length !== 2 ||
      typeof range[0] !== "number" ||
      typeof range[1] !== "number"
    ) {
      throw new Error(`Pattern variable range must be [min, max]: ${key}.${name}`);
    }
    parsedVariables[name] = [Math.trunc(range[0]), Math.trunc(range[1])];
  }

  return {
    key,
    template,
    variables: parsedVariables
  };
};

const readPatternEntries = (): PatternFileEntry[] => {
  const entries: PatternFileEntry[] = [];

  for (const grade of PATTERN_GRADES) {
    const dirPath = path.join(PATTERN_ROOT, grade);
    const fileNames = readdirSync(dirPath)
      .filter((fileName) => fileName.endsWith(".json"))
      .sort((a, b) => a.localeCompare(b));

    for (const fileName of fileNames) {
      const filePath = path.join(dirPath, fileName);
      const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
      if (!Array.isArray(raw)) {
        throw new Error(`Pattern catalog must be an array: ${grade}/${fileName}`);
      }

      for (const item of raw) {
        entries.push({
          grade,
          fileName,
          pattern: parsePatternEntry(item)
        });
      }
    }
  }

  return entries;
};

const inferConcept = (fileName: string, key: string): PatternConcept => {
  const baseName = fileName.replace(/\.json$/u, "");
  const normalized = `${baseName}:${key}`.toLowerCase();

  if (normalized.includes("linear-fraction") || normalized.includes("lin-frac")) {
    return "fraction";
  }
  if (normalized.includes("add")) {
    return "addition";
  }
  if (normalized.includes("sub")) {
    return "subtraction";
  }
  if (normalized.includes("mul")) {
    return "multiplication";
  }
  if (normalized.includes("div")) {
    return "division";
  }
  if (
    normalized.includes("quadratic") ||
    normalized.includes("quad") ||
    normalized.includes("discriminant") ||
    normalized.includes("disc") ||
    normalized.includes("linear") ||
    normalized.includes("lin") ||
    normalized.includes("expand") ||
    normalized.includes("exp-") ||
    normalized.includes("factor") ||
    normalized.includes("fac-")
  ) {
    return "equation";
  }
  if (normalized.includes("length") || normalized.includes("len") || normalized.includes("capacity") || normalized.includes("cap")) {
    return "geometry";
  }
  if (normalized.includes("probability") || normalized.includes("prob")) {
    return "probability";
  }

  throw new Error(`Unable to infer concept for pattern: ${key} (${fileName})`);
};

const inferDifficulty = (pattern: PatternDsl): number => {
  let score = 1;
  const maxVar = hasPairVariables(pattern.variables)
    ? Math.max(...pattern.variables.pairs.flatMap(([left, right]) => [Math.abs(left), Math.abs(right)]), 0)
    : Math.max(
        ...Object.values(pattern.variables).map(([min, max]) => Math.max(Math.abs(min), Math.abs(max))),
        0
      );

  if (maxVar > 20) score += 1;
  if (maxVar > 50) score += 1;
  if (pattern.template.includes("x")) score += 1;
  if (pattern.template.includes("^2")) score += 1;

  return Math.min(score, 5);
};

const buildPatternIndex = (): PatternMeta[] =>
  readPatternEntries()
    .map(({ grade, fileName, pattern }) => ({
      key: pattern.key,
      grade,
      difficulty: inferDifficulty(pattern),
      concept: inferConcept(fileName, pattern.key)
    }))
    .sort((left, right) => left.key.localeCompare(right.key));

export const patternGrades = PATTERN_GRADES;
export const patternConcepts = CONCEPTS;
export const patternIndex: PatternMeta[] = buildPatternIndex();
