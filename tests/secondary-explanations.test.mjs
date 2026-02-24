import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(process.cwd(), p), "utf8"));
const sourcePath = path.join(process.cwd(), "src/lib/secondaryExplanations.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const panelPath = path.join(process.cwd(), "src/components/SecondaryExplanationPanel.tsx");
const panelSource = fs.readFileSync(panelPath, "utf8");

const gradeFiles = ["j1", "j2", "j3", "h1", "h2", "h3"].map(
  (id) => `src/content/grades/mathquest_${id}_types_v1.json`
);

const getSecondaryPatternsFromData = () => {
  const out = new Set();
  for (const file of gradeFiles) {
    const json = readJson(file);
    for (const grade of json.grades ?? []) {
      for (const category of grade.categories ?? []) {
        for (const type of category.types ?? []) {
          const patternId = type.generation_params?.pattern_id;
          if (patternId) out.add(patternId);
        }
      }
    }
  }
  return [...out].sort();
};

const getPatternIdsFromSource = () => {
  const blockMatch = source.match(/const PATTERN_IDS = \[(.*?)\] as const;/s);
  assert.ok(blockMatch, "PATTERN_IDS block should exist");
  const ids = [...blockMatch[1].matchAll(/"([A-Z0-9_]+)"/g)].map((m) => m[1]);
  return ids.sort();
};

test("secondary explanation file defines middle/high grade guard", () => {
  assert.equal(source.includes("SECONDARY_GRADE_RE"), true);
  assert.equal(source.includes("/^(J[1-3]|H[1-3])$/"), true);
});

test("all middle/high pattern_id values are covered in PATTERN_IDS", () => {
  const dataPatterns = getSecondaryPatternsFromData();
  const sourcePatterns = getPatternIdsFromSource();
  assert.deepEqual(sourcePatterns, dataPatterns);
  assert.equal(sourcePatterns.length, 36);
});

test("learning aid includes hint and explanation building", () => {
  assert.equal(source.includes("hint: toHint(patternId)"), true);
  assert.equal(source.includes("typeId === \"J1.AL.INT.INT_ADD\" && pid === \"INT_ADD\""), true);
  assert.equal(source.includes("hintLines?: { kind: \"text\" | \"tex\"; value: string }[]"), true);
  assert.equal(source.includes("derivationLines: { kind: \"tex\" | \"text\"; value: string; highlights?: string[] }[]"), true);
  assert.equal(source.includes("const buildDerivationLines = ("), true);
  assert.equal(source.includes("{ kind: \"text\", value: \"符号のルール\" }"), true);
  assert.equal(source.includes("String.raw`+\\left(+\\right)\\to +`"), true);
  assert.equal(source.includes("String.raw`+\\left(-\\right)\\to -`"), true);
  assert.equal(source.includes("String.raw`-\\left(+\\right)\\to -`"), true);
  assert.equal(source.includes("String.raw`-\\left(-\\right)\\to +`"), true);
  assert.equal(source.includes("if (normalized.length >= 2) return addHighlightsToLines(normalized);"), true);
  assert.equal(source.includes("derivationLines: buildDerivationLines"), true);
  assert.equal(source.includes("buildGenericExplanation(patternId)"), true);
  assert.equal(source.includes("headers"), true);
  assert.equal(source.includes("diagramLines"), true);
  assert.equal(source.includes("conclusion"), true);
  assert.equal(source.includes("つまり、"), true);
});

test("secondary explanation panel shows conclusion answer section", () => {
  assert.equal(panelSource.includes("答え"), true);
  assert.equal(panelSource.includes("explanation.conclusion"), true);
  assert.equal(panelSource.includes("explanation.derivationLines"), true);
  assert.equal(panelSource.includes("InlineMath"), true);
  assert.equal(panelSource.includes("式変形"), false);
});
