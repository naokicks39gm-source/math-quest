import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const mustExist = [
  "src/app/api/guardian-contact/route.ts",
  "src/app/api/session/start/route.ts",
  "src/app/api/session/answer/route.ts",
  "src/app/api/session/end/route.ts"
];

test("required api routes exist", () => {
  for (const p of mustExist) {
    const file = path.join(process.cwd(), p);
    assert.equal(fs.existsSync(file), true, `${p} is missing`);
  }
});

