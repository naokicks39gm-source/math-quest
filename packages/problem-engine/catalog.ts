import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parsePatternDSLMinimal } from "packages/problem-engine/dsl-engine";

const PATTERN_CATALOG_DIRS = ["E1", "E2", "J1", "H1"] as const;

type LegacyMinimalDslPatternInput = {
  pattern_id: string;
  problem_template: string;
  variables: Record<string, { min?: number; max?: number; choices?: number[] }>;
  answer_expression: string;
  constraint?: string;
};

export const toMinimalPatternDsl = (
  pattern: LegacyMinimalDslPatternInput
): import("packages/problem-engine/minimal-dsl").PatternDSL => {
  const variables = Object.fromEntries(
    Object.entries(pattern.variables).map(([key, rule]) => {
      if (Array.isArray(rule.choices) && rule.choices.length > 0) {
        const minChoice = Math.min(...rule.choices);
        const maxChoice = Math.max(...rule.choices);
        return [key, [Math.trunc(minChoice), Math.trunc(maxChoice)]];
      }
      const min = typeof rule.min === "number" ? rule.min : -9;
      const max = typeof rule.max === "number" ? rule.max : 9;
      return [key, [Math.trunc(min), Math.trunc(max)]];
    })
  ) as Record<string, [number, number]>;

  return {
    key: pattern.pattern_id,
    template: pattern.problem_template,
    variables,
    constraints: pattern.constraint ? [pattern.constraint] : undefined,
    answer: pattern.answer_expression
  };
};

export const loadPatternCatalog = (
  type: (typeof PATTERN_CATALOG_DIRS)[number]
): import("packages/problem-engine/minimal-dsl").PatternDSL[] => {
  const dirPath = path.join(process.cwd(), "packages/problem-engine/patterns", type);
  const fileNames = readdirSync(dirPath)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));

  const patterns: import("packages/problem-engine/minimal-dsl").PatternDSL[] = [];

  for (const fileName of fileNames) {
    const filePath = path.join(dirPath, fileName);
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
    if (!Array.isArray(raw)) {
      throw new Error(`Pattern catalog must be an array: ${type}/${fileName}`);
    }
    patterns.push(...raw.map((entry) => parsePatternDSLMinimal(entry)));
  }

  return patterns;
};
