export type PatternVariableRule = {
  min?: number;
  max?: number;
  exclude?: number[];
  step?: number;
  choices?: number[];
};

export type PatternVariables = Record<string, PatternVariableRule>;

export type PatternSpec = {
  pattern_id: string;
  problem_template: string;
  variables: PatternVariables;
  answer_expression: string;
  hint_templates: string[];
  explanation_template: string[];
  constraint?: string;
};

export type EvaluationValue = number | boolean;

export type VariableMap = Record<string, number>;

export type PatternArtifact = {
  prompt: string;
  answer: string;
  hintLines: string[];
  explanationLines: string[];
};

export type DslBuildOptions = {
  targetCount: number;
  maxAttempts?: number;
};
