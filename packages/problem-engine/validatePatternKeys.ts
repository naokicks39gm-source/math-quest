import { patternIndex } from "./patternIndex.ts";

const keys = new Set<string>();

for (const pattern of patternIndex) {
  if (typeof pattern.key !== "string") {
    console.error("INVALID KEY TYPE", pattern.key);
    process.exit(1);
  }

  if (!pattern.key.trim()) {
    console.error("EMPTY KEY", pattern.key);
    process.exit(1);
  }

  if (keys.has(pattern.key)) {
    console.error("DUPLICATE KEY", pattern.key);
    process.exit(1);
  }

  keys.add(pattern.key);
}

console.log("KEY VALIDATION OK");
