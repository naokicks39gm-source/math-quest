import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const gradeCatalogSource = fs.readFileSync(
  path.join(process.cwd(), "src/lib/gradeCatalog.ts"),
  "utf8"
);
const questSource = fs.readFileSync(
  path.join(process.cwd(), "src/app/quest/page.tsx"),
  "utf8"
);

test("grade catalog exposes Lv label resolver helpers", () => {
  assert.equal(gradeCatalogSource.includes("export const findTypeByLevelLabel"), true);
  assert.equal(gradeCatalogSource.includes("export const getTypeIdByLevelLabel"), true);
  assert.equal(gradeCatalogSource.includes("label.match(/^Lv:([A-Z]\\d)-(\\d+)\\s/u)"), true);
});

test("quest page has dev-only type/stock diagnostic panel", () => {
  assert.equal(questSource.includes("DEV診断: Lv/type/stock"), true);
  assert.equal(questSource.includes("type_id:"), true);
  assert.equal(questSource.includes("pattern_id:"), true);
  assert.equal(questSource.includes("stock.count:"), true);
  assert.equal(questSource.includes("stock.reason:"), true);
});

