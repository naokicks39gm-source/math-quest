import skillsData from "packages/skill-system/skills.json";
import type { Skill } from "packages/skill-system";

export type PracticeSkill = {
  id: string;
  code: string;
  title: string;
  grade: string;
  difficultyLabel: string;
  difficultyValue: number;
  problemCount: number;
};

const skills = skillsData as Skill[];

const difficultyLabels: Record<number, string> = {
  1: "Easy",
  2: "Medium",
  3: "Hard",
  4: "Expert"
};

export const practiceSkills: PracticeSkill[] = skills.map((skill, index) => ({
  id: skill.id,
  code: `${skill.grade}-${String(index + 1).padStart(2, "0")}`,
  title: skill.title,
  grade: skill.grade,
  difficultyLabel: difficultyLabels[skill.difficulty] ?? `Lv ${skill.difficulty}`,
  difficultyValue: skill.difficulty,
  problemCount: 5
}));

export const getPracticeSkill = (skillId: string) => practiceSkills.find((skill) => skill.id === skillId);
