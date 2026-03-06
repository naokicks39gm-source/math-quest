import { getPatternByGradeAndId, resolveGradeBucketFromTypeId } from "packages/problem-format/registry";
import { validatePatternSchema } from "packages/problem-format/schema";
import type { PatternArtifact } from "packages/problem-format/types";
import { generateStock } from "packages/problem-engine/dsl-engine";

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

const uniqueArtifacts = (artifacts: PatternArtifact[]) => {
  const seen = new Set<string>();
  const out: PatternArtifact[] = [];
  for (const artifact of artifacts) {
    const key = `${artifact.prompt}::${artifact.answer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(artifact);
  }
  return out;
};

export const generateDslArtifactsForType = (
  type: TypeDef,
  patternId: string,
  options: { targetCount: number }
): PatternArtifact[] => {
  const grade = resolveGradeBucketFromTypeId(type.type_id);
  if (!grade) return [];
  const pattern = getPatternByGradeAndId(grade, patternId);
  if (!pattern) return [];
  const validated = validatePatternSchema(pattern);
  if (!validated.ok) return [];

  const generated = generateStock(validated.pattern, options.targetCount).map((item) => ({
    prompt: item.problem,
    answer: item.answer,
    hintLines: item.hints,
    explanationLines: item.explanation
  }));
  return uniqueArtifacts(generated).slice(0, options.targetCount);
};

export const buildDslEntriesForType = (type: TypeDef, patternId: string, targetCount: number): QuestEntry[] => {
  const artifacts = generateDslArtifactsForType(type, patternId, { targetCount });
  return artifacts.map((artifact) => ({
    type,
    item: {
      prompt: artifact.prompt,
      prompt_tex: artifact.prompt,
      answer: artifact.answer
    }
  }));
};
