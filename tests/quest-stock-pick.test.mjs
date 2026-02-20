import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/lib/questStockFactory.ts"),
  "utf8"
);
const questSource = fs.readFileSync(
  path.join(process.cwd(), "src/app/quest/page.tsx"),
  "utf8"
);

test("pick quiz from stock uses fisher-yates shuffle + slice", () => {
  assert.equal(source.includes("for (let i = copied.length - 1; i > 0; i -= 1)"), true);
  assert.equal(source.includes("export const pickUniqueQuizFromStock"), true);
  assert.equal(source.includes("const deduped = uniqueByPromptAndEquivalent(stock);"), true);
  assert.equal(source.includes("let picked = shuffle(deduped).slice(0, Math.min(requested, availableAfterDedupe));"), true);
  assert.equal(source.includes("if (picked.length < requested && availableBeforeDedupe >= requested)"), true);
  assert.equal(source.includes("const deterministic = [...deduped].sort"), true);
  assert.equal(source.includes("byPromptOnly"), false);
  assert.equal(source.includes("reason: picked.length < requested ? \"SHORTAGE\" : undefined"), true);
});

test("quest page renders shortage list when stock count is low", () => {
  assert.equal(questSource.includes("const [stockShortages, setStockShortages] = useState<StockShortage[]>([]);"), true);
  assert.equal(questSource.includes("候補不足タイプ一覧"), true);
  assert.equal(questSource.includes("stock.count < TOTAL_QUESTIONS"), true);
  assert.equal(questSource.includes("pickMeta.availableAfterDedupe < 1"), true);
});
