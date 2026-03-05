import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const mustExist = [
  "apps/web/src/app/api/guardian-contact/route.ts",
  "apps/web/src/app/api/session/start/route.ts",
  "apps/web/src/app/api/session/answer/route.ts",
  "apps/web/src/app/api/session/end/route.ts"
];

test("required api routes exist", () => {
  for (const p of mustExist) {
    const file = path.join(process.cwd(), p);
    assert.equal(fs.existsSync(file), true, `${p} is missing`);
  }
});

