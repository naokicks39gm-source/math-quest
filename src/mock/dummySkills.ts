export type DummySkill = {
  id: string;
  code: string;
  title: string;
  difficulty: string;
  problemCount: number;
  typeIds: string[];
};

export const dummySkills: DummySkill[] = [
  {
    id: "E1_ADD",
    code: "E1-01",
    title: "10までのたし算",
    difficulty: "Easy",
    problemCount: 5,
    typeIds: ["E1.NA.ADD.ADD_1D_1D_NO", "E1.NA.ADD.ADD_1D_1D_ANY"]
  },
  {
    id: "E1_CARRY",
    code: "E1-02",
    title: "くり上がり",
    difficulty: "Medium",
    problemCount: 5,
    typeIds: ["E1.NA.ADD.ADD_1D_1D_YES", "E1.NA.ADD.ADD_1D_1D_ANY"]
  },
  {
    id: "E1_SUB",
    code: "E1-03",
    title: "ひき算",
    difficulty: "Easy",
    problemCount: 5,
    typeIds: ["E1.NA.SUB.SUB_1D_1D_ANY", "E1.NA.SUB.SUB_2D_1D_NO"]
  },
  {
    id: "E1_CLOCK",
    code: "E1-04",
    title: "時計",
    difficulty: "Medium",
    problemCount: 5,
    typeIds: ["E1.ME.TIME.TIME_MIN"]
  }
];
