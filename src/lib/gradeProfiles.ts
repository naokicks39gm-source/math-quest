import { TypeDef } from "@/lib/elementaryContent";

type GradeProfile = {
  conceptTags: string[];
  keep: (type: TypeDef) => boolean;
  synthetic: TypeDef[];
};

type SyntheticAnswerKind = "int" | "dec" | "frac" | "expr";

const getPatternId = (type: TypeDef) =>
  ((type as TypeDef & { generation_params?: { pattern_id?: string } }).generation_params?.pattern_id ?? "");

const intType = (
  type_id: string,
  type_name: string,
  pattern_id: string,
  items: Array<{ prompt: string; answer: string }>
): TypeDef =>
  ({
    type_id,
    type_name,
    answer_format: { kind: "int" as SyntheticAnswerKind },
    example_items: items,
    generation_params: { pattern_id }
  } as TypeDef);

const decType = (
  type_id: string,
  type_name: string,
  pattern_id: string,
  items: Array<{ prompt: string; answer: string }>
): TypeDef =>
  ({
    type_id,
    type_name,
    answer_format: { kind: "dec" as SyntheticAnswerKind, precision: 1 },
    example_items: items,
    generation_params: { pattern_id }
  } as TypeDef);

const fracType = (
  type_id: string,
  type_name: string,
  pattern_id: string,
  items: Array<{ prompt: string; answer: string }>
): TypeDef =>
  ({
    type_id,
    type_name,
    answer_format: { kind: "frac" as SyntheticAnswerKind },
    example_items: items,
    generation_params: { pattern_id }
  } as TypeDef);

const hasPrefix = (patternId: string, prefix: string) => patternId.startsWith(prefix);

