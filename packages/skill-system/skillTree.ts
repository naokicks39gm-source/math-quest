import skillsData from "./skills.json";
import type { Skill, SkillTreeNode } from "./skillTypes";

const skills = skillsData as Skill[];

type SkillTreeState = {
  unlockedSkills?: string[];
  skillProgress?: Record<string, { mastery?: number; mastered?: boolean } | undefined>;
};

export function getSkill(id: string): Skill | undefined {
  return skills.find((skill) => skill.id === id);
}

export function getPrerequisites(skillId: string): string[] {
  return getSkill(skillId)?.prerequisite ?? [];
}

export function getNextSkills(skillId: string): Skill[] {
  return skills.filter((skill) => skill.prerequisite?.includes(skillId));
}

export function getRootSkills(): Skill[] {
  return skills.filter((skill) => !skill.prerequisite || skill.prerequisite.length === 0);
}

export function getSkillTree(state?: SkillTreeState): SkillTreeNode[] {
  const unlockedSkills = new Set(state?.unlockedSkills ?? []);
  const skillProgress = state?.skillProgress ?? {};

  return skills.map((skill) => {
    const progress = skillProgress[skill.id];
    const mastery = progress?.mastery ?? 0;

    return {
      id: skill.id,
      title: skill.title,
      difficulty: skill.difficulty,
      prerequisite: skill.prerequisite ?? [],
      unlocked: unlockedSkills.has(skill.id),
      mastered: progress?.mastered === true || mastery >= 0.8
    };
  });
}
