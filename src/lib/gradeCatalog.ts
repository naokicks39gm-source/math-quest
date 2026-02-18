import data from "@/content/mathquest_all_grades_from_split_v1";
import { GradeDef, TypeDef } from "@/lib/elementaryContent";
import { applyGradeProfileToNaTypes } from "@/lib/gradeProfiles";

const GEOMETRY_CATEGORY_ID = "GE";
const NUMBER_AND_CALCULATION_CATEGORY_ID = "NA";
const EXCLUDED_TYPE_IDS = new Set([
  "E1.ME.TIME.TIME_MIN",
  "E1.RE.CMP.CMP_SIGN"
]);

const getGradeIdFromTypeId = (typeId: string) => {
  const [gradeId] = typeId.split(".");
  return gradeId || "UNK";
};

const getConditionSuffix = (typeId: string): "NO" | "YES" | "ANY" | null => {
  const match = typeId.match(/_(NO|YES|ANY)$/);
  return match ? (match[1] as "NO" | "YES" | "ANY") : null;
};

const getConditionLabel = (typeId: string) => {
  const suffix = getConditionSuffix(typeId);
  if (!suffix) return null;
  if (typeId.includes(".ADD.")) {
    if (suffix === "NO") return "繰り上がりなし";
    if (suffix === "YES") return "繰り上がりあり";
    return "繰り上がり";
  }
  if (typeId.includes(".MUL.")) {
    if (suffix === "NO") return "繰り上がりなし";
    if (suffix === "YES") return "繰り上がりあり";
    return "繰り上がり";
  }
  if (typeId.includes(".SUB.")) {
    if (suffix === "NO") return "繰り下がりなし";
    if (suffix === "YES") return "繰り下がりあり";
    return "繰り下がり";
  }
  return null;
};

const getAnswerDigitsLabel = (typeId: string) => {
  if (!typeId.includes("ADD_1D_1D_")) return null;
  const suffix = getConditionSuffix(typeId);
  if (suffix === "NO") return "答え1桁";
  if (suffix === "YES") return "答え2桁";
  if (suffix === "ANY") return "答え1〜2桁";
  return null;
};

const buildDisplayName = (type: TypeDef) => {
  const labels = [getConditionLabel(type.type_id)];
  const answerDigits = getAnswerDigitsLabel(type.type_id);
  if (answerDigits) labels.push(answerDigits);
  const parts = labels.filter((value): value is string => Boolean(value));
  if (parts.length === 0) {
    return `${type.type_name}（${type.type_id}）`;
  }
  return `${type.type_name}（${parts.join("・")}）`;
};

const addDisambiguatedNames = (types: TypeDef[]) => {
  const counts = new Map<string, number>();
  for (const type of types) {
    counts.set(type.type_name, (counts.get(type.type_name) ?? 0) + 1);
  }
  return types.map((type) => {
    if ((counts.get(type.type_name) ?? 0) <= 1) {
      return type;
    }
    return {
      ...type,
      display_name: buildDisplayName(type)
    };
  });
};

type GenerationParams = {
  pattern_id?: string;
  a_digits?: number;
  b_digits?: number;
  carry?: boolean | null;
  borrow?: boolean | null;
  decimal_places?: number;
  allow_remainder?: boolean;
  quotient_digits?: number;
  operation?: string;
};

const getGenerationParams = (type: TypeDef): GenerationParams =>
  ((type as TypeDef & { generation_params?: GenerationParams }).generation_params ?? {});

const buildCrossGradeDedupeKey = (type: TypeDef) => {
  const params = getGenerationParams(type);
  if (params.pattern_id) {
    return JSON.stringify({
      answer_kind: type.answer_format.kind,
      pattern_id: params.pattern_id
    });
  }
  return JSON.stringify({
    answer_kind: type.answer_format.kind,
    a_digits: params.a_digits,
    b_digits: params.b_digits,
    carry: params.carry,
    borrow: params.borrow,
    decimal_places: params.decimal_places,
    allow_remainder: params.allow_remainder,
    quotient_digits: params.quotient_digits,
    operation: params.operation
  });
};

export const getCatalogGrades = (): GradeDef[] => {
  const shaped = ((data as { grades?: GradeDef[] }).grades ?? [])
    .map((grade) => {
      const categories = (grade.categories ?? [])
        .filter((category) => category.category_id !== GEOMETRY_CATEGORY_ID)
        .map((category) => {
          const nonEmptyTypes = (category.types ?? []).filter(
            (type) =>
              (type.example_items?.length ?? 0) > 0 &&
              !EXCLUDED_TYPE_IDS.has(type.type_id)
          );
          const profiledTypes =
            category.category_id === NUMBER_AND_CALCULATION_CATEGORY_ID
              ? applyGradeProfileToNaTypes(grade.grade_id, nonEmptyTypes)
              : nonEmptyTypes;
          return {
            ...category,
            types: addDisambiguatedNames(profiledTypes)
          };
        })
        .filter((category) => category.types.length > 0);
      return {
        ...grade,
        categories
      };
    })
    .filter((grade) => grade.categories.length > 0);

  const seenNaKeys = new Set<string>();
  const deduped = shaped.map((grade) => ({
    ...grade,
    categories: grade.categories
      .map((category) => {
        if (category.category_id !== NUMBER_AND_CALCULATION_CATEGORY_ID) {
          return category;
        }
        const types = category.types.filter((type) => {
          const key = buildCrossGradeDedupeKey(type);
          if (seenNaKeys.has(key)) return false;
          seenNaKeys.add(key);
          return true;
        });
        return { ...category, types };
      })
      .filter((category) => category.types.length > 0)
  }));

  return deduped
    .map((grade) => {
      const gradeLevelCounters = new Map<string, number>();
      const categories = grade.categories.map((category) => ({
        ...category,
        types: category.types.map((type) => {
          const gradeIdFromType = getGradeIdFromTypeId(type.type_id) || grade.grade_id;
          const next = (gradeLevelCounters.get(gradeIdFromType) ?? 0) + 1;
          gradeLevelCounters.set(gradeIdFromType, next);
          const level = `Lv:${gradeIdFromType}-${next}`;
          const baseName = type.display_name ?? type.type_name;
          return {
            ...type,
            display_name: `${level} ${baseName}`
          };
        })
      }));
      return { ...grade, categories };
    })
    .filter((grade) => grade.categories.length > 0);
};
