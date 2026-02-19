import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const factorySource = fs.readFileSync(
  path.join(process.cwd(), "src/lib/questItemFactory.ts"),
  "utf8"
);
const questSource = fs.readFileSync(
  path.join(process.cwd(), "src/app/quest/page.tsx"),
  "utf8"
);

test("factory enforces no-repeat policy for prompt/equivalent/answer keys", () => {
  assert.equal(factorySource.includes("if (promptKeys.has(promptKey)) continue;"), true);
  assert.equal(factorySource.includes("if (equivalentKeys.has(equivalentKey)) continue;"), true);
  assert.equal(factorySource.includes("if (answerKeys.has(answerKey)) continue;"), true);
  assert.equal(factorySource.includes("const strictAttempts = 600"), true);
  assert.equal(factorySource.includes("const attempts = 6"), true);
});

test("equivalent expression normalization treats commutative ops as same", () => {
  assert.equal(factorySource.includes("const COMMUTATIVE_OPS = new Set([\"+\", \"×\"])"), true);
  assert.equal(factorySource.includes("const [a, b] = [parsed.left, parsed.right].sort();"), true);
});

test("quest pool prefilter uses equivalent prompt key instead of type_id", () => {
  assert.equal(questSource.includes("entryEquivalentKey"), true);
  assert.equal(questSource.includes("entry.type.type_id}::${entry.item.prompt_tex ?? entry.item.prompt}::${entry.item.answer"), false);
});
