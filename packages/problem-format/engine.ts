import { evaluateExpression, formatEvaluationValue } from "packages/problem-format/expressionEvaluator";
import { getPatternByGradeAndId, resolveGradeBucketFromTypeId } from "packages/problem-format/registry";
import { validatePatternSchema } from "packages/problem-format/schema";
import { renderTemplate, renderTemplateLines } from "packages/problem-format/templateRenderer";
import type { DslBuildOptions, PatternArtifact } from "packages/problem-format/types";
import { generateVariables } from "packages/problem-format/variableGenerator";

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
  options: DslBuildOptions
): PatternArtifact[] => {
  const grade = resolveGradeBucketFromTypeId(type.type_id);
  if (!grade) return [];
  const pattern = getPatternByGradeAndId(grade, patternId);
  if (!pattern) return [];

  const validation = validatePatternSchema(pattern);
  if (!validation.ok) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[dsl-pattern-invalid]", { patternId, errors: validation.errors });
    }
    return [];
  }

  const out: PatternArtifact[] = [];
  const maxAttempts = options.maxAttempts ?? options.targetCount * 40;
  for (let attempts = 0; attempts < maxAttempts && out.length < options.targetCount; attempts += 1) {
    const variables = generateVariables(validation.pattern.variables, {
      constraint: validation.pattern.constraint
    });
    if (!variables) continue;

    let answer = "";
    try {
      answer = formatEvaluationValue(evaluateExpression(validation.pattern.answer_expression, variables));
    } catch {
      continue;
    }
    const prompt = renderTemplate(validation.pattern.problem_template, { variables, answer });
    const hintLines = renderTemplateLines(validation.pattern.hint_templates, { variables, answer });
    const explanationLines = renderTemplateLines(validation.pattern.explanation_template, { variables, answer });
    out.push({ prompt, answer, hintLines, explanationLines });
  }

  return uniqueArtifacts(out).slice(0, options.targetCount);
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
