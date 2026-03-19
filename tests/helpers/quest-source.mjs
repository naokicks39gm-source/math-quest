import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "src/app/quest");

const walk = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (!/\.(ts|tsx)(\.bak-.+)?$/.test(entry.name)) return [];
    return [fullPath];
  });
};

export const readQuestSource = () =>
  walk(root)
    .sort()
    .map((filePath) => fs.readFileSync(filePath, "utf8"))
    .join("\n\n");
