export type Skill = {
  id: string;
  title: string;
  grade: string;
  patterns: string[];
  prerequisite?: string[];
  difficulty: number;
};

export type SkillTreeNode = {
  id: string;
  title: string;
  difficulty: number;
  prerequisite: string[];
  unlocked: boolean;
  mastered: boolean;
};
