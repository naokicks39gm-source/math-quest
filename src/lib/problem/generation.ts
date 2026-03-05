import type { TypeDef } from "@/lib/elementaryContent";
import { buildTypeStock, pickUniqueQuizFromStock } from "@/lib/questStockFactory";
import { buildUniqueQuestSet, type QuestEntry } from "@/lib/questItemFactory";
export {
  E1_LEVEL_OPTIONS,
  generateE1LevelProblems,
  isE1LevelId,
  type E1LevelId,
  type E1LevelOption
} from "./e1LevelAdapter";

export type ProblemEntry = QuestEntry;

export const generateTypeStock = (type: TypeDef, targetCount = 50) =>
  buildTypeStock(type, targetCount);

export const generateQuizSet = (stock: QuestEntry[], quizSize = 5) =>
  pickUniqueQuizFromStock(stock, quizSize);

export const buildProblemSet = (source: QuestEntry[], poolSize = 50, quizSize = 5) =>
  buildUniqueQuestSet({ source, poolSize, quizSize });
