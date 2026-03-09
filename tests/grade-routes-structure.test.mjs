import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("top page routes users into MVP learning flows", () => {
  const source = read("src/app/page.tsx");
  assert.match(source, /Math Quest/);
  assert.match(source, /Start Learning/);
  assert.match(source, /Review Weak Skills/);
  assert.match(source, /router\.push\("\/skills"\)/);
  assert.match(source, /router\.push\("\/review"\)/);
});

test("grade route pages exist", () => {
  assert.equal(fs.existsSync(path.join(process.cwd(), "src/app/elementary/page.tsx")), true);
  assert.equal(fs.existsSync(path.join(process.cwd(), "src/app/junior/page.tsx")), true);
  assert.equal(fs.existsSync(path.join(process.cwd(), "src/app/highschool/page.tsx")), true);
});
