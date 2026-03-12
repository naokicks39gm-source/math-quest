const patternFamilyMap: Record<string, string> = {
  number_compare: "number_compare",
  number_compose: "number_compose",
  number_decompose: "number_decompose",
  e1_num_compare: "number_compare",
  e1_num_compose: "number_compose",
  e1_num_decompose: "number_decompose"
};

export const resolvePatternFamily = (patternKey?: string): string | undefined => {
  if (!patternKey) {
    return undefined;
  }

  const normalized = patternKey.trim().toLowerCase().replaceAll("-", "_").replaceAll(".", "_");
  const segments = normalized.split("_").filter(Boolean);
  const candidates = [
    segments.slice(0, 3).join("_"),
    segments.slice(0, 2).join("_")
  ].filter(Boolean);
  const resolved = candidates.map((candidate) => patternFamilyMap[candidate]).find(Boolean);

  return resolved ?? candidates.at(-1) ?? normalized;
};
