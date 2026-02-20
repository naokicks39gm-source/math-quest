import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const stockSource = fs.readFileSync(path.join(root, "src/lib/questStockFactory.ts"), "utf8");
const questSource = fs.readFileSync(path.join(root, "src/app/quest/page.tsx"), "utf8");

test("stock result exposes reason_detail and canonical stock key path", () => {
  assert.equal(stockSource.includes("export type StockReasonDetail"), true);
  assert.equal(stockSource.includes("reasonDetail?: StockReasonDetail"), true);
  assert.equal(stockSource.includes("export const canonicalStockKey"), true);
  assert.equal(stockSource.includes("const stockKey = canonicalStockKey(entry);"), true);
  assert.equal(stockSource.includes("if (stockKeys.has(stockKey)) continue;"), true);
});

test("insufficient reason can emit detail classes", () => {
  assert.equal(stockSource.includes("PATTERN_GENERATOR_MISSING"), true);
  assert.equal(stockSource.includes("DEDUPE_COLLISION_HIGH"), true);
  assert.equal(stockSource.includes("PARAM_RANGE_NARROW"), true);
  assert.equal(stockSource.includes("reasonDetail = \"PATTERN_GENERATOR_MISSING\""), true);
  assert.equal(stockSource.includes("normalizedType.answer_format.kind !== \"expr\""), true);
});

test("quest page keeps rendering shortage reasons and detail", () => {
  assert.equal(questSource.includes("reasonDetail?: TypeStockResult[\"reasonDetail\"];"), true);
  assert.equal(questSource.includes("reasonDetail: stock.reasonDetail"), true);
  assert.equal(questSource.includes("stock.reason_detail:"), true);
});
