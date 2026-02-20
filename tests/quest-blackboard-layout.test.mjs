import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("quest hides next item preview in playing card", () => {
  const source = read("src/app/quest/page.tsx");
  assert.doesNotMatch(source, /\{nextItem && \(/);
  assert.doesNotMatch(source, /const nextItem = /);
});

test("quest current card uses blackboard-themed classes", () => {
  const source = read("src/app/quest/page.tsx");
  assert.match(source, /from-emerald-950 via-emerald-900 to-emerald-950/);
  assert.match(source, /border-x-amber-700 border-t-amber-700 border-b-slate-300/);
  assert.match(source, /rounded-2xl/);
  assert.match(source, /text-emerald-50/);
  assert.doesNotMatch(source, /aria-label="board-silver-ledge"/);
  assert.match(source, /aria-label="board-eraser"/);
  assert.match(source, /aria-label="board-chalk-white"/);
  assert.match(source, /aria-label="board-chalk-pink"/);
  assert.match(source, /aria-label="board-chalk-blue"/);
  assert.match(source, /renderPrompt\(currentItem, currentType\?\.type_id\)/);
});

test("quest answer layout keeps right offset and quadratic row", () => {
  const source = read("src/app/quest/page.tsx");
  assert.match(source, /const \[qaAnswerOffsetPx, setQaAnswerOffsetPx\] = useState\(0\)/);
  assert.match(source, /style=\{useSingleLineQa \? undefined : \{ marginLeft: `\$\{qaAnswerOffsetPx\}px` \}\}/);
  assert.match(source, /w-full sm:w-auto flex items-center gap-2 overflow-x-auto whitespace-nowrap/);
  assert.match(source, /w-full sm:w-auto flex items-center gap-2 overflow-visible/);
  assert.doesNotMatch(source, /recognized-answer-1"[\s\S]*flex-wrap/);
  assert.match(source, /aria-label="recognized-answer-1"/);
  assert.match(source, /aria-label="recognized-answer-2"/);
});
