import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const j1 = JSON.parse(
  fs.readFileSync(path.join(root, "src/content/grades/mathquest_j1_types_v1.json"), "utf8")
);
const explanationSource = fs.readFileSync(
  path.join(root, "src/lib/secondaryExplanations.ts"),
  "utf8"
);

const getType = (typeId) => {
  for (const grade of j1.grades ?? []) {
    for (const category of grade.categories ?? []) {
      for (const type of category.types ?? []) {
        if (type.type_id === typeId) return type;
      }
    }
  }
  return null;
};

test("J1 template examples are reflected in existing J1 types only", () => {
  const intAdd = getType("J1.AL.INT.INT_ADD");
  const pow = getType("J1.AL.POW.POW_INT");
  const linEq = getType("J1.EQ.LIN.LIN_EQ");
  const linFunc = getType("J1.FN.LIN.LIN_FUNC_PARAMS");

  assert.ok(intAdd);
  assert.ok(pow);
  assert.ok(linEq);
  assert.ok(linFunc);

  assert.equal(intAdd.example_items.some((item) => item.prompt === "-4 + (-6) ="), true);
  assert.equal(intAdd.example_items.some((item) => item.prompt === "8 + (-3) ="), true);
  assert.equal(pow.example_items.some((item) => item.prompt === "-4^2 ="), true);
  assert.equal(pow.example_items.some((item) => item.answer === "-16"), true);
  assert.equal(linEq.example_items.some((item) => item.prompt === "2{ x + 3 } + 4 = 14, x ="), true);
  assert.equal(linFunc.example_items.some((item) => item.prompt === "点(1,5) を通る y=2x+b の (a,b) ="), true);
});

test("J1 removed/updated template items are enforced", () => {
  const serialized = JSON.stringify(j1);
  assert.equal(serialized.includes("J1-18"), false);
  assert.equal(explanationSource.includes("1. 指数の部分を先に計算"), true);
  assert.equal(explanationSource.includes("2. 最後に前のマイナスを付ける"), true);
  assert.equal(explanationSource.includes("if (!options?.typeId?.startsWith(\"J1.\")) return null;"), true);
});
