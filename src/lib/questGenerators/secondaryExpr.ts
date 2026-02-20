import type { QuestEntry } from "@/lib/questItemFactory";

type StockTypeLike = QuestEntry["type"];

const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

const normalizeSpaces = (value: string) => value.replace(/\s+/g, " ").trim();

const extractVariableCandidates = (type: StockTypeLike) => {
  const params = (type.generation_params ?? {}) as Record<string, unknown>;
  const fromParams = Array.isArray(params.vars)
    ? params.vars.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
  const defaults = ["a", "x", "y", "b", "m", "n"];
  return [...new Set([...fromParams, ...defaults])];
};

const detectPrimaryVar = (text: string, fallback = "x") => {
  const hits = text.match(/[a-zA-Z]/g) ?? [];
  return hits[0] ?? fallback;
};

const replaceSingleVariable = (text: string, from: string, to: string) =>
  text.replace(new RegExp(`\\b${from}\\b`, "g"), to);

export const generateExpRulesEntries = (type: StockTypeLike, targetCount: number, maxAttempts = 5000): QuestEntry[] => {
  const out: QuestEntry[] = [];
  const seen = new Set<string>();
  const vars = extractVariableCandidates(type);
  let attempts = 0;
  while (out.length < targetCount && attempts < maxAttempts) {
    attempts += 1;
    const variable = vars[attempts % vars.length] ?? "a";
    const ruleKind = attempts % 3;
    if (ruleKind === 0) {
      const p = randInt(2, 9);
      const q = randInt(2, 9);
      const prompt = `${variable}^${p} * ${variable}^${q} =`;
      const promptTex = `${variable}^{${p}} \\cdot ${variable}^{${q}} =`;
      const answer = `${variable}^${p + q}`;
      const key = `${prompt}::${answer}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ type, item: { prompt, prompt_tex: promptTex, answer } });
      continue;
    }
    if (ruleKind === 1) {
      const q = randInt(2, 7);
      const diff = randInt(1, 6);
      const p = q + diff;
      const prompt = `${variable}^${p} / ${variable}^${q} =`;
      const promptTex = `${variable}^{${p}} / ${variable}^{${q}} =`;
      const answer = `${variable}^${diff}`;
      const key = `${prompt}::${answer}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ type, item: { prompt, prompt_tex: promptTex, answer } });
      continue;
    }
    const inner = randInt(2, 6);
    const outer = randInt(2, 5);
    const prompt = `(${variable}^${inner})^${outer} =`;
    const promptTex = `(${variable}^{${inner}})^{${outer}} =`;
    const answer = `${variable}^${inner * outer}`;
    const key = `${prompt}::${answer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type, item: { prompt, prompt_tex: promptTex, answer } });
  }
  return out;
};

export const remixSecondaryExprFromSeed = (type: StockTypeLike, targetCount: number): QuestEntry[] => {
  const out: QuestEntry[] = [];
  const seen = new Set<string>();
  const vars = extractVariableCandidates(type);
  const seed = type.example_items ?? [];
  for (const base of seed) {
    const basePrompt = String(base.prompt_tex ?? base.prompt);
    const baseAnswer = String(base.answer);
    const primary = detectPrimaryVar(basePrompt, vars[0] ?? "x");
    for (const replacement of vars) {
      const promptTex = normalizeSpaces(replaceSingleVariable(basePrompt, primary, replacement));
      const prompt = normalizeSpaces(replaceSingleVariable(String(base.prompt), primary, replacement));
      const answer = normalizeSpaces(replaceSingleVariable(baseAnswer, primary, replacement));
      const key = `${prompt}::${answer}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        type,
        item: {
          prompt,
          prompt_tex: promptTex,
          answer
        }
      });
      if (out.length >= targetCount) return out;
    }
  }
  return out;
};
