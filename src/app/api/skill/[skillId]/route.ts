import { NextResponse } from "next/server";
import mergedCatalog from "@/content/mathquest_all_grades_from_split_v1";
import { getCatalogGrades } from "@/lib/gradeCatalog";
import { buildTypeStock, pickUniqueQuizFromStock } from "@/lib/questStockFactory";
import type { GradeDef, TypeDef } from "@/lib/elementaryContent";
import { dummySkills } from "@/mock/dummySkills";

const STOCK_TARGET = 200;
const QUIZ_SIZE = 5;
const TARGET_DIFFICULTY = 3;

type SkillRouteContext = {
  params: Promise<unknown>;
};

const flattenTypes = (grades: GradeDef[]) =>
  grades.flatMap((grade) => grade.categories.flatMap((category) => category.types));

const buildTypeIndex = () => {
  const typeMap = new Map<string, TypeDef>();
  for (const type of flattenTypes(getCatalogGrades())) {
    typeMap.set(type.type_id, type);
  }

  const rawGrades = ((mergedCatalog as { grades?: GradeDef[] }).grades ?? []) as GradeDef[];
  for (const type of flattenTypes(rawGrades)) {
    if (!typeMap.has(type.type_id)) {
      typeMap.set(type.type_id, type);
    }
  }

  return typeMap;
};

const typeIndex = buildTypeIndex();

export async function GET(_request: Request, { params }: SkillRouteContext) {
  try {
    const resolvedParams = (await params) as { skillId?: string };
    const skillId = resolvedParams.skillId?.trim() ?? "";

    if (!skillId) {
      return NextResponse.json({ error: "skill_id_required" }, { status: 400 });
    }

    const skill = dummySkills.find((item) => item.id === skillId);

    if (!skill) {
      return NextResponse.json({ error: "skill_not_found" }, { status: 404 });
    }

    const types = skill.typeIds
      .map((typeId) => typeIndex.get(typeId))
      .filter((type): type is TypeDef => Boolean(type));

    if (types.length === 0) {
      return NextResponse.json({ error: "skill_types_not_found" }, { status: 422 });
    }

    const stock = types.flatMap((type) => buildTypeStock(type, STOCK_TARGET).entries);
    const picked = pickUniqueQuizFromStock(stock, QUIZ_SIZE, TARGET_DIFFICULTY).entries;

    if (picked.length !== QUIZ_SIZE) {
      return NextResponse.json(
        { error: "insufficient_generated_problems", requested: QUIZ_SIZE, generated: picked.length },
        { status: 422 }
      );
    }

    return NextResponse.json({
      skillId: skill.id,
      skillTitle: skill.title,
      problems: picked.map((entry, index) => ({
        id: `${skill.id}-${index}-${entry.type.type_id}`,
        question: entry.item.prompt_tex ?? entry.item.prompt,
        answer: entry.item.answer,
        typeId: entry.type.type_id,
        patternId: entry.type.generation_params?.pattern_id ?? null,
        difficulty: typeof entry.item.difficulty === "number" ? entry.item.difficulty : TARGET_DIFFICULTY
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}
