import type { GeneratedProblem } from "packages/problem-engine";

import type { Explanation } from "./explanationTypes";

type ExplanationGenerator = (problem: GeneratedProblem) => Explanation;

export const explanationRegistry: Record<string, ExplanationGenerator> = {
  E1_NUMBER_COUNT: () => ({
    steps: ["かぞえる", "こたえをだす"],
    summary: "かぞえられた",
    patternId: "E1_NUMBER_COUNT"
  }),
  E1_NUMBER_ORDER: () => ({
    steps: ["ちいさいほうからならべる", "じゅんばんをみる"],
    summary: "じゅんばんがわかる",
    patternId: "E1_NUMBER_ORDER"
  }),
  E1_NUMBER_COMPARE: () => ({
    steps: ["2つのかずをみくらべる", "おおきいほうかちいさいほうをえらぶ"],
    summary: "くらべられた",
    patternId: "E1_NUMBER_COMPARE"
  }),
  E1_NUMBER_COMPOSE: () => ({
    steps: ["2つのかずをあわせる", "ぜんぶでいくつかみる"],
    summary: "あわせたかずがわかる",
    patternId: "E1_NUMBER_COMPOSE"
  }),
  E1_NUMBER_DECOMPOSE: () => ({
    steps: ["ぜんぶのかずをみる", "のこりのかずをかんがえる"],
    summary: "わけかたがわかる",
    patternId: "E1_NUMBER_DECOMPOSE"
  }),
  E1_NUMBER_LINE: () => ({
    steps: ["すうじのならびをみる", "あてはまるばしょをさがす"],
    summary: "ばしょがわかる",
    patternId: "E1_NUMBER_LINE"
  }),
  E1_ADD_ZERO: () => ({
    steps: ["0をたしてもかわらない", "そのままこたえる"],
    summary: "もとのかずがこたえ",
    patternId: "E1_ADD_ZERO"
  }),
  E1_ADD_ONE: () => ({
    steps: ["1ふやす", "つぎのかずをいう"],
    summary: "1つふえた",
    patternId: "E1_ADD_ONE"
  }),
  E1_ADD_DOUBLES: () => ({
    steps: ["おなじかずを2かいたす", "あわせたこたえをだす"],
    summary: "おなじかずをたした",
    patternId: "E1_ADD_DOUBLES"
  }),
  E1_ADD_NEAR_DOUBLES: () => ({
    steps: ["おなじかずにちかいとみる", "doublesから1つちょうせいする"],
    summary: "ちかいdoublesでとける",
    patternId: "E1_ADD_NEAR_DOUBLES"
  }),
  E1_ADD_BASIC: () => ({
    steps: ["10をつくる", "のこりをたす"],
    summary: "こたえをだす",
    patternId: "E1_ADD_BASIC"
  }),
  E1_ADD_10: () => ({
    steps: ["10をたす", "10おおきいかずをみる"],
    summary: "10ふえた",
    patternId: "E1_ADD_10"
  }),
  E1_ADD_CARRY: () => ({
    steps: ["まず10をつくる", "のこりをたしてこたえをだす"],
    summary: "くりあがりでとける",
    patternId: "E1_ADD_CARRY"
  }),
  E1_SUB_BASIC: () => ({
    steps: ["へらす", "のこりをみる"],
    summary: "こたえ",
    patternId: "E1_SUB_BASIC"
  }),
  E1_SUB_FACTS: () => ({
    steps: ["ひきざんをたしざんにいいかえる", "はいるかずをみつける"],
    summary: "たしざんとかんけいづけた",
    patternId: "E1_SUB_FACTS"
  }),
  E1_SUB_BORROW: () => ({
    steps: ["10をくずす", "ひいてのこりをみる"],
    summary: "くりさがりでとける",
    patternId: "E1_SUB_BORROW"
  }),
  E1_FACT_FAMILY: () => ({
    steps: ["つながるたしざんとひきざんをみる", "同じ3つのかずのかんけいをつかう"],
    summary: "fact family がわかる",
    patternId: "E1_FACT_FAMILY"
  })
};
