import type { GeneratedProblem } from "packages/problem-engine";

import type { Hint } from "./hintTypes";

type HintGenerator = (problem: GeneratedProblem) => Hint;

export const hintRegistry: Record<string, HintGenerator> = {
  E1_NUMBER_COUNT: () => ({
    text: "いくつある？",
    type: "concept",
    patternId: "E1_NUMBER_COUNT"
  }),
  E1_NUMBER_ORDER: () => ({
    text: "じゅんばんにしよう",
    type: "concept",
    patternId: "E1_NUMBER_ORDER"
  }),
  E1_NUMBER_COMPARE: () => ({
    text: "どちらがおおきい？",
    type: "concept",
    patternId: "E1_NUMBER_COMPARE"
  }),
  E1_NUMBER_COMPOSE: () => ({
    text: "あわせると？",
    type: "concept",
    patternId: "E1_NUMBER_COMPOSE"
  }),
  E1_NUMBER_DECOMPOSE: () => ({
    text: "わけられる？",
    type: "concept",
    patternId: "E1_NUMBER_DECOMPOSE"
  }),
  E1_NUMBER_LINE: () => ({
    text: "どこにある？",
    type: "concept",
    patternId: "E1_NUMBER_LINE"
  }),
  E1_ADD_ZERO: () => ({
    text: "0をたすと？",
    type: "concept",
    patternId: "E1_ADD_ZERO"
  }),
  E1_ADD_ONE: () => ({
    text: "1ふえると？",
    type: "concept",
    patternId: "E1_ADD_ONE"
  }),
  E1_ADD_DOUBLES: () => ({
    text: "おなじかずをたす",
    type: "strategy",
    patternId: "E1_ADD_DOUBLES"
  }),
  E1_ADD_NEAR_DOUBLES: () => ({
    text: "ちかいかずをつかう",
    type: "strategy",
    patternId: "E1_ADD_NEAR_DOUBLES"
  }),
  E1_ADD_BASIC: () => ({
    text: "10をつくれる？",
    type: "strategy",
    patternId: "E1_ADD_BASIC"
  }),
  E1_ADD_10: () => ({
    text: "10たすと？",
    type: "concept",
    patternId: "E1_ADD_10"
  }),
  E1_ADD_CARRY: () => ({
    text: "10になる？",
    type: "strategy",
    patternId: "E1_ADD_CARRY"
  }),
  E1_SUB_BASIC: () => ({
    text: "いくつへる？",
    type: "concept",
    patternId: "E1_SUB_BASIC"
  }),
  E1_SUB_FACTS: () => ({
    text: "たしざんでかんがえる",
    type: "strategy",
    patternId: "E1_SUB_FACTS"
  }),
  E1_SUB_BORROW: () => ({
    text: "10からひける？",
    type: "strategy",
    patternId: "E1_SUB_BORROW"
  }),
  E1_FACT_FAMILY: () => ({
    text: "たしざんとかんけいある？",
    type: "strategy",
    patternId: "E1_FACT_FAMILY"
  })
};
