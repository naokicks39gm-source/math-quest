import { useCallback, useMemo } from "react";
import { getLearningPattern } from "@/lib/learningPatternCatalog";
import { entryEquivalentKey, entryPromptKey } from "@/lib/questItemFactory";
import {
  buildStocksForTypes,
  pickUniqueQuizFromStock
} from "@/lib/questStockFactory";
import {
  generateE1LevelProblems,
  generateJ1LevelProblems
} from "@/lib/problem";
import { generateProblems } from "packages/problem-engine/dsl-engine";

const QUESTION_POOL_SIZE = 50;

const dedupeQuestSet = (set: any[]) => {
  const uniq: any[] = [];
  const promptSeen = new Set<string>();
  const equivalentSeen = new Set<string>();
  for (const entry of set) {
    const promptKey = entryPromptKey(entry);
    const equivalentKey = entryEquivalentKey(entry);
    if (promptSeen.has(promptKey) || equivalentSeen.has(equivalentKey)) continue;
    promptSeen.add(promptKey);
    equivalentSeen.add(equivalentKey);
    uniq.push(entry);
  }
  return uniq;
};

const hasDuplicateInSet = (set: any[]) => {
  const promptSeen = new Set<string>();
  const equivalentSeen = new Set<string>();
  for (const entry of set) {
    const promptKey = entryPromptKey(entry);
    const equivalentKey = entryEquivalentKey(entry);
    if (promptSeen.has(promptKey) || equivalentSeen.has(equivalentKey)) return true;
    promptSeen.add(promptKey);
    equivalentSeen.add(equivalentKey);
  }
  return false;
};

export const describeStockReason = (reason?: any) => {
  if (!reason) return "出題候補不足";
  if (reason === "NO_SOURCE") return "元問題なし";
  if (reason === "NO_PATTERN") return "生成パターンなし";
  if (reason === "INSUFFICIENT_GENERATABLE") return "生成可能数不足";
  return reason;
};

