import { getPatternByGradeAndId, resolveGradeBucketFromTypeId } from "packages/problem-format/registry";
import { validatePatternSchema } from "packages/problem-format/schema";
import type { PatternArtifact } from "packages/problem-format/types";
import { generateProblems, type PatternDSL, type Range } from "packages/problem-engine/dsl-engine";

type AnswerFormat = {
  kind: "int" | "dec" | "frac" | "pair" | "expr";
};

type ExampleItem = {
  prompt: string;
  prompt_tex?: string;
  answer: string;
};

type TypeDef = {
  type_id: string;
  answer_format: AnswerFormat;
  generation_params?: {
    pattern_id?: string;
    [key: string]: unknown;
  };
  example_items: ExampleItem[];
};

type QuestEntry = {
  item: ExampleItem;
  type: TypeDef;
};

const toRange = (raw: { min?: number; max?: number; choices?: number[] }): Range => {
  if (Array.isArray(raw.choices) && raw.choices.length > 0) {
    const minChoice = Math.min(...raw.choices);
    const maxChoice = Math.max(...raw.choices);
    return [Math.trunc(minChoice), Math.trunc(maxChoice)];
  }
  const min = typeof raw.min === "number" ? raw.min : -9;
  const max = typeof raw.max === "number" ? raw.max : 9;
  return [Math.trunc(min), Math.trunc(max)];
};

const toPatternDsl = (pattern: {
  pattern_id: string;
  problem_template: string;
  variables: Record<string, { min?: number; max?: number; choices?: number[] }>;
  answer_expression: string;
  constraint?: string;
}): PatternDSL => {
  const variables = Object.fromEntries(
    Object.entries(pattern.variables).map(([key, rule]) => [key, toRange(rule)])
  ) as Record<string, Range>;

  return {
    key: pattern.pattern_id,
    template: pattern.problem_template,
    variables,
    constraints: pattern.constraint ? [pattern.constraint] : undefined,
    answer: pattern.answer_expression
  };
};

export const generateDslArtifactsForType = (
  type: TypeDef,
  patternId: string,
  options: { targetCount: number; generationCount?: number }
): PatternArtifact[] => {
  const grade = resolveGradeBucketFromTypeId(type.type_id);
  if (!grade) return [];
  const pattern = getPatternByGradeAndId(grade, patternId);
  if (!pattern) return [];
  const validated = validatePatternSchema(pattern);
  if (!validated.ok) return [];
  const minimalDsl = toPatternDsl(validated.pattern);

  const generationCount = Math.max(0, Math.trunc(options.generationCount ?? 200));
  const generated = generateProblems(minimalDsl, generationCount).map((item) => ({
    prompt: item.question,
    answer: item.answer,
    hintLines: [],
    explanationLines: []
  }));
  return generated.slice(0, options.targetCount);
};

export const buildDslEntriesForType = (
  type: TypeDef,
  patternId: string,
  targetCount: number,
  options?: { generationCount?: number }
): QuestEntry[] => {
  const artifacts = generateDslArtifactsForType(type, patternId, {
    targetCount,
    generationCount: options?.generationCount
  });
  return artifacts.map((artifact) => ({
    type,
    item: {
      prompt: artifact.prompt,
      prompt_tex: artifact.prompt,
      answer: artifact.answer
    }
  }));
};

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
    Object.entries(pattern.variables).map(([key, rule]) => [key, toRange(rule)])
  ) as Record<string, [number, number]>;

  return {
    key: pattern.pattern_id,
    template: pattern.problem_template,
    variables,
    constraints: pattern.constraint ? [pattern.constraint] : undefined,
    answer: pattern.answer_expression
  };
};
