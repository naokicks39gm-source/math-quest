import type { GeneratedProblem } from "packages/problem-engine";

import { explanationRegistry } from "./explanationRegistry";
import type { Explanation } from "./explanationTypes";

const E1_PATTERN_KEY_MAP: Array<[prefix: string, patternId: string]> = [
  ["E1-NUM-COUNT-", "E1_NUMBER_COUNT"],
  ["E1-NUM-ORDER-", "E1_NUMBER_ORDER"],
  ["E1-NUM-COMPARE-", "E1_NUMBER_COMPARE"],
  ["E1-NUM-LINE-", "E1_NUMBER_LINE"],
  ["E1-ADD-ZERO-", "E1_ADD_ZERO"],
  ["E1-ADD-ONE-", "E1_ADD_ONE"],
  ["E1-ADD-DOUBLES-", "E1_ADD_DOUBLES"],
  ["E1-ADD-NEAR-DOUBLES-", "E1_ADD_NEAR_DOUBLES"],
  ["E1-ADD-BASIC-", "E1_ADD_BASIC"],
  ["E1-SUB-BASIC-", "E1_SUB_BASIC"],
  ["E1-SUB-FACTS-", "E1_SUB_FACTS"],
  ["E1-FACT-FAMILY-", "E1_FACT_FAMILY"],
  ["E1-NUM-COMPOSE-", "E1_NUMBER_COMPOSE"],
  ["E1-NUM-DECOMPOSE-", "E1_NUMBER_DECOMPOSE"],
  ["E1-ADD-MAKE10", "E1_ADD_10"],
  ["E1-ADD-CARRY", "E1_ADD_CARRY"],
  ["E1-SUB-BORROW", "E1_SUB_BORROW"]
];

export const DEFAULT_EXPLANATION: Explanation = {
  steps: ["もういちどかんがえてみよう"],
  summary: "",
  patternId: ""
};

export const resolveExplanationPatternId = (problem: GeneratedProblem): string => {
  const explicitPatternId = problem.meta?.patternId?.trim();
  if (explicitPatternId) {
    return explicitPatternId;
  }

  const patternKey = problem.patternKey?.trim();
  if (!patternKey) {
    return "";
  }

  const matched = E1_PATTERN_KEY_MAP.find(([prefix]) => patternKey.startsWith(prefix));
  return matched?.[1] ?? "";
};

export function generateExplanation(problem: GeneratedProblem): Explanation {
  const patternId = resolveExplanationPatternId(problem);
  const generator = explanationRegistry[patternId];

  if (generator) {
    return generator(problem);
  }

  return {
    ...DEFAULT_EXPLANATION,
    patternId
  };
}
