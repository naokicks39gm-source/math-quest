import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const pageSource = fs.readFileSync(path.join(process.cwd(), "src/app/quest/page.tsx"), "utf8");
const panelSource = fs.readFileSync(path.join(process.cwd(), "src/components/SecondaryExplanationPanel.tsx"), "utf8");

test("secondary quest uses separate hint and explanation toggles", () => {
  assert.match(pageSource, /const \[showSecondaryHint, setShowSecondaryHint\] = useState\(false\)/);
  assert.match(pageSource, /const \[showSecondaryExplanation, setShowSecondaryExplanation\] = useState\(false\)/);
  assert.match(pageSource, /const isSecondaryQuest = \/\^\(J1\|J2\|J3\|H1\|H2\|H3\)\$\/\.test\(currentGradeId\)/);
  assert.match(pageSource, /ヒントを見る/);
  assert.match(pageSource, /解説を見る/);
  assert.match(pageSource, /showSecondaryHint && \(/);
  assert.match(pageSource, /showSecondaryExplanation && \(/);
  assert.match(pageSource, /<SecondaryExplanationPanel[\s\S]*showNextButton/);
});

test("secondary explanation panel is explanation-only and supports next button", () => {
  assert.equal(panelSource.includes("const { hint, explanation } = aid;"), false);
  assert.match(panelSource, /const \{ explanation \} = aid;/);
  assert.match(panelSource, /showNextButton/);
  assert.match(panelSource, /onNext/);
  assert.match(panelSource, /nextLabel/);
});
