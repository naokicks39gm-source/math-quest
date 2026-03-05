import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/lib/questItemFactory.ts"),
  "utf8"
);

test("diversity score includes digit coverage and repetition penalties", () => {
  assert.equal(source.includes("uniqueDigits * 8"), true);
  assert.equal(source.includes("repeatedDigitPenalty"), true);
  assert.equal(source.includes("proximityPenalty"), true);
  assert.equal(source.includes("duplicatePatternPenalty"), true);
  assert.equal(source.includes("duplicateDanPenalty"), true);
});

test("adjacent same family is strongly penalized", () => {
  assert.equal(source.includes("adjacentPenaltyByFeatures"), true);
  assert.equal(source.includes("if (prev.patternId && prev.patternId === curr.patternId) penalty += 40"), true);
  assert.equal(source.includes("if (prev.dan !== null && curr.dan !== null && prev.dan === curr.dan) penalty += 50"), true);
  assert.equal(source.includes("if (prev.family === curr.family) penalty += 35"), true);
});

test("final quest set uses single-pass unique pool selection", () => {
  assert.equal(source.includes("const strictAttempts = 1200"), false);
  assert.equal(source.includes("const fallbackAttempts = 360"), false);
  assert.equal(source.includes("const uniquePool = uniqueByPromptAndEquivalent(expanded);"), true);
  assert.equal(source.includes("if (uniquePool.length < quizSize) {"), true);
  assert.equal(source.includes("const ordered = reorderAvoidAdjacentSameFamily(shuffle(uniquePool)).slice(0, quizSize);"), true);
  assert.equal(source.includes("return { entries: reason ? [] : final, reason, stats };"), true);
});

test("multiplication dan family is explicitly tracked", () => {
  assert.equal(source.includes("getDanFromPatternId"), true);
  assert.equal(source.includes("MUL_1D_1D_DAN_(\\d)$"), true);
  assert.equal(source.includes("const family = dan !== null ? `${patternId}:DAN_${dan}` : `${patternId}:${valueBucket}`"), true);
});
