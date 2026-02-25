import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const docPath = path.join(process.cwd(), "docs/quest-generation-lessons-learned.md");

test("quest generation lessons document exists with key recurrence controls", () => {
  assert.equal(fs.existsSync(docPath), true);
  const text = fs.readFileSync(docPath, "utf8");
  assert.equal(text.includes("Generation became heavy and slow"), true);
  assert.equal(text.includes("Stock existed, but question picking still failed"), true);
  assert.equal(text.includes("E1-E4"), true);
  assert.equal(text.includes("Audit Checklist"), true);
});

