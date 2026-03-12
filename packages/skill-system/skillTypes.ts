export type Skill = {
  id: string;
  title: string;
  titleKana?: string;
  grade: string;
  gradeLevel?: "1" | "2" | "3";
  patterns: string[];
  prerequisite?: string[];
  difficulty: number;
  requiredXP?: number;
};

export type SkillStatus = "LOCKED" | "AVAILABLE" | "LEARNING" | "MASTERED";

export type SkillNode = {
  id: string;
  title: string;
  gradeLevel?: "1" | "2" | "3";
  difficulty: number;
  requiredXP: number;
  prerequisite: string[];
  unlocked: boolean;
  mastered: boolean;
  mastery: number;
  xp: number;
  nextSkills: string[];
  status: SkillStatus;
};

export type SkillTreeNode = SkillNode;