export function useQuestStock(args: any) {
  const {
    grades,
    categoryFromQuery,
    levelFromQuery,
    typeFromQuery,
    selectedType,
    typeStocks,
    getTargetQuestionCount,
    levelInfo,
    patternIdFromQuery,
    difficultyFromQuery
  } = args;

  const stockViewBase = useMemo(() => {
    const categoryContext = (() => {
      if (!categoryFromQuery) return null;
      for (const g of grades) {
        for (const c of g.categories) {
          if (c.category_id === categoryFromQuery) {
            return { grade: g, category: c };
          }
        }
      }
      return null;
    })();
    const hasLevelQuery = Boolean(levelFromQuery);
    const hasPatternQuery = Boolean(patternIdFromQuery);
    const hasTypeQuery = Boolean(typeFromQuery);
    const hasCategoryQuery = Boolean(categoryFromQuery);
    const selectedPath = (() => {
      if (hasLevelQuery) {
        if (levelInfo?.gradeId === "E1") {
          const option = args.E1_LEVEL_OPTIONS.find((entry: any) => entry.levelId === levelInfo.levelId);
          return {
            gradeName: "小1",
            categoryName: "数と計算",
            typeName: option ? `Lv:${option.levelId} ${option.title}` : `Lv:${levelInfo.levelId}`
          };
        }
        const option = args.J1_LEVEL_OPTIONS.find((entry: any) => entry.levelId === levelInfo?.levelId);
        return {
          gradeName: "中1",
          categoryName: option?.categoryName ?? "中1カリキュラム",
          typeName: option ? `Lv:${option.levelId} ${option.title}` : `Lv:${levelFromQuery}`
        };
      }
      if (!hasTypeQuery && !hasCategoryQuery) {
        return {
          gradeName: "全学年",
          categoryName: "全カテゴリ",
          typeName: "総合クエスト"
        };
      }
      if (selectedType) {
        for (const g of grades) {
          for (const c of g.categories) {
            const hit = c.types.find((t: any) => t.type_id === selectedType.type_id);
            if (hit) {
              return {
                gradeName: g.grade_name,
                categoryName: c.category_name,
                typeName: hit.display_name ?? hit.type_name
              };
            }
          }
        }
      }
      if (categoryContext) {
        const fallbackType = categoryContext.category.types[0];
        return {
          gradeName: categoryContext.grade.grade_name,
          categoryName: categoryContext.category.category_name,
          typeName: fallbackType?.display_name ?? fallbackType?.type_name ?? "クエスト"
        };
      }
      return null;
    })();
    const allTypePaths = grades.flatMap((g: any) =>
      g.categories.flatMap((c: any) =>
        c.types.map((t: any) => ({
          typeId: t.type_id,
          categoryId: c.category_id
        }))
      )
    );
    const typeCatalog = grades.flatMap((grade: any) =>
      grade.categories.flatMap((category: any) =>
        category.types.map((type: any) => ({
          type,
          typeId: type.type_id,
          typeName: type.display_name ?? type.type_name ?? type.type_id,
          categoryId: category.category_id,
          categoryName: category.category_name
        }))
      )
    );
    const targetStockTypes = (() => {
      if (hasLevelQuery) return [];
      if (hasTypeQuery) {
        const byQuery = typeCatalog.find((entry: any) => entry.typeId === typeFromQuery);
        if (byQuery) return [byQuery];
        const bySelected =
          selectedType ? typeCatalog.find((entry: any) => entry.typeId === selectedType.type_id) : null;
        return bySelected ? [bySelected] : typeCatalog;
      }
      if (hasCategoryQuery && categoryContext) {
        return categoryContext.category.types.map((type: any) => ({
          type,
          typeId: type.type_id,
          typeName: type.display_name ?? type.type_name ?? type.type_id,
          categoryId: categoryContext.category.category_id,
          categoryName: categoryContext.category.category_name
        }));
      }
      return typeCatalog;
    })();
    const activeTypeId = (() => {
      if (hasTypeQuery && typeFromQuery) {
        const existsInTargets = targetStockTypes.some((entry: any) => entry.typeId === typeFromQuery);
        if (existsInTargets) return typeFromQuery;
      }
      if (selectedType?.type_id) {
        const existsInTargets = targetStockTypes.some((entry: any) => entry.typeId === selectedType.type_id);
        if (existsInTargets) return selectedType.type_id;
      }
      return targetStockTypes[0]?.typeId ?? "";
    })();
    const targetQuestionCount = getTargetQuestionCount(activeTypeId, levelFromQuery || undefined);
    const quizSize = Math.min(targetQuestionCount, QUESTION_POOL_SIZE);
    return {
      categoryContext,
      hasLevelQuery,
      hasPatternQuery,
      hasTypeQuery,
      hasCategoryQuery,
      selectedPath,
      allTypePaths,
      typeCatalog,
      targetStockTypes,
      activeTypeId,
      targetQuestionCount,
      quizSize
    };
  }, [
    grades,
    categoryFromQuery,
    levelFromQuery,
    typeFromQuery,
    selectedType,
    getTargetQuestionCount,
    levelInfo,
    patternIdFromQuery,
    args.E1_LEVEL_OPTIONS,
    args.J1_LEVEL_OPTIONS
  ]);

  const activeStockInfo = useMemo(
    () => (stockViewBase.activeTypeId ? typeStocks.get(stockViewBase.activeTypeId) ?? null : null),
    [stockViewBase.activeTypeId, typeStocks]
  );

  const stockView = useMemo(
    () => ({
      ...stockViewBase,
      activeStockInfo
    }),
    [activeStockInfo, stockViewBase]
  );

  const buildStockState = useCallback(() => {
    if (stockViewBase.hasLevelQuery) {
      return { stocks: new Map(), shortages: [], ready: true };
    }
    const stocks = buildStocksForTypes(
      stockViewBase.targetStockTypes.map((entry: any) => entry.type),
      QUESTION_POOL_SIZE
    );
    const shortages: any[] = [];
    for (const entry of stockViewBase.targetStockTypes) {
      const stock = stocks.get(entry.typeId);
      if (!stock) continue;
      if (stock.count < getTargetQuestionCount(entry.typeId)) {
        shortages.push({
          typeId: entry.typeId,
          typeName: entry.typeName,
          count: stock.count,
          reason: stock.reason,
          reasonDetail: stock.reasonDetail
        });
      }
    }
    return { stocks, shortages, ready: true };
  }, [stockViewBase, getTargetQuestionCount]);

  const buildShortages = useCallback(() => buildStockState().shortages, [buildStockState]);

  const pickQuestSet = useCallback(() => {
    if (stockView.hasPatternQuery && patternIdFromQuery) {
      const patternEntry = getLearningPattern(patternIdFromQuery);
      if (!patternEntry) {
        return { kind: "blocked", message: "この復習パターンは現在利用できません。" };
      }
      const generated = dedupeQuestSet(
        generateProblems(patternEntry.pattern, stockView.quizSize).map(
          (problem): any => ({
            item: {
              prompt: problem.question,
              answer: problem.answer
            },
            type: {
              type_id: `REVIEW.${patternEntry.skillId}.${patternEntry.patternId}`,
              display_name: patternEntry.title,
              generation_params: {
                pattern_id: patternEntry.patternId
              },
              answer_format: { kind: "int" },
              example_items: []
            }
          })
        )
      );
      return generated.length < 1
        ? { kind: "blocked", message: "この復習パターンは一時的に出題候補不足です。" }
        : { kind: "quiz", entries: generated, pickMeta: null, shortageMessage: null };
    }
    if (levelInfo?.gradeId === "E1") {
      const generated = dedupeQuestSet(generateE1LevelProblems(levelInfo.levelId, stockView.quizSize) as any[]);
      return generated.length < 1
        ? { kind: "blocked", message: "このレベルは一時的に出題候補不足です。別レベルを選ぶか、時間をおいて再試行してください。" }
        : { kind: "quiz", entries: generated, pickMeta: null, shortageMessage: null };
    }
    if (levelInfo?.gradeId === "J1") {
      const generated = dedupeQuestSet(generateJ1LevelProblems(levelInfo.levelId, stockView.quizSize) as any[]);
      return generated.length < 1
        ? { kind: "blocked", message: "このレベルは一時的に出題候補不足です。別レベルを選ぶか、時間をおいて再試行してください。" }
        : { kind: "quiz", entries: generated, pickMeta: null, shortageMessage: null };
    }
    const activeStock = stockView.activeTypeId ? typeStocks.get(stockView.activeTypeId) : undefined;
    const firstPick = activeStock
      ? pickUniqueQuizFromStock(activeStock.entries, stockView.quizSize, difficultyFromQuery)
      : {
          entries: [],
          meta: {
            requested: stockView.quizSize,
            availableBeforeDedupe: 0,
            availableAfterDedupe: 0,
            picked: 0,
            dedupedOutCount: 0,
            reason: "EMPTY" as const
          }
        };
    let nextSet = dedupeQuestSet(firstPick.entries);
    let pickMeta: any = firstPick.meta;
    if (hasDuplicateInSet(nextSet) && activeStock) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[quest-page] duplicate guard retry", { typeId: stockView.activeTypeId, firstMeta: firstPick.meta });
      }
      const secondPick = pickUniqueQuizFromStock(activeStock.entries, stockView.quizSize, difficultyFromQuery);
      nextSet = dedupeQuestSet(secondPick.entries);
      pickMeta = hasDuplicateInSet(nextSet) ? { ...secondPick.meta, reason: "DUP_GUARD_FAILED" } : secondPick.meta;
    }
    if (process.env.NODE_ENV !== "production") {
      console.debug("[quest-page] stock pick", {
        typeId: stockView.activeTypeId,
        availableBefore: pickMeta.availableBeforeDedupe,
        availableAfterDedupe: pickMeta.availableAfterDedupe,
        picked: pickMeta.picked,
        dedupedOutCount: pickMeta.dedupedOutCount,
        reason: pickMeta.reason
      });
    }
    if (pickMeta.availableAfterDedupe < 1 || pickMeta.reason === "DUP_GUARD_FAILED") {
      const reasonText = describeStockReason(activeStock?.reason);
      const available = pickMeta.availableAfterDedupe;
      const suffix = pickMeta.reason === "DUP_GUARD_FAILED" ? " / 抽出ガード失敗" : "";
      return {
        kind: "blocked",
        message: `このタイプは一時的に出題候補不足です（${reasonText} / 候補 ${available}${suffix}）。別タイプを選ぶか、少し時間をおいて再試行してください。`,
        pickMeta
      };
    }
    return {
      kind: "quiz",
      entries: nextSet,
      pickMeta,
      shortageMessage: pickMeta.reason === "SHORTAGE" ? `候補不足のため ${pickMeta.picked} 題で開始します。` : null
    };
  }, [stockView, patternIdFromQuery, levelInfo, typeStocks, difficultyFromQuery]);

  return useMemo(
    () => ({
      stockView,
      buildStockState,
      buildShortages,
      pickQuestSet
    }),
    [stockView, buildStockState, buildShortages, pickQuestSet]
  );
}
