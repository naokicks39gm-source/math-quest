import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const factorySource = fs.readFileSync(
  path.join(process.cwd(), "src/lib/questItemFactory.ts"),
  "utf8"
);
const stockSource = fs.readFileSync(
  path.join(process.cwd(), "src/lib/questStockFactory.ts"),
  "utf8"
);

test("INT_ADD uses explicit signed parenthesis format", () => {
  assert.equal(factorySource.includes("const formatSignedWithPlus = (n: number) => (n >= 0 ? `(+${n})` : `(${n})`);"), true);
  assert.equal(factorySource.includes("prompt: `${formatSignedWithPlus(a)} + ${formatSignedWithPlus(b)} =`"), true);
  assert.equal(factorySource.includes("prompt_tex: `${formatSignedWithPlus(a)} + ${formatSignedWithPlus(b)} =`"), true);
});

test("INT_ADD generation balances sign combinations (+,+),(-,+),(+,-),(-,-)", () => {
  assert.equal(factorySource.includes("const signVariants: Array<[1 | -1, 1 | -1]> = ["), true);
  assert.equal(factorySource.includes("[1, 1],"), true);
  assert.equal(factorySource.includes("[-1, 1],"), true);
  assert.equal(factorySource.includes("[1, -1],"), true);
  assert.equal(factorySource.includes("[-1, -1]"), true);
  assert.equal(factorySource.includes(": pickSignedOperandPair(out.length);"), true);
});

test("INT_ADD fallback generation also uses explicit signed parenthesis format", () => {
  assert.equal(stockSource.includes("const asSignedWithPlus = (n: number) => (n >= 0 ? `(+${n})` : `(${n})`);"), true);
  assert.equal(stockSource.includes("prompt: `${asSignedWithPlus(signedA)} + ${asSignedWithPlus(signedB)} =`"), true);
});

test("INT_SUB also uses explicit signed parenthesis format", () => {
  assert.equal(factorySource.includes("prompt: `${formatSignedWithPlus(a)} - ${formatSignedWithPlus(b)} =`"), true);
  assert.equal(factorySource.includes("prompt_tex: `${formatSignedWithPlus(a)} - ${formatSignedWithPlus(b)} =`"), true);
  assert.equal(stockSource.includes("prompt: `${asSignedWithPlus(a)} - ${asSignedWithPlus(b)} =`"), true);
});

test("J1.AL.INT.INT_ADD is restricted to (+) + (+)", () => {
  assert.equal(factorySource.includes('patternId === "INT_ADD" && type.type_id === "J1.AL.INT.INT_ADD"'), true);
  assert.equal(factorySource.includes("? { a: randInt(1, 20), b: randInt(1, 20) }"), true);
  assert.equal(stockSource.includes("const isJ1IntAddType = (type: TypeDef, patternId: string) =>"), true);
  assert.equal(stockSource.includes("const a = ((i * 2) % 20) + 1;"), true);
  assert.equal(stockSource.includes("isJ1IntAddType(type, patternId) ? ((i * 3) % 20) + 1"), true);
});
