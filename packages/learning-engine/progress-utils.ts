import { PROGRESSION_UNLOCK_THRESHOLD, isSkillUnlocked } from "./skill-unlock";
import type { LearningState } from "./studentStore";

export type SkillProgressSnapshot = {
  mastery: number;
  xp: number;
  unlocked: boolean;
  mastered: boolean;
};

export function getSkillProgress(state: LearningState, skillId: string): SkillProgressSnapshot {
  const mastery = state.skillMastery[skillId] ?? state.skillProgress[skillId]?.mastery ?? 0;

  return {
    mastery,
    xp: state.skillXP[skillId] ?? 0,
    unlocked: isSkillUnlocked(state, skillId),
    mastered: state.skillProgress[skillId]?.mastered === true || mastery >= PROGRESSION_UNLOCK_THRESHOLD
  };
}
