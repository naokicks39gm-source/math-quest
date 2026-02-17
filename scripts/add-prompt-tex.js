#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const gradesDir = path.join(__dirname, "..", "src", "content", "grades");

const hasJapanese = (text) => /[\u3040-\u30ff\u3400-\u9fff]/.test(text);

const normalizePromptToTex = (prompt) => {
  let s = String(prompt || "").trim();
  if (!s) return null;
  if (hasJapanese(s)) return null;

  s = s.replace(/を計算しなさい。?$/g, "").trim();
  s = s.replace(/√\s*([A-Za-z0-9]+)/g, "\\sqrt{$1}");
  s = s.replace(/sqrt\s*\(\s*([^)]+)\s*\)/gi, "\\sqrt{$1}");
  s = s.replace(/×/g, " \\times ");
  s = s.replace(/÷/g, " \\div ");
  s = s.replace(/\*/g, " \\cdot ");
  s = s.replace(/(\d+)°/g, "$1^{\\circ}");
  s = s.replace(/\blog\s*(\d+)\s*\(\s*([^)]+)\s*\)/gi, "\\log_{$1}($2)");
  s = s.replace(/\blog\s*(\d+)/g, "\\log_{$1}");
  s = s.replace(/\blog\s*\(/g, "\\log(");
  s = s.replace(/\b(sin|cos|tan)\b/gi, (m) => `\\mathrm{${m}}`);
  s = s.replace(/([A-Za-z0-9)])\s*\^\s*([A-Za-z0-9]+)/g, "$1^{$2}");
  s = s.replace(/\s+/g, " ").trim();

  return s || null;
};

const files = fs
  .readdirSync(gradesDir)
  .filter((name) => name.endsWith(".json"))
  .sort();

let total = 0;
let updated = 0;
const force = process.env.FORCE_TEX === "1";

for (const file of files) {
  const full = path.join(gradesDir, file);
  const data = JSON.parse(fs.readFileSync(full, "utf8"));
  let changed = false;

  for (const grade of data.grades || []) {
    for (const category of grade.categories || []) {
      for (const type of category.types || []) {
        for (const item of type.example_items || []) {
          total += 1;
          if (item.prompt_tex && !force) continue;
          const tex = normalizePromptToTex(item.prompt);
          if (!tex) continue;
          if (item.prompt_tex !== tex) {
            item.prompt_tex = tex;
            updated += 1;
            changed = true;
          }
        }
      }
    }
  }

  if (changed) {
    fs.writeFileSync(full, `${JSON.stringify(data, null, 2)}\n`);
    console.log(`updated ${file}`);
  }
}

console.log(`done: ${updated}/${total} prompts received prompt_tex`);
