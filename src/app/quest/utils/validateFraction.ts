export function validateFraction(num: string, den: string) {
  if (!num || !den) return { ok: false as const, reason: "empty" as const };
  if (!/^-?\d+$/.test(num)) return { ok: false as const, reason: "num" as const };
  if (!/^-?\d+$/.test(den)) return { ok: false as const, reason: "den" as const };
  if (den === "0") return { ok: false as const, reason: "zero" as const };
  return { ok: true as const };
}
