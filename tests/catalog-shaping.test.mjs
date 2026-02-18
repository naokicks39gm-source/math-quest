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
const excludedTypeIds = new Set([
  "E1.ME.TIME.TIME_MIN",
  "E1.RE.CMP.CMP_SIGN"
]);

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
    return "繰り上がり";
  }
  if (typeId.includes(".MUL.")) {
    if (suffix === "NO") return "繰り上がりなし";
    if (suffix === "YES") return "繰り上がりあり";
    return "繰り上がり";
  }
  if (typeId.includes(".SUB.")) {
    if (suffix === "NO") return "繰り下がりなし";
    if (suffix === "YES") return "繰り下がりあり";
    return "繰り下がり";
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

const buildCrossGradeDedupeKey = (type) => {
  const gp = type.generation_params ?? {};
  if (gp.pattern_id) {
    return JSON.stringify({
      answer_kind: type.answer_format?.kind,
      pattern_id: gp.pattern_id
    });
  }
  return JSON.stringify({
    answer_kind: type.answer_format?.kind,
    a_digits: gp.a_digits,
    b_digits: gp.b_digits,
    carry: gp.carry,
    borrow: gp.borrow,
    decimal_places: gp.decimal_places,
    allow_remainder: gp.allow_remainder,
    quotient_digits: gp.quotient_digits,
    operation: gp.operation
  });
};

const deriveCatalog = () => {
  const shaped = (raw.grades ?? [])
    .map((grade) => {
      const categories = (grade.categories ?? [])
        .filter((category) => category.category_id !== "GE")
        .map((category) => {
          const nonEmptyTypes = (category.types ?? []).filter(
            (type) =>
              (type.example_items ?? []).length > 0 &&
              !excludedTypeIds.has(type.type_id)
          );
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
            return {
              ...type
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

  const seenNaKeys = new Set();
  const deduped = shaped.map((grade) => ({
    ...grade,
    categories: grade.categories
      .map((category) => {
        if (category.category_id !== "NA") return category;
        const types = category.types.filter((type) => {
          const key = buildCrossGradeDedupeKey(type);
          if (seenNaKeys.has(key)) return false;
          seenNaKeys.add(key);
          return true;
        });
        return { ...category, types };
      })
      .filter((category) => category.types.length > 0)
  }));

  return deduped
    .map((grade) => {
      const gradeLevelCounters = new Map();
      const categories = grade.categories.map((category) => ({
        ...category,
        types: category.types.map((type) => {
          const gradeId = getGradeIdFromTypeId(type.type_id) || grade.grade_id;
          const next = (gradeLevelCounters.get(gradeId) ?? 0) + 1;
          gradeLevelCounters.set(gradeId, next);
          const level = `Lv:${gradeId}-${next}`;
          return {
            ...type,
            display_name: `${level} ${type.display_name ?? type.type_name}`
          };
        })
      }));
      return { ...grade, categories };
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
  assert.match(byId["E1.NA.ADD.ADD_1D_1D_ANY"].display_name, /^Lv:E1-\d+ たし算（1けた\+1けた）（繰り上がり・答え1〜2桁）$/);
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

test("E1 2-digit - 2-digit labels include borrow condition information", () => {
  const catalog = deriveCatalog();
  const e1 = catalog.find((grade) => grade.grade_id === "E1");
  assert.ok(e1, "E1 grade must exist");
  const na = e1.categories.find((category) => category.category_id === "NA");
  assert.ok(na, "E1.NA category must exist");
  const byId = Object.fromEntries(na.types.map((type) => [type.type_id, type]));
  assert.match(byId["E1.NA.SUB.SUB_2D_2D_NO"].display_name, /^Lv:E1-\d+ ひき算（2けた-2けた）（繰り下がりなし）$/);
  assert.match(byId["E1.NA.SUB.SUB_2D_2D_YES"].display_name, /^Lv:E1-\d+ ひき算（2けた-2けた）（繰り下がりあり）$/);
  assert.match(byId["E1.NA.SUB.SUB_2D_2D_ANY"].display_name, /^Lv:E1-\d+ ひき算（2けた-2けた）（繰り下がり）$/);
});

test("E2 2-digit + 2-digit labels include carry condition information", () => {
  const catalog = deriveCatalog();
  const e2 = catalog.find((grade) => grade.grade_id === "E2");
  assert.ok(e2, "E2 grade must exist");
  const na = e2.categories.find((category) => category.category_id === "NA");
  assert.ok(na, "E2.NA category must exist");
  const byId = Object.fromEntries(na.types.map((type) => [type.type_id, type]));
  assert.match(byId["E2.NA.ADD.ADD_2D_2D_NO"].display_name, /^Lv:E2-\d+ たし算（2けた\+2けた）（繰り上がりなし）$/);
  assert.match(byId["E2.NA.ADD.ADD_2D_2D_YES"].display_name, /^Lv:E2-\d+ たし算（2けた\+2けた）（繰り上がりあり）$/);
  assert.match(byId["E2.NA.ADD.ADD_2D_2D_ANY"].display_name, /^Lv:E2-\d+ たし算（2けた\+2けた）（繰り上がり）$/);
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

test("catalog excludes E1 time conversion and comparison types", () => {
  const catalog = deriveCatalog();
  const allTypeIds = catalog.flatMap((grade) =>
    grade.categories.flatMap((category) => category.types.map((type) => type.type_id))
  );
  assert.equal(allTypeIds.includes("E1.ME.TIME.TIME_MIN"), false);
  assert.equal(allTypeIds.includes("E1.RE.CMP.CMP_SIGN"), false);
});

test("cross-grade identical NA types are removed from upper grades", () => {
  const catalog = deriveCatalog();
  const e2 = catalog.find((grade) => grade.grade_id === "E2");
  const e3 = catalog.find((grade) => grade.grade_id === "E3");
  const e4 = catalog.find((grade) => grade.grade_id === "E4");
  const e5 = catalog.find((grade) => grade.grade_id === "E5");
  assert.ok(e2, "E2 grade must exist");
  assert.ok(e3, "E3 grade must exist");
  assert.ok(e4, "E4 grade must exist");
  assert.ok(e5, "E5 grade must exist");
  const e2na = e2.categories.find((category) => category.category_id === "NA");
  const e3na = e3.categories.find((category) => category.category_id === "NA");
  const e4na = e4.categories.find((category) => category.category_id === "NA");
  const e5na = e5.categories.find((category) => category.category_id === "NA");
  assert.ok(e2na, "E2.NA category must exist");
  assert.ok(e3na, "E3.NA category must exist");
  assert.ok(e4na, "E4.NA category must exist");
  assert.ok(e5na, "E5.NA category must exist");
  const e2Ids = new Set(e2na.types.map((type) => type.type_id));
  const e3Ids = new Set(e3na.types.map((type) => type.type_id));
  const e4Ids = new Set(e4na.types.map((type) => type.type_id));
  const e5Ids = new Set(e5na.types.map((type) => type.type_id));
  assert.ok(e2Ids.has("E2.NA.ADD.ADD_2D_2D_NO"));
  assert.ok(e3Ids.has("E3.NA.MUL.MUL_1D_1D"));
  assert.equal(e4Ids.has("E4.NA.ADD.ADD_2D_2D_NO"), false);
  assert.equal(e5Ids.has("E5.NA.ADD.ADD_2D_2D_NO"), false);
  assert.equal(e5Ids.has("E5.NA.MUL.MUL_1D_1D"), false);
  assert.ok(e5Ids.has("E5.NA.DEC.DEC_ADD_2DP"));
});
