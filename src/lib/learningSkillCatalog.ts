import skillsData from "packages/skill-system/skills.json";
import type { Skill } from "packages/skill-system";

export type PracticeSkill = {
  id: string;
  code: string;
  title: string;
  grade: string;
  gradeLevel: "1" | "2" | "3";
  patterns: string[];
  requiredXP: number;
  difficultyLabel: string;
  difficultyValue: number;
  problemCount: number;
};

const skills = skillsData as Skill[];

const resolveGradeLevel = (skill: Skill): "1" | "2" | "3" => {
  if (skill.gradeLevel === "1" || skill.gradeLevel === "2" || skill.gradeLevel === "3") {
    return skill.gradeLevel;
  }
  if (skill.grade.startsWith("E1")) return "1";
  if (skill.grade.startsWith("E2")) return "2";
  return "3";
};

const getDisplaySkillTitle = (skill: Skill) =>
  resolveGradeLevel(skill) === "1" ? (skill.titleKana ?? skill.title) : skill.title;

const difficultyLabels: Record<number, string> = {
  1: "Easy",
  2: "Medium",
  3: "Hard",
  4: "Expert"
};

export const practiceSkills: PracticeSkill[] = skills.map((skill, index) => ({
  id: skill.id,
  code: `${skill.grade}-${String(index + 1).padStart(2, "0")}`,
  title: getDisplaySkillTitle(skill),
  grade: skill.grade,
  gradeLevel: resolveGradeLevel(skill),
  patterns: skill.patterns,
  requiredXP: skill.requiredXP ?? 100,
  difficultyLabel: difficultyLabels[skill.difficulty] ?? `Lv ${skill.difficulty}`,
  difficultyValue: skill.difficulty,
  problemCount: 5
}));

export const getPracticeSkill = (skillId: string) => practiceSkills.find((skill) => skill.id === skillId);
