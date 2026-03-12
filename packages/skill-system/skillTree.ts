import skillsData from "./skills.json";
import type { Skill, SkillNode, SkillStatus } from "./skillTypes";

const skills = skillsData as Skill[];

type SkillTreeState = {
  unlockedSkills?: string[];
  skillProgress?: Record<string, { mastery?: number; mastered?: boolean } | undefined>;
  skillMastery?: Record<string, number | undefined>;
  skillXP?: Record<string, number | undefined>;
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

const resolveSkillStatus = (unlocked: boolean, mastery: number, mastered: boolean): SkillStatus => {
  if (mastered || mastery >= 0.8) return "MASTERED";
  if (!unlocked) return "LOCKED";
  if (mastery > 0) return "LEARNING";
  return "AVAILABLE";
};

export function getSkillTree(state?: SkillTreeState): SkillNode[] {
  const unlockedSkills = new Set(state?.unlockedSkills ?? []);
  const skillProgress = state?.skillProgress ?? {};
  const skillMastery = state?.skillMastery ?? {};
  const skillXP = state?.skillXP ?? {};

  return skills.map((skill) => {
    const progress = skillProgress[skill.id];
    const mastery = skillMastery[skill.id] ?? progress?.mastery ?? 0;
    const unlocked = unlockedSkills.has(skill.id);
    const mastered = progress?.mastered === true || mastery >= 0.8;

    return {
      id: skill.id,
      title: skill.title,
      difficulty: skill.difficulty,
      prerequisite: skill.prerequisite ?? [],
      unlocked,
      mastered,
      mastery,
      xp: skillXP[skill.id] ?? 0,
      nextSkills: getNextSkills(skill.id).map((nextSkill) => nextSkill.id),
      status: resolveSkillStatus(unlocked, mastery, mastered)
    };
  });
}
