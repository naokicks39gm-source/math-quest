export type Skill = {
  id: string;
  title: string;
  grade: string;
  patterns: string[];
  prerequisite?: string[];
  difficulty: number;
};
