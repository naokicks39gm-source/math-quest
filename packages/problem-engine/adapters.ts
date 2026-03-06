import { getPatternByGradeAndId, resolveGradeBucketFromTypeId } from "packages/problem-format/registry";
import { validatePatternSchema } from "packages/problem-format/schema";
import type { PatternArtifact } from "packages/problem-format/types";
import { generateProblems } from "packages/problem-engine/dsl-engine";

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

  const generationCount = Math.max(0, Math.trunc(options.generationCount ?? 200));
  const generated = generateProblems(validated.pattern, generationCount).map((item) => ({
    prompt: item.problem,
    answer: item.answer,
    hintLines: item.hints,
    explanationLines: item.explanation
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
