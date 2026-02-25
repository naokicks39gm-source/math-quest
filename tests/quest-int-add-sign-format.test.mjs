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
  assert.equal(factorySource.includes("const { a, b } = pickSignedOperandPair(out.length);"), true);
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

test("J1.AL.INT.INT_ADD allows negative operands as signed parentheses", () => {
  assert.equal(factorySource.includes("const { a, b } = pickSignedOperandPair(out.length);"), true);
  assert.equal(factorySource.includes('type.type_id === "J1.AL.INT.INT_ADD"'), false);
  assert.equal(stockSource.includes("const signVariants: Array<[1 | -1, 1 | -1]> = ["), true);
  assert.equal(stockSource.includes("[-1, 1],"), true);
  assert.equal(stockSource.includes("[1, -1],"), true);
});

test("J1.AL.INT.INT_ADD stock is normalized to parenthesized signed operands", () => {
  assert.equal(stockSource.includes('if (typeId !== "J1.AL.INT.INT_ADD" && typeId !== "J1.AL.INT.INT_SUB") return entry;'), true);
  assert.equal(stockSource.includes("const normalizePrompt = typeId === \"J1.AL.INT.INT_ADD\" ? normalizeIntAddPrompt : normalizeIntSubPrompt;"), true);
  assert.equal(stockSource.includes('return `${toSignedParen(left)} + ${toSignedParen(right)} =`;'), true);
});

test("J1.AL.INT.INT_SUB stock is normalized to parenthesized signed operands", () => {
  assert.equal(stockSource.includes("const normalizeIntSubPrompt = (prompt: string) => {"), true);
  assert.equal(stockSource.includes('return `${toSignedParen(left)} - ${toSignedParen(right)} =`;'), true);
});
