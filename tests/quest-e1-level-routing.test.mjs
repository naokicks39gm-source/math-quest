import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const questPath = path.join(process.cwd(), "src/app/quest/page.tsx");
const source = fs.readFileSync(questPath, "utf8");

test("quest page supports levelId route for E1 adapter", () => {
  assert.equal(source.includes("params.get(\"levelId\")"), true);
  assert.equal(source.includes("const levelFromQuery"), true);
  assert.equal(source.includes("if (levelFromQuery)"), true);
  assert.equal(source.includes("generateE1LevelProblems(levelFromQuery, quizSize)"), true);
});

test("quest picker exposes E1 level options and routes by levelId", () => {
  assert.equal(source.includes("E1_LEVEL_OPTIONS"), true);
  assert.equal(source.includes("router.push(`/quest?levelId=${encodeURIComponent(option.levelId)}`)"), true);
});

