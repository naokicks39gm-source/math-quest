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
  display_name?: string;
  concept_tags?: string[];
  generation_params?: {
    pattern_id?: string;
    [key: string]: unknown;
  };
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

type DataShape = {
  grades: GradeDef[];
};

const ELEMENTARY_GRADE_RE = /^E[1-6]$/;
const NUMBER_CALCULATION_CATEGORY = "NA";

export const getElementaryNumberCalculationGrades = (): GradeDef[] => {
  const grades = ((data as DataShape).grades ?? [])
    .filter((grade) => ELEMENTARY_GRADE_RE.test(grade.grade_id))
    .map((grade) => {
      const categories = grade.categories
        .filter((category) => category.category_id === NUMBER_CALCULATION_CATEGORY)
        .map((category) => ({
          ...category,
          types: category.types
            .filter((type) => type.example_items.length > 0)
            .filter((type) => isSupportedType(type))
        }))
        .filter((category) => category.types.length > 0);
      return {
        ...grade,
        categories
      };
    })
    .filter((grade) => grade.categories.length > 0);
  return grades;
};

export const getElementaryTypeCounts = () => {
  const grades = getElementaryNumberCalculationGrades();
  return grades.map((grade) => ({
    gradeId: grade.grade_id,
    gradeName: grade.grade_name,
    typeCount: grade.categories.reduce((sum, category) => sum + category.types.length, 0)
  }));
};