const profiles: Record<string, GradeProfile> = {
  E1: {
    conceptTags: ["number_sense", "concrete_operation"],
    keep: (type) => {
      const p = getPatternId(type);
      return hasPrefix(p, "ADD_1D_1D") || hasPrefix(p, "SUB_1D_1D") || hasPrefix(p, "SUB_2D_1D") || hasPrefix(p, "SUB_2D_2D");
    },
    synthetic: []
  },
  E2: {
    conceptTags: ["place_value", "memorization"],
    keep: (type) => {
      const p = getPatternId(type);
      return hasPrefix(p, "ADD_2D_2D") || hasPrefix(p, "SUB_2D_1D") || hasPrefix(p, "SUB_2D_2D") || hasPrefix(p, "MUL_1D_1D_") || p === "DIV_EQUAL_SHARE_BASIC";
    },
    synthetic: [
      intType("E2.NA.SUB.SUB_2D_2D_NO", "ひき算（2けた-2けた）", "SUB_2D_2D_NO", [
        { prompt: "73 - 41 =", answer: "32" },
        { prompt: "88 - 45 =", answer: "43" },
        { prompt: "64 - 22 =", answer: "42" }
      ]),
      intType("E2.NA.SUB.SUB_2D_2D_YES", "ひき算（2けた-2けた）", "SUB_2D_2D_YES", [
        { prompt: "52 - 38 =", answer: "14" },
        { prompt: "61 - 47 =", answer: "14" },
        { prompt: "70 - 56 =", answer: "14" }
      ]),
      intType("E2.NA.SUB.SUB_2D_2D_ANY", "ひき算（2けた-2けた）", "SUB_2D_2D_ANY", [
        { prompt: "84 - 42 =", answer: "42" },
        { prompt: "65 - 28 =", answer: "37" },
        { prompt: "90 - 36 =", answer: "54" }
      ]),
      intType("E2.NA.MUL.MUL_1D_1D_DAN_1", "かけ算（1けた×1けた・1の段）", "MUL_1D_1D_DAN_1", [
        { prompt: "1 × 2 =", answer: "2" },
        { prompt: "1 × 6 =", answer: "6" },
        { prompt: "1 × 9 =", answer: "9" }
      ]),
      intType("E2.NA.MUL.MUL_1D_1D_DAN_2", "かけ算（1けた×1けた・2の段）", "MUL_1D_1D_DAN_2", [
        { prompt: "2 × 3 =", answer: "6" },
        { prompt: "2 × 5 =", answer: "10" },
        { prompt: "2 × 9 =", answer: "18" }
      ]),
      intType("E2.NA.MUL.MUL_1D_1D_DAN_3", "かけ算（1けた×1けた・3の段）", "MUL_1D_1D_DAN_3", [
        { prompt: "3 × 2 =", answer: "6" },
        { prompt: "3 × 6 =", answer: "18" },
        { prompt: "3 × 9 =", answer: "27" }
      ]),
      intType("E2.NA.MUL.MUL_1D_1D_DAN_4", "かけ算（1けた×1けた・4の段）", "MUL_1D_1D_DAN_4", [
        { prompt: "4 × 2 =", answer: "8" },
        { prompt: "4 × 5 =", answer: "20" },
        { prompt: "4 × 8 =", answer: "32" }
      ]),
      intType("E2.NA.MUL.MUL_1D_1D_DAN_5", "かけ算（1けた×1けた・5の段）", "MUL_1D_1D_DAN_5", [
        { prompt: "5 × 2 =", answer: "10" },
        { prompt: "5 × 6 =", answer: "30" },
        { prompt: "5 × 9 =", answer: "45" }
      ]),
      intType("E2.NA.MUL.MUL_1D_1D_DAN_6", "かけ算（1けた×1けた・6の段）", "MUL_1D_1D_DAN_6", [
        { prompt: "6 × 2 =", answer: "12" },
        { prompt: "6 × 4 =", answer: "24" },
        { prompt: "6 × 7 =", answer: "42" }
      ]),
      intType("E2.NA.MUL.MUL_1D_1D_DAN_7", "かけ算（1けた×1けた・7の段）", "MUL_1D_1D_DAN_7", [
        { prompt: "7 × 2 =", answer: "14" },
        { prompt: "7 × 5 =", answer: "35" },
        { prompt: "7 × 8 =", answer: "56" }
      ]),
      intType("E2.NA.MUL.MUL_1D_1D_DAN_8", "かけ算（1けた×1けた・8の段）", "MUL_1D_1D_DAN_8", [
        { prompt: "8 × 2 =", answer: "16" },
        { prompt: "8 × 4 =", answer: "32" },
        { prompt: "8 × 9 =", answer: "72" }
      ]),
      intType("E2.NA.MUL.MUL_1D_1D_DAN_9", "かけ算（1けた×1けた・9の段）", "MUL_1D_1D_DAN_9", [
        { prompt: "9 × 2 =", answer: "18" },
        { prompt: "9 × 5 =", answer: "45" },
        { prompt: "9 × 8 =", answer: "72" }
      ]),
      intType("E2.NA.MUL.MUL_1D_1D_MIX_1_3", "かけ算（1けた×1けた・1〜3の段混合）", "MUL_1D_1D_MIX_1_3", [
        { prompt: "2 × 4 =", answer: "8" },
        { prompt: "3 × 7 =", answer: "21" },
        { prompt: "1 × 9 =", answer: "9" }
      ]),
      intType("E2.NA.MUL.MUL_1D_1D_MIX_4_6", "かけ算（1けた×1けた・4〜6の段混合）", "MUL_1D_1D_MIX_4_6", [
        { prompt: "4 × 7 =", answer: "28" },
        { prompt: "5 × 8 =", answer: "40" },
        { prompt: "6 × 6 =", answer: "36" }
      ]),
      intType("E2.NA.MUL.MUL_1D_1D_MIX_7_9", "かけ算（1けた×1けた・7〜9の段混合）", "MUL_1D_1D_MIX_7_9", [
        { prompt: "7 × 7 =", answer: "49" },
        { prompt: "8 × 6 =", answer: "48" },
        { prompt: "9 × 4 =", answer: "36" }
      ]),
      intType("E2.NA.MUL.MUL_1D_1D_MIX_1_9", "かけ算（1けた×1けた・1〜9の段混合）", "MUL_1D_1D_MIX_1_9", [
        { prompt: "3 × 9 =", answer: "27" },
        { prompt: "6 × 7 =", answer: "42" },
        { prompt: "8 × 5 =", answer: "40" }
      ]),
      intType("E2.NA.DIV.DIV_EQUAL_SHARE_BASIC", "わり算（等分の概念）", "DIV_EQUAL_SHARE_BASIC", [
        { prompt: "12こを 3人で 同じ数に分けると 1人何こ？", answer: "4" },
        { prompt: "10こを 2人で 同じ数に分けると 1人何こ？", answer: "5" },
        { prompt: "15こを 5人で 同じ数に分けると 1人何こ？", answer: "3" }
      ])
    ]
  },
  E3: {
    conceptTags: ["column_algorithm", "decimal_intro"],
    keep: (type) => {
      const p = getPatternId(type);
      return hasPrefix(p, "ADD_3D_3D") || hasPrefix(p, "SUB_3D_3D") || p === "MUL_2D_2D" || p === "DIV_Q1D_EXACT" || p === "DIV_Q1D_REM" || p === "DIV_Q2D_EXACT" || p === "DIV_Q2D_REM" || p === "DEC_ADD_1DP" || p === "UNIT_FRAC_BASIC";
    },
    synthetic: [
      intType("E3.NA.MUL.MUL_2D_1D_NO", "かけ算（2けた×1けた）", "MUL_2D_1D_NO", [
        { prompt: "12 × 2 =", answer: "24" },
        { prompt: "21 × 3 =", answer: "63" },
        { prompt: "32 × 2 =", answer: "64" }
      ]),
      intType("E3.NA.MUL.MUL_2D_1D_YES", "かけ算（2けた×1けた）", "MUL_2D_1D_YES", [
        { prompt: "18 × 4 =", answer: "72" },
        { prompt: "27 × 6 =", answer: "162" },
        { prompt: "39 × 3 =", answer: "117" }
      ]),
      decType("E3.NA.DEC.DEC_ADD_1DP", "小数（0.1）のたし算", "DEC_ADD_1DP", [
        { prompt: "0.4 + 0.3 =", answer: "0.7" },
        { prompt: "1.2 + 0.5 =", answer: "1.7" },
        { prompt: "2.1 + 0.8 =", answer: "2.9" }
      ]),
      fracType("E3.NA.FRAC.UNIT_FRAC_BASIC", "単位分数（値）", "UNIT_FRAC_BASIC", [
        { prompt: "1/2 + 1/2 =", answer: "1" },
        { prompt: "1/4 + 1/4 =", answer: "1/2" },
        { prompt: "1/3 + 1/3 =", answer: "2/3" }
      ])
    ]
  },
  E4: {
    conceptTags: ["large_place_value", "abstraction"],
    keep: (type) => {
      const p = getPatternId(type);
      return hasPrefix(p, "ADD_") || hasPrefix(p, "SUB_") || p === "MUL_3D_1D" || p === "DIV_3D_2D" || p === "DIV_Q3D_EXACT" || p === "DIV_Q3D_REM" || p === "DEC_MUL_INT" || p === "DEC_DIV_INT" || p === "FRAC_IMPROPER_MIXED";
    },
    synthetic: [
      intType("E4.NA.DIV.DIV_3D_2D", "わり算（3けた÷2けた）", "DIV_3D_2D", [
        { prompt: "864 ÷ 24 =", answer: "36" },
        { prompt: "735 ÷ 21 =", answer: "35" },
        { prompt: "912 ÷ 38 =", answer: "24" }
      ]),
      decType("E4.NA.DEC.DEC_MUL_INT", "小数×整数", "DEC_MUL_INT", [
        { prompt: "1.2 × 3 =", answer: "3.6" },
        { prompt: "0.8 × 5 =", answer: "4" },
        { prompt: "2.5 × 4 =", answer: "10" }
      ]),
      decType("E4.NA.DEC.DEC_DIV_INT", "小数÷整数", "DEC_DIV_INT", [
        { prompt: "3.6 ÷ 3 =", answer: "1.2" },
        { prompt: "4.8 ÷ 6 =", answer: "0.8" },
        { prompt: "7.2 ÷ 9 =", answer: "0.8" }
      ]),
      fracType("E4.NA.FRAC.FRAC_IMPROPER_MIXED", "仮分数・帯分数", "FRAC_IMPROPER_MIXED", [
        { prompt: "7/3 を 帯分数に", answer: "2 1/3" },
        { prompt: "2 1/4 を 仮分数に", answer: "9/4" },
        { prompt: "11/5 を 帯分数に", answer: "2 1/5" }
      ])
    ]
  },
  E5: {
    conceptTags: ["rational_number"],
    keep: (type) => {
      const p = getPatternId(type);
      return hasPrefix(p, "ADD_") || hasPrefix(p, "SUB_") || (hasPrefix(p, "MUL_") && p !== "MUL_1D_1D" && p !== "MUL_2D_1D" && p !== "MUL_3D_1D") || (hasPrefix(p, "DIV_") && p !== "DIV_Q1D_EXACT" && p !== "DIV_Q1D_REM" && p !== "DIV_Q2D_EXACT" && p !== "DIV_Q2D_REM" && p !== "DIV_Q3D_EXACT" && p !== "DIV_Q3D_REM") || hasPrefix(p, "DEC_") || hasPrefix(p, "FRAC_");
    },
    synthetic: [
      intType("E5.NA.MUL.MUL_3D_2D", "かけ算（3けた×2けた）", "MUL_3D_2D", [
        { prompt: "126 × 24 =", answer: "3024" },
        { prompt: "184 × 32 =", answer: "5888" },
        { prompt: "205 × 43 =", answer: "8815" }
      ]),
      decType("E5.NA.DEC.DEC_SUB_2DP", "小数のひき算", "DEC_SUB_2DP", [
        { prompt: "3.40 - 1.25 =", answer: "2.15" },
        { prompt: "5.60 - 2.45 =", answer: "3.15" },
        { prompt: "7.80 - 0.95 =", answer: "6.85" }
      ]),
      decType("E5.NA.DEC.DEC_DIV_2DP", "小数÷小数", "DEC_DIV_2DP", [
        { prompt: "6.0 ÷ 0.5 =", answer: "12" },
        { prompt: "2.4 ÷ 0.6 =", answer: "4" },
        { prompt: "7.2 ÷ 0.9 =", answer: "8" }
      ]),
      fracType("E5.NA.FRAC.FRAC_MUL_INT", "分数×整数", "FRAC_MUL_INT", [
        { prompt: "3/4 × 8 =", answer: "6" },
        { prompt: "2/5 × 15 =", answer: "6" },
        { prompt: "7/10 × 20 =", answer: "14" }
      ]),
      fracType("E5.NA.FRAC.FRAC_DIV_INT", "分数÷整数", "FRAC_DIV_INT", [
        { prompt: "3/4 ÷ 3 =", answer: "1/4" },
        { prompt: "5/6 ÷ 5 =", answer: "1/6" },
        { prompt: "8/9 ÷ 2 =", answer: "4/9" }
      ])
    ]
  },
  E6: {
    conceptTags: ["pre_algebra"],
    keep: (type) => {
      const p = getPatternId(type);
      return hasPrefix(p, "ADD_") || hasPrefix(p, "SUB_") || (hasPrefix(p, "MUL_") && p !== "MUL_2D_1D") || hasPrefix(p, "DIV_") || hasPrefix(p, "DEC_") || hasPrefix(p, "FRAC_");
    },
    synthetic: [
      fracType("E6.NA.FRAC.FRAC_MUL_FRAC", "分数×分数", "FRAC_MUL_FRAC", [
        { prompt: "2/3 × 3/4 =", answer: "1/2" },
        { prompt: "5/6 × 3/5 =", answer: "1/2" },
        { prompt: "4/7 × 14/5 =", answer: "8/5" }
      ]),
      fracType("E6.NA.FRAC.FRAC_DIV_FRAC", "分数÷分数", "FRAC_DIV_FRAC", [
        { prompt: "2/3 ÷ 4/5 =", answer: "5/6" },
        { prompt: "3/4 ÷ 9/8 =", answer: "2/3" },
        { prompt: "5/6 ÷ 1/2 =", answer: "5/3" }
      ]),
      fracType("E6.NA.FRAC.FRAC_COMMON_DENOM_REDUCE", "通分・約分", "FRAC_COMMON_DENOM_REDUCE", [
        { prompt: "2/3 と 3/5 の通分（分母15）で 2/3 =", answer: "10/15" },
        { prompt: "18/24 を 約分", answer: "3/4" },
        { prompt: "12/18 を 約分", answer: "2/3" }
      ]),
      decType("E6.NA.MIX.MIXED_DEC_FRAC", "小数分数混合", "MIXED_DEC_FRAC", [
        { prompt: "0.5 + 1/4 =", answer: "0.75" },
        { prompt: "1.2 - 1/5 =", answer: "1.0" },
        { prompt: "0.4 + 3/5 =", answer: "1.0" }
      ]),
      intType("E6.NA.MIX.MIXED_EXPRESSION", "混合計算", "MIXED_EXPRESSION", [
        { prompt: "12 + 8 × 3 =", answer: "36" },
        { prompt: "(20 - 5) ÷ 3 =", answer: "5" },
        { prompt: "18 ÷ 3 + 7 =", answer: "13" }
      ])
    ]
  }
};

const dedupeByTypeId = (types: TypeDef[]) => {
  const byId = new Map<string, TypeDef>();
  for (const type of types) {
    byId.set(type.type_id, type);
  }
  return [...byId.values()];
};

export const applyGradeProfileToNaTypes = (gradeId: string, types: TypeDef[]): TypeDef[] => {
  const profile = profiles[gradeId];
  if (!profile) return types;
  const withTags = (type: TypeDef): TypeDef => ({
    ...type,
    concept_tags: [...profile.conceptTags]
  });
  const kept = types.filter(profile.keep).map(withTags);
  const synthetic = profile.synthetic.map(withTags);
  return dedupeByTypeId([...kept, ...synthetic]);
};
