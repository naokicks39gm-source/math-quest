import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("quadratic roots examples are fixed to x^2+x-6=0 for H2-H3", () => {
  for (const gradeId of ["h2", "h3"]) {
    const source = read(`src/content/grades/mathquest_${gradeId}_types_v1.json`);
    assert.match(source, /"type_id":\s*"H\d\.AL\.EQ\.QUAD_ROOTS"/);
    assert.match(source, /"prompt":\s*"x\^2\+x-6=0"/);
    assert.doesNotMatch(source, /x\^2-5x\+6=0 の解\(小さい順\) =/);
    assert.doesNotMatch(source, /x\^2-9=0 の解\(小さい順\) =/);
  }
});

test("H1 uses structured quadratic equation lesson groups", () => {
  const source = read("src/content/grades/mathquest_h1_types_v1.json");
  assert.match(source, /"type_id":\s*"H1\.AL\.EQ\.QUAD_ROOTS_FACTOR_1_BASIC"/);
  assert.match(source, /"type_id":\s*"H1\.AL\.EQ\.QUAD_ROOTS_SQ_1_BASIC"/);
  assert.match(source, /"type_id":\s*"H1\.AL\.EQ\.QUAD_ROOTS_FORMULA_1_BASIC"/);
  assert.match(source, /"prompt":\s*"x\^2 \+ 5x \+ 6 = 0 を解け"/);
  assert.match(source, /"prompt":\s*"x² \+ 3x − 4 = 0 を解の公式で解け"/);
  assert.match(source, /"prompt":\s*"\(x - 1\)\^2 = 1\/4 を解け"/);
});

test("linear equation prompts keep x = notation in J2/J3", () => {
  for (const gradeId of ["j2", "j3"]) {
    const source = read(`src/content/grades/mathquest_${gradeId}_types_v1.json`);
    assert.match(source, /"type_id":\s*"J\d\.EQ\.LIN\.LIN_EQ"/);
    assert.match(source, /"prompt":\s*"2x \+ 3 = 11, x ="/);
    assert.match(source, /"prompt":\s*"5x - 10 = 0, x ="/);
    assert.match(source, /"prompt":\s*"3x \+ 7 = 1, x ="/);
  }
});

test("grader supports pair answers with unordered quadratic root matching", () => {
  const source = read("src/lib/grader.ts");
  assert.match(source, /const parseIntPair = \(input: string\): IntPair \| null =>/);
  assert.match(source, /const parseTokenPair = \(input: string\): TokenPair \| null =>/);
  assert.match(source, /const isQuadraticRootsPairType = \(typeId\?: string\)/);
  assert.match(source, /if \(format\.kind === "pair"\)/);
  assert.match(source, /const unordered = isQuadraticRootsPairType\(opts\?\.typeId\);/);
  assert.match(source, /const userSorted = sortTokenPairAsc\(userTokenPair\);/);
});

test("quest page has dual answer slots for quadratic roots", () => {
  const source = read("src/app/quest/page.tsx");
  assert.match(source, /const isQuadraticRootsType = \(typeId\?: string\) =>/);
  assert.match(source, /QUAD_ROOTS\(\?:_\|\$\)/);
  assert.match(source, /const isH1ReferenceOnlyType =/);
  assert.match(source, /const \[quadraticAnswers, setQuadraticAnswers\] = useState<\[string, string\]>/);
  assert.match(source, /aria-label="recognized-answer-1"/);
  assert.match(source, /aria-label="recognized-answer-2"/);
  assert.match(source, /userInputForJudge = `\$\{normalizedPair\[0\]\},\$\{normalizedPair\[1\]\}`;/);
});
