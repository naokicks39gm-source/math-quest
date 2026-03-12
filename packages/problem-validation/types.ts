import type { GeneratedProblem, PatternDSL } from "packages/problem-engine";
import type { Skill } from "packages/skill-system/skillTypes";

export type ValidationContext = {
  problem: GeneratedProblem;
  pattern: PatternDSL;
  skill: Skill;
};

export type ValidationBatchContext = {
  skill: Skill;
  pattern: PatternDSL;
  problems: GeneratedProblem[];
};

export type RuleResult = {
  valid: boolean;
  error?: string;
  ruleName?: string;
};

export type Rule = (context: ValidationContext) => RuleResult;

export type BatchRule = (context: ValidationBatchContext) => RuleResult;

export type SkillRuleSet = {
  single: Rule[];
  batch: BatchRule[];
};
