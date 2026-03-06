import skillsData from "./skills.json";
import type { Skill } from "./skillTypes";

const skills = skillsData as Skill[];

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
