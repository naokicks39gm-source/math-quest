import { useQuestStockBuilder } from "./useQuestStockBuilder";
import { useQuestQuizGenerator } from "./useQuestQuizGenerator";
import { useQuestUiInitializer } from "./useQuestUiInitializer";

export function useQuestStockEffects(args: any) {
  useQuestStockBuilder(args);
  useQuestQuizGenerator(args);
  useQuestUiInitializer(args);
}