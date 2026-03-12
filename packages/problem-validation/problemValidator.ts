import type { Skill } from "packages/skill-system/skillTypes";
import type { GeneratedProblem, PatternDSL } from "packages/problem-engine";

import { getRulesForSkill } from "./skillRules";
import type { RuleResult } from "./types";

export function validateProblem(problem: GeneratedProblem, pattern: PatternDSL, skill: Skill): RuleResult {
  const rules = getRulesForSkill(skill.id).single;

  for (const rule of rules) {
    const result = rule({ problem, pattern, skill });
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}

export function validateProblemBatch(problems: GeneratedProblem[], pattern: PatternDSL, skill: Skill): RuleResult {
  const rules = getRulesForSkill(skill.id).batch;

  for (const rule of rules) {
    const result = rule({ problems, pattern, skill });
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}
