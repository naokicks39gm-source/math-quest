const patternFamilyMap: Record<string, string> = {
  number_count: "number_count",
  number_order: "number_order",
  number_compare: "number_compare",
  number_compose: "number_compose",
  number_decompose: "number_decompose",
  number_line: "number_line",
  add_zero: "add_zero",
  add_one: "add_one",
  add_basic: "add_basic",
  add_doubles: "add_doubles",
  add_near_doubles: "add_near_doubles",
  add_make10: "add_make10",
  add_carry: "add_carry",
  sub_basic: "sub_basic",
  sub_facts: "sub_facts",
  sub_borrow: "sub_borrow",
  fact_family: "fact_family",
  e1_num_count: "number_count",
  e1_num_order: "number_order",
  e1_num_compare: "number_compare",
  e1_num_compose: "number_compose",
  e1_num_decompose: "number_decompose",
  e1_num_line: "number_line",
  e1_add_zero: "add_zero",
  e1_add_one: "add_one",
  e1_add_basic: "add_basic",
  e1_add_doubles: "add_doubles",
  e1_add_near_doubles: "add_near_doubles",
  e1_add_make10: "add_make10",
  e1_add_carry: "add_carry",
  e1_sub_basic: "sub_basic",
  e1_sub_facts: "sub_facts",
  e1_sub_borrow: "sub_borrow",
  e1_fact_family: "fact_family"
};

export const resolvePatternFamily = (patternKey?: string): string | undefined => {
  if (!patternKey) {
    return undefined;
  }

  const normalized = patternKey.trim().toLowerCase().replaceAll("-", "_").replaceAll(".", "_");
  const segments = normalized.split("_").filter(Boolean);
  const candidates = [
    segments.slice(0, 4).join("_"),
    segments.slice(0, 3).join("_"),
    segments.slice(0, 2).join("_")
  ].filter(Boolean);
  const resolved = candidates.map((candidate) => patternFamilyMap[candidate]).find(Boolean);

  return resolved ?? candidates.at(-1) ?? normalized;
};
