import skillsData from "packages/skill-system/skills.json";

import type { SkillProgress } from "./skillProgressTypes";
import { INITIAL_UNLOCKED_SKILLS, type LearningState } from "./studentStore";

type SkillDefinition = {
  id: string;
  prerequisite?: string[];
};

export const PROGRESSION_UNLOCK_THRESHOLD = 0.8;

const skills = skillsData as SkillDefinition[];

const isSkillCompleteForProgression = (progress: SkillProgress | undefined) =>
  (progress?.mastery ?? 0) >= PROGRESSION_UNLOCK_THRESHOLD;

export const getUnlockedSkills = (state: LearningState): string[] =>
  state.unlockedSkills.length > 0 ? state.unlockedSkills : [...INITIAL_UNLOCKED_SKILLS];

export const isSkillUnlocked = (state: LearningState, skillId: string) => getUnlockedSkills(state).includes(skillId);

export const getUnlockableNextSkills = (skillId: string): string[] =>
  skills.filter((skill) => (skill.prerequisite ?? []).includes(skillId)).map((skill) => skill.id);

export const prerequisitesSatisfiedForProgression = (state: LearningState, skillId: string) => {
  const skill = skills.find((entry) => entry.id === skillId);
  if (!skill) {
    return false;
  }

  return (skill.prerequisite ?? []).every((prerequisite) =>
    isSkillCompleteForProgression(state.skillProgress[prerequisite])
  );
};

export const isSkillComplete = (state: LearningState, skillId: string) =>
  isSkillCompleteForProgression(state.skillProgress[skillId]);

export const unlockNextSkills = (state: LearningState, skillId: string): string[] => {
  const unlocked = new Set(getUnlockedSkills(state));

  for (const nextSkillId of getUnlockableNextSkills(skillId)) {
    unlocked.add(nextSkillId);
  }

  return [...unlocked];
};

