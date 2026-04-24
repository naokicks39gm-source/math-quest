import test from "node:test";
import assert from "node:assert/strict";
import { readQuestSource } from "./helpers/quest-source.mjs";

const source = readQuestSource();

test("quest page supports levelId route for E1 adapter", () => {
  assert.equal(source.includes("params.get(\"levelId\")"), true);
  assert.equal(source.includes("const levelInfo = useMemo(() => resolveQuestLevelInfo(rawLevelFromQuery), [rawLevelFromQuery]);"), true);
  assert.equal(source.includes("const levelFromQuery: QuestLevelId | \"\" = levelInfo?.levelId ?? \"\";"), true);
  assert.equal(source.includes('if (levelInfo?.gradeId === "E1") {'), true);
  assert.equal(source.includes("generateE1LevelProblems"), true);
  assert.equal(source.includes('numberingStyle: "circled"'), true);
  assert.equal(source.includes("const trailingBlock = splitIndex >= 0 ? lastStep.slice(splitIndex + 2).trim() : \"\";"), true);
  assert.equal(source.includes(".split(/\\n\\s*\\n/u)"), true);
});

test("quest picker exposes E1 level options and routes by levelId", () => {
  assert.equal(source.includes("E1_LEVEL_OPTIONS"), true);
  assert.equal(source.includes("router.push(`/quest?levelId=${encodeURIComponent(option.levelId)}`)"), true);
  assert.equal(source.includes("typeName: `Lv:${entry.levelId} ${entry.title}`"), true);
  assert.equal(source.includes('if (pickerGrade?.grade_id === "E1") {'), true);
  assert.equal(source.includes('gradeName: "小1"'), true);
  assert.equal(source.includes('categoryName: "数と計算"'), true);
  assert.equal(source.includes('if (text[index] === "□") return true;'), true);
  assert.equal(source.includes('levelFromQuery === "E1-1"'), true);
});
