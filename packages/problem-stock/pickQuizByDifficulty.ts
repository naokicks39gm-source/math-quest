import type { GeneratedProblem } from "packages/problem-engine";

const shuffle = <T>(arr: T[], rng: () => number): T[] => {
  const copied = [...arr];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const temp = copied[i];
    copied[i] = copied[j];
    copied[j] = temp;
  }
  return copied;
};

const normalizeDifficulty = (difficulty: unknown): number => {
  if (typeof difficulty !== "number") return 3;
  if (difficulty < 1) return 1;
  if (difficulty > 5) return 5;
  return difficulty;
};

export function pickQuizByDifficulty(
  stock: GeneratedProblem[],
  targetDifficulty: number,
  count: number,
  rng: () => number = Math.random
): GeneratedProblem[] {
  if (!Array.isArray(stock) || stock.length === 0 || count <= 0) {
    return [];
  }

  if (stock.length < count) {
    return shuffle(stock, rng).slice(0, count);
  }

  const target = normalizeDifficulty(targetDifficulty);
  const buckets = new Map<number, GeneratedProblem[]>();

  for (const problem of stock) {
    const difficulty = normalizeDifficulty(problem.meta?.difficulty);
    const distance = Math.abs(difficulty - target);
    const bucket = buckets.get(distance);
    if (bucket) {
      bucket.push(problem);
      continue;
    }
    buckets.set(distance, [problem]);
  }

  const distances = Array.from(buckets.keys()).sort((a, b) => a - b);
  const result: GeneratedProblem[] = [];
  const used = new Set<string>();

  for (const distance of distances) {
    const bucket = buckets.get(distance) ?? [];
    for (const problem of shuffle(bucket, rng)) {
      if (used.has(problem.id)) continue;
      result.push(problem);
      used.add(problem.id);
      if (result.length === count) {
        return result;
      }
    }
  }

  return result;
}
