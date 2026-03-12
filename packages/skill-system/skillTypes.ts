export type Skill = {
  id: string;
  title: string;
  grade: string;
  patterns: string[];
  prerequisite?: string[];
  difficulty: number;
};

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
};

export type SkillTreeNode = SkillNode;
