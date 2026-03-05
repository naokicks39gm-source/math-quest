import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const stockSource = fs.readFileSync(
  path.join(process.cwd(), "src/lib/questStockFactory.ts"),
  "utf8"
);

const makeSyntheticStock = (count = 50) =>
  Array.from({ length: count }, (_, i) => ({
    item: { prompt: `${i + 1} + 1 =`, prompt_tex: `${i + 1} + 1 =`, answer: String(i + 2) },
    type: { type_id: "E1.NA.ADD.ADD_1D_1D_NO", answer_format: { kind: "int" }, example_items: [] }
  }));

const promptKey = (entry) => String(entry.item.prompt_tex ?? entry.item.prompt).replace(/\s+/g, " ").trim();

const equivalentKey = (entry) => {
  const normalized = promptKey(entry).replace(/\s*=\s*$/, "");
  const m = normalized.match(/^(.+?)\s*([+\-×÷])\s*(.+)$/u);
  if (!m) return normalized;
  const left = m[1].trim();
  const op = m[2];
  const right = m[3].trim();
  if (op === "+" || op === "×") {
    return [left, right].sort().join(op);
  }
  return `${left}${op}${right}`;
};

const pickUnique = (stock, quizSize = 5) => {
  const seenPrompt = new Set();
  const seenEq = new Set();
  const deduped = [];
  for (const e of stock) {
    const p = promptKey(e);
    const q = equivalentKey(e);
    if (seenPrompt.has(p) || seenEq.has(q)) continue;
    seenPrompt.add(p);
    seenEq.add(q);
    deduped.push(e);
  }
  const copied = [...deduped];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied.slice(0, Math.min(quizSize, copied.length));
};

test("stock picker code has dedupe + non-replacement extraction", () => {
  assert.equal(stockSource.includes("const deduped = uniqueByPromptAndEquivalent(stock);"), true);
  assert.equal(stockSource.includes("let picked = shuffle(deduped).slice(0, Math.min(requested, availableAfterDedupe));"), true);
  assert.equal(stockSource.includes("if (picked.length < requested && availableBeforeDedupe >= requested)"), true);
  assert.equal(stockSource.includes("const deterministic = [...deduped].sort"), true);
  assert.equal(stockSource.includes("byPromptOnly"), false);
});

test("repeated picks never duplicate within one 5-item set", () => {
  const stock = makeSyntheticStock(50);
  for (let i = 0; i < 500; i += 1) {
    const picked = pickUnique(stock, 5);
    assert.equal(picked.length, 5);
    const pSet = new Set(picked.map((e) => promptKey(e)));
    const eSet = new Set(picked.map((e) => equivalentKey(e)));
    assert.equal(pSet.size, 5);
    assert.equal(eSet.size, 5);
  }
});
