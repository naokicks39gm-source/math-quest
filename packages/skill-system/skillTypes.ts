export type Skill = {
  id: string;
  title: string;
  grade: string;
  patterns: string[];
  prerequisite?: string[];
  difficulty: number;
};

export type SkillStatus = "LOCKED" | "AVAILABLE" | "LEARNING" | "MASTERED";

export type SkillNode = {
  id: string;
  title: string;
  difficulty: number;
  prerequisite: string[];
  unlocked: boolean;
  mastered: boolean;
  mastery: number;
  xp: number;
  nextSkills: string[];
  status: SkillStatus;
};

export type SkillTreeNode = SkillNode;
