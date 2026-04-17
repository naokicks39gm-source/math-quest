// src/app/quest/hooks/types.ts

export type QuestStockBuilderArgs = {
  isLearningSessionMode: boolean;
  hasLevelQuery: boolean;
  retryNonce: number;

  buildStockState: () => {
    stocks: Map<string, any>;
    shortages: any[];
  };

  setTypeStocks: React.Dispatch<React.SetStateAction<Map<string, any>>>;
  setStockShortages: React.Dispatch<React.SetStateAction<any[]>>;
  setStockReady: React.Dispatch<React.SetStateAction<boolean>>;
};

export type QuestQuizGeneratorArgs = {
  isLearningSessionMode: boolean;
  stockReady: boolean;
  retryNonce: number;

  pickQuestSet: () => {
    kind: "ok" | "blocked";
    entries?: any[];
    message?: string | null;
    pickMeta?: any;
  };

  setActivePickMeta: (v: any) => void;
  setQuizItems: React.Dispatch<React.SetStateAction<any[]>>;
  setItemIndex: React.Dispatch<React.SetStateAction<number>>;
  setQuestionResults: React.Dispatch<React.SetStateAction<Record<string, any>>>;

  setStatus: (v: "blocked" | "playing") => void;
  setQuizBuildError: (v: string | null) => void;
  questSetStatus: (v: "blocked" | "playing") => void;
};

export type QuestUiInitializerArgs = {
  isLearningSessionMode: boolean;
  stockReady: boolean;
  retryNonce: number;

  clearAllFractionAutoMoveTimers: () => void;

  setMessage: (v: string) => void;
  setPracticeResult: (v: any) => void;
  setResultMark: (v: any) => void;
  setRecognizedNumber: (v: any) => void;

  setInput: (v: string) => void;

  EMPTY_FRACTION_EDITOR: any;
  setFractionInput: (v: any) => void;

  setQuadraticAnswers: (v: string[]) => void;
  setQuadraticFractionInputs: (v: any[]) => void;
  setQuadraticActiveIndex: (v: number) => void;
};