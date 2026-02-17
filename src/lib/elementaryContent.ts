import data from "@/content/mathquest_all_grades_from_split_v1";
import { isSupportedType } from "@/lib/questSupport";

export type AnswerFormat = {
  kind: "int" | "dec" | "frac" | "pair" | "expr";
  precision?: number;
  suffix?: string;
  pair_kind?: "quotient_remainder" | "ratio";
  separator?: string;
  form?: string;
};

export type ExampleItem = {
  prompt: string;
  prompt_tex?: string;
  answer: string;
};

export type TypeDef = {
  type_id: string;
  type_name: string;
  answer_format: AnswerFormat;
  example_items: ExampleItem[];
};

export type CategoryDef = {
  category_id: string;
  category_name: string;
  types: TypeDef[];
};

export type GradeDef = {
  grade_id: string;
  grade_name: string;
  categories: CategoryDef[];
};

const elementaryGradePrefix = /^E[1-6]$/;

const asGrades = () => (data.grades ?? []) as GradeDef[];

export const getElementaryNumberCalculationGrades = (): GradeDef[] => {
  return asGrades()
    .filter((grade) => elementaryGradePrefix.test(grade.grade_id))
    .map((grade) => ({
      ...grade,
      categories: (grade.categories ?? [])
        .map((category) => ({
          ...category,
          types: (category.types ?? []).filter((type) => isSupportedType(type))
        }))
        .filter((category) => category.types.length > 0)
    }))
    .filter((grade) => grade.categories.length > 0);
};

