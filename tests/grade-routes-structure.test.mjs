import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("top page has grade navigation routes", () => {
  const source = read("src/app/page.tsx");
  assert.match(source, /router\.push\("\/elementary"\)/);
  assert.match(source, /router\.push\("\/junior"\)/);
  assert.match(source, /router\.push\("\/highschool"\)/);
});

test("grade route pages exist", () => {
  assert.equal(fs.existsSync(path.join(process.cwd(), "src/app/elementary/page.tsx")), true);
  assert.equal(fs.existsSync(path.join(process.cwd(), "src/app/junior/page.tsx")), true);
  assert.equal(fs.existsSync(path.join(process.cwd(), "src/app/highschool/page.tsx")), true);
});
