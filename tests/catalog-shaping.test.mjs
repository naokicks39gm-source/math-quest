import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(process.cwd(), p), "utf8"));
const gradeFiles = [
  "e1",
  "e2",
  "e3",
  "e4",
  "e5",
  "e6",
  "j1",
  "j2",
  "j3",
  "h1",
  "h2",
  "h3"
].map((id) => `src/content/grades/mathquest_${id}_types_v1.json`);
const raw = {
  grades: gradeFiles.flatMap((file) => readJson(file).grades ?? [])
};

const getConditionSuffix = (typeId) => {
  const match = typeId.match(/_(NO|YES|ANY)$/);
  return match ? match[1] : null;
};

const getConditionLabel = (typeId) => {
  const suffix = getConditionSuffix(typeId);
  if (!suffix) return null;
  if (typeId.includes(".ADD.")) {
    if (suffix === "NO") return "繰り上がりなし";
    if (suffix === "YES") return "繰り上がりあり";
    return "繰り上がりあり/なし";
  }
  if (typeId.includes(".SUB.")) {
    if (suffix === "NO") return "繰り下がりなし";
    if (suffix === "YES") return "繰り下がりあり";
    return "繰り下がりあり/なし";
  }
  return null;
};

const getAnswerDigitsLabel = (typeId) => {
  if (!typeId.includes("ADD_1D_1D_")) return null;
  const suffix = getConditionSuffix(typeId);
  if (suffix === "NO") return "答え1桁";
  if (suffix === "YES") return "答え2桁";
  if (suffix === "ANY") return "答え1〜2桁";
  return null;
};

const buildDisplayName = (type) => {
  const labels = [getConditionLabel(type.type_id)];
  const answerDigits = getAnswerDigitsLabel(type.type_id);
  if (answerDigits) labels.push(answerDigits);
  const parts = labels.filter(Boolean);
  if (parts.length === 0) return `${type.type_name}（${type.type_id}）`;
  return `${type.type_name}（${parts.join("・")}）`;
};

const getGradeIdFromTypeId = (typeId) => {
  const [gradeId] = typeId.split(".");
  return gradeId || "UNK";
};

const deriveCatalog = () => {
  return (raw.grades ?? [])
    .map((grade) => {
      const gradeLevelCounters = new Map();
      const categories = (grade.categories ?? [])
        .filter((category) => category.category_id !== "GE")
        .map((category) => {
          const nonEmptyTypes = (category.types ?? []).filter((type) => (type.example_items ?? []).length > 0);
          const counts = new Map();
          for (const type of nonEmptyTypes) {
            counts.set(type.type_name, (counts.get(type.type_name) ?? 0) + 1);
          }
          const disambiguatedTypes = nonEmptyTypes.map((type) => {
            if ((counts.get(type.type_name) ?? 0) <= 1) return type;
            return {
              ...type,
              display_name: buildDisplayName(type)
            };
          });
          const types = disambiguatedTypes.map((type) => {
            const gradeId = getGradeIdFromTypeId(type.type_id) || grade.grade_id;
            const next = (gradeLevelCounters.get(gradeId) ?? 0) + 1;
            gradeLevelCounters.set(gradeId, next);
            const level = `Lv:${gradeId}-${next}`;
            return {
              ...type,
              display_name: `${level} ${type.display_name ?? type.type_name}`
            };
          });
          return {
            ...category,
            types
          };
        })
        .filter((category) => category.types.length > 0);
      return {
        ...grade,
        categories
      };
    })
    .filter((grade) => grade.categories.length > 0);
};

test("catalog excludes geometry category across all grades", () => {
  const catalog = deriveCatalog();
  for (const grade of catalog) {
    assert.equal(
      grade.categories.some((category) => category.category_id === "GE"),
      false,
      `GE category should be excluded for ${grade.grade_id}`
    );
  }
});

test("display names are unique within each grade/category", () => {
  const catalog = deriveCatalog();
  for (const grade of catalog) {
    for (const category of grade.categories) {
      const names = category.types.map((type) => type.display_name ?? type.type_name);
      const unique = new Set(names);
      assert.equal(
        unique.size,
        names.length,
        `Type labels must be unique in ${grade.grade_id}.${category.category_id}`
      );
    }
  }
});

test("1-digit + 1-digit labels include carry and answer-digit information", () => {
  const catalog = deriveCatalog();
  const e1 = catalog.find((grade) => grade.grade_id === "E1");
  assert.ok(e1, "E1 grade must exist");
  const na = e1.categories.find((category) => category.category_id === "NA");
  assert.ok(na, "E1.NA category must exist");

  const byId = Object.fromEntries(na.types.map((type) => [type.type_id, type]));
  assert.match(byId["E1.NA.ADD.ADD_1D_1D_NO"].display_name, /^Lv:E1-\d+ たし算（1けた\+1けた）（繰り上がりなし・答え1桁）$/);
  assert.match(byId["E1.NA.ADD.ADD_1D_1D_YES"].display_name, /^Lv:E1-\d+ たし算（1けた\+1けた）（繰り上がりあり・答え2桁）$/);
  assert.match(byId["E1.NA.ADD.ADD_1D_1D_ANY"].display_name, /^Lv:E1-\d+ たし算（1けた\+1けた）（繰り上がりあり\/なし・答え1〜2桁）$/);
});

test("1-digit - 1-digit has a single type label", () => {
  const catalog = deriveCatalog();
  const e1 = catalog.find((grade) => grade.grade_id === "E1");
  assert.ok(e1, "E1 grade must exist");
  const na = e1.categories.find((category) => category.category_id === "NA");
  assert.ok(na, "E1.NA category must exist");

  const byId = Object.fromEntries(na.types.map((type) => [type.type_id, type]));
  assert.ok(byId["E1.NA.SUB.SUB_1D_1D_ANY"], "single 1-digit subtraction type should exist");
  assert.equal(Boolean(byId["E1.NA.SUB.SUB_1D_1D_NO"]), false);
  assert.equal(Boolean(byId["E1.NA.SUB.SUB_1D_1D_YES"]), false);
  assert.match(byId["E1.NA.SUB.SUB_1D_1D_ANY"].display_name, /^Lv:E1-\d+ ひき算（1けた-1けた）$/);
});

test("display names include Lv prefix and grade-local sequence numbers", () => {
  const catalog = deriveCatalog();
  for (const grade of catalog) {
    const indexes = [];
    for (const category of grade.categories) {
      for (const type of category.types) {
        const m = (type.display_name ?? "").match(/^Lv:([A-Z]\d)-(\d+)\s/);
        assert.ok(m, `display_name should start with Lv for ${type.type_id}`);
        assert.equal(m[1], grade.grade_id, `grade id in Lv prefix should match ${grade.grade_id}`);
        indexes.push(Number(m[2]));
      }
    }
    const sorted = [...indexes].sort((a, b) => a - b);
    const expected = Array.from({ length: sorted.length }, (_, i) => i + 1);
    assert.deepEqual(sorted, expected, `Lv numbering should be contiguous within ${grade.grade_id}`);
  }
});
