import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const adapterSource = fs.readFileSync(
  path.join(root, "src/lib/problem/j1LevelAdapter.ts"),
  "utf8"
);
const questPageSource = fs.readFileSync(
  path.join(root, "src/app/quest/page.tsx"),
  "utf8"
);

const levelEntries = Array.from(
  adapterSource.matchAll(/levelId: "(J1-\d+)", title: "([^"]+)"/g),
  (match) => ({ levelId: match[1], title: match[2] })
);

test("J1 level adapter preserves the new curriculum order", () => {
  assert.equal(levelEntries.length, 42);
  assert.deepEqual(levelEntries.slice(0, 6), [
    { levelId: "J1-1", title: "絶対値（意味）" },
    { levelId: "J1-2", title: "絶対値（大小）" },
    { levelId: "J1-3", title: "絶対値（計算）" },
    { levelId: "J1-4", title: "負＋負" },
    { levelId: "J1-5", title: "正＋負" },
    { levelId: "J1-6", title: "負＋正" }
  ]);
  assert.equal(levelEntries.some((entry) => entry.levelId === "J1-18"), false);
  assert.deepEqual(levelEntries.slice(-5), [
    { levelId: "J1-39", title: "傾き" },
    { levelId: "J1-40", title: "切片" },
    { levelId: "J1-41", title: "切片を求める" },
    { levelId: "J1-42", title: "グラフ選択" },
    { levelId: "J1-43", title: "平行" }
  ]);
});

test("quest picker uses J1 level options instead of the legacy J1 catalog list", () => {
  assert.equal(questPageSource.includes('if (pickerGrade?.grade_id === "J1") {'), true);
  assert.equal(questPageSource.includes("return J1_LEVEL_OPTIONS.map((entry) => ({"), true);
  assert.equal(questPageSource.includes('if (levelInfo?.gradeId === "J1") {'), true);
  assert.equal(questPageSource.includes("generateJ1LevelProblems"), true);
  assert.equal(questPageSource.includes('categoryName: option?.categoryName ?? "中1カリキュラム"'), true);
});
