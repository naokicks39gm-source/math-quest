import skillsData from "packages/skill-system/skills.json";

import type { LearningState } from "./studentStore";
import { getUnlockedSkills, isSkillComplete, isSkillUnlocked, prerequisitesSatisfiedForProgression } from "./skill-unlock";

type SkillDefinition = {
  id: string;
};

const skills = skillsData as SkillDefinition[];

export const getProgressionCandidates = (state: LearningState): string[] => {
  const unlocked = new Set(getUnlockedSkills(state));

  return skills
    .map((skill) => skill.id)
    .filter((skillId) => unlocked.has(skillId))
    .filter((skillId) => isSkillUnlocked(state, skillId))
    .filter((skillId) => prerequisitesSatisfiedForProgression(state, skillId))
    .filter((skillId) => !isSkillComplete(state, skillId));
};

export const getNextRecommendedSkillId = (state: LearningState): string | undefined => getProgressionCandidates(state)[0];

