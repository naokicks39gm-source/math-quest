export type SkillPracticeProblem = {
  id: string;
  question: string;
  answer: string;
  difficulty?: number;
};

export type SkillPracticeResponse = {
  skillId: string;
  problems: SkillPracticeProblem[];
};
