import test from "node:test";
import assert from "node:assert/strict";
import { readQuestSource } from "./helpers/quest-source.mjs";

const source = readQuestSource();

test("quest page does not import explanation modal", () => {
  assert.equal(source.includes("ExplanationModal"), false);
  assert.equal(source.includes("SecondaryExplanationPanel"), true);
  assert.equal(source.includes("getSecondaryLearningAid"), true);
  assert.equal(source.includes("解説を開く"), false);
});
