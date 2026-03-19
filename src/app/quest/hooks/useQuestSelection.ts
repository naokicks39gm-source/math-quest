import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getCatalogGrades } from "@/lib/gradeCatalog";
import {
  generateE1LevelProblems,
  generateJ1LevelProblems,
  isE1LevelId,
  isJ1LevelId
} from "@/lib/problem";

const parseDifficulty = (value: string): number | undefined => {
  const next = Number(value);
  if (!Number.isFinite(next)) return undefined;
  if (next < 1) return 1;
  if (next > 5) return 5;
  return Math.floor(next);
};

const resolveQuestLevelInfo = (rawLevelId: string) => {
  if (isE1LevelId(rawLevelId)) return { gradeId: "E1" as const, levelId: rawLevelId };
  if (isJ1LevelId(rawLevelId)) return { gradeId: "J1" as const, levelId: rawLevelId };
  return null;
};

export function useQuestSelection(args: any) {
  const {
    setItemIndex,
    setPracticeResult,
    setResultMark,
    setInput,
    setFractionInput,
    setQuadraticFractionInputs,
    canvasRef,
    EMPTY_FRACTION_EDITOR
  } = args;

  const router = useRouter();
  const params = useSearchParams();
  const devMode = params.get("dev") === "1";
  const skillIdFromQuery = (params.get("skillId") ?? "").trim();
  const isLearningSessionMode = Boolean(skillIdFromQuery);
  const retryFromQuery = (params.get("retry") ?? "").trim();
  const freshFromQuery = (params.get("fresh") ?? "").trim();
  const patternIdFromQuery = (params.get("patternId") ?? "").trim();
  const typeFromQuery = (params.get("type") ?? "").trim();
  const categoryFromQuery = params.get("category");
  const difficultyFromQuery = parseDifficulty((params.get("difficulty") ?? "").trim());
  const rawLevelFromQuery = (params.get("levelId") ?? "").trim();
  const levelInfo = useMemo(() => resolveQuestLevelInfo(rawLevelFromQuery), [rawLevelFromQuery]);
  const levelGradeId = levelInfo?.gradeId ?? "";
  const levelFromQuery = levelInfo?.levelId ?? "";

  const grades = useMemo(() => getCatalogGrades(), []);
  const defaultType = grades[0]?.categories?.[0]?.types?.[0] ?? null;
  const [selectedType, setSelectedType] = useState<any>(defaultType);
  const lastSelectionSyncKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLearningSessionMode) {
      return;
    }

    const applySelection = (nextType: any, key: string) => {
      if (lastSelectionSyncKeyRef.current === key) return;
      lastSelectionSyncKeyRef.current = key;
      setSelectedType(nextType);
      setItemIndex(0);
      setPracticeResult(null);
      setResultMark(null);
      setInput("");
      setFractionInput({ ...EMPTY_FRACTION_EDITOR });
      setQuadraticFractionInputs([{ ...EMPTY_FRACTION_EDITOR }, { ...EMPTY_FRACTION_EDITOR }]);
      canvasRef.current?.clear();
    };

    if (levelInfo?.gradeId === "E1") {
      const seeded = generateE1LevelProblems(levelInfo.levelId, 1)[0];
      if (seeded?.type) {
        applySelection(seeded.type, `level:${levelInfo.levelId}:${seeded.type.type_id}`);
        return;
      }
    }

    if (levelInfo?.gradeId === "J1") {
      const seeded = generateJ1LevelProblems(levelInfo.levelId, 1)[0];
      if (seeded?.type) {
        applySelection(seeded.type, `level:${levelInfo.levelId}:${seeded.type.type_id}`);
        return;
      }
    }

    let found: any = null;
    if (typeFromQuery) {
      for (const grade of grades) {
        for (const category of grade.categories) {
          const hit = category.types.find((type: any) => type.type_id === typeFromQuery);
          if (hit) {
            found = hit;
            break;
          }
        }
        if (found) break;
      }
    }
    if (found) {
      applySelection(found, `type:${found.type_id}`);
      return;
    }

    if (categoryFromQuery) {
      const category = grades.flatMap((grade: any) => grade.categories).find((entry: any) => entry.category_id === categoryFromQuery);
      if (category?.types?.[0]) {
        applySelection(category.types[0], `category:${category.category_id}:${category.types[0].type_id}`);
        return;
      }
    }

    if (!selectedType && defaultType) {
      applySelection(defaultType, `default:${defaultType.type_id}`);
    }
  }, [
    isLearningSessionMode,
    levelInfo,
    typeFromQuery,
    categoryFromQuery,
    grades,
    selectedType,
    defaultType,
    setItemIndex,
    setPracticeResult,
    setResultMark,
    setInput,
    setFractionInput,
    setQuadraticFractionInputs,
    canvasRef,
    EMPTY_FRACTION_EDITOR
  ]);

  return {
    router,
    params,
    devMode,
    skillIdFromQuery,
    retryFromQuery,
    freshFromQuery,
    patternIdFromQuery,
    typeFromQuery,
    categoryFromQuery,
    difficultyFromQuery,
    rawLevelFromQuery,
    levelInfo,
    levelGradeId,
    levelFromQuery,
    grades,
    defaultType,
    selectedType,
    setSelectedType,
    isLearningSessionMode
  };
}
