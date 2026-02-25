import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/lib/grader.ts"), "utf8");

test("grader supports decimal kind with numeric tolerance", () => {
  assert.match(source, /if \(format\.kind === "dec"\)/);
  assert.match(source, /Math\.abs\(value - target\) <= 1e-9/);
  assert.match(source, /const normalizeDecimalString = \(value: number\) =>/);
});
