import addBasicPatterns from "packages/problem-engine/patterns/E1/add-basic.json";
import addCarryPatterns from "packages/problem-engine/patterns/E1/add-carry.json";
import type { PatternDSL } from "packages/problem-engine";
import { getPatterns as getSkillPatternBundles } from "packages/skill-system";

import type { LearningState } from "./studentStore";

const patternCatalog: Record<string, PatternDSL[]> = {
  E1_ADD_BASIC: addBasicPatterns as unknown as PatternDSL[],
  E1_ADD_CARRY: addCarryPatterns as unknown as PatternDSL[]
};

export type WeakPattern = {
  skillId: string;
  patternKey: string;
  mastery: number;
};

export function resolvePatternBundles(patternBundleIds: string[]): PatternDSL[] {
  return patternBundleIds.flatMap((bundleId) => {
    const patterns = patternCatalog[bundleId];
    if (!patterns) {
      throw new Error(`Pattern not found for skill pattern: ${bundleId}`);
    }
    return patterns;
  });
}

export function resolveSkillPatterns(skillId: string): PatternDSL[] {
  return resolvePatternBundles(getSkillPatternBundles(skillId));
}

export function getWeakPatterns(state: LearningState, skillId: string): WeakPattern[] {
  const { patternProgress } = state;
  const patterns = resolveSkillPatterns(skillId);

  return patterns
    .map((pattern) => {
      const progress = patternProgress[pattern.key];
      return {
        skillId,
        patternKey: pattern.key,
        mastery: progress?.mastery,
        attempts: progress?.attempts ?? 0
      };
    })
    .filter((pattern) => pattern.attempts >= 2 && (pattern.mastery ?? 0) < 0.7)
    .map(({ skillId: weakSkillId, patternKey, mastery }) => ({
      skillId: weakSkillId,
      patternKey,
      mastery: mastery ?? 0
    }));
}
