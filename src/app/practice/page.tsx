"use client";

import { useMemo, useState } from "react";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import data from "@/content/mathquest_all_grades_from_split_v1";

type AnswerFormat = {
  kind: "int" | "dec" | "frac" | "pair" | "expr";
  precision?: number;
  suffix?: string;
  pair_kind?: "quotient_remainder" | "ratio";
  separator?: string;
  form?: string;
};

type ExampleItem = {
  prompt: string;
  prompt_tex?: string;
  answer: string;
};

type TypeDef = {
  type_id: string;
  type_name: string;
  answer_format: AnswerFormat;
  example_items: ExampleItem[];
};

type CategoryDef = {
  category_id: string;
  category_name: string;
  types: TypeDef[];
};

type GradeDef = {
  grade_id: string;
  grade_name: string;
  categories: CategoryDef[];
};

const gcd = (a: number, b: number) => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
};

const normalizeFrac = (input: string) => {
  const cleaned = input.replace(/\s+/g, "");
  const match = cleaned.match(/^(-?\d+)\/(-?\d+)$/);
  if (!match) return null;
  let num = parseInt(match[1], 10);
  let den = parseInt(match[2], 10);
  if (den === 0) return null;
  if (den < 0) {
    den *= -1;
    num *= -1;
  }
  const d = gcd(num, den);
  return `${num / d}/${den / d}`;
};

const normalizeDecimal = (input: string, precision: number) => {
  const cleaned = input.replace(/\s+/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (Number.isNaN(value)) return null;
  return value.toFixed(precision);
};

const normalizePair = (input: string, kind: AnswerFormat["pair_kind"], separator = ",") => {
  const cleaned = input.replace(/\s+/g, "");
  const sep = cleaned.includes(":") ? ":" : separator;
  const parts = cleaned.split(sep);
  if (parts.length !== 2) return null;
  const a = parseInt(parts[0], 10);
  const b = parseInt(parts[1], 10);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  if (kind === "ratio") {
    const d = gcd(a, b);
    return `${a / d}${separator}${b / d}`;
  }
  return `${a}${separator}${b}`;
};

const normalizeExpr = (input: string) => {
  return input.replace(/\s+/g, "").replace(/×/g, "*");
};

const renderPrompt = (item: ExampleItem) => {
  const tex = item.prompt_tex?.trim();
  if (tex) {
    return <InlineMath math={tex} renderError={() => <span>{item.prompt}</span>} />;
  }
  return <span>{item.prompt}</span>;
};

const judgeAnswer = (userInput: string, answer: string, format: AnswerFormat) => {
  const inputRaw = userInput.trim();
  if (inputRaw === "") return { ok: false, normalized: "" };

  if (format.kind === "int") {
    const value = Number(inputRaw);
    const target = Number(answer);
    return { ok: Number.isFinite(value) && value === target, normalized: String(value) };
  }

  if (format.kind === "dec") {
    const precision = format.precision ?? 0;
    const suffix = format.suffix ?? "";
    const input = inputRaw.endsWith(suffix) ? inputRaw.slice(0, -suffix.length) : inputRaw;
    const normalizedInput = normalizeDecimal(input, precision);
    const normalizedAnswer = normalizeDecimal(answer.replace(suffix, ""), precision);
    return { ok: normalizedInput !== null && normalizedInput === normalizedAnswer, normalized: normalizedInput ?? "" };
  }

  if (format.kind === "frac") {
    const normalizedInput = normalizeFrac(inputRaw);
    const normalizedAnswer = normalizeFrac(answer);
    return { ok: normalizedInput !== null && normalizedInput === normalizedAnswer, normalized: normalizedInput ?? "" };
  }

  if (format.kind === "pair") {
    const separator = format.separator ?? ",";
    const normalizedInput = normalizePair(inputRaw, format.pair_kind, separator);
    const normalizedAnswer = normalizePair(answer, format.pair_kind, separator);
    return { ok: normalizedInput !== null && normalizedInput === normalizedAnswer, normalized: normalizedInput ?? "" };
  }

  if (format.kind === "expr") {
    const normalizedInput = normalizeExpr(inputRaw);
    const normalizedAnswer = normalizeExpr(answer);
    return { ok: normalizedInput === normalizedAnswer, normalized: normalizedInput };
  }

  return { ok: false, normalized: "" };
};

export default function PracticePage() {
  const grades = data.grades as GradeDef[];
  const [selectedType, setSelectedType] = useState<TypeDef | null>(grades[0]?.categories[0]?.types[0] ?? null);
  const [itemIndex, setItemIndex] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{ ok: boolean; correctAnswer: string } | null>(null);

  const currentItem = useMemo(() => {
    if (!selectedType || selectedType.example_items.length === 0) return null;
    return selectedType.example_items[itemIndex % selectedType.example_items.length];
  }, [selectedType, itemIndex]);

  const handleSelectType = (type: TypeDef) => {
    setSelectedType(type);
    setItemIndex(0);
    setInput("");
    setResult(null);
  };

  const handleJudge = () => {
    if (!selectedType || !currentItem) return;
    const verdict = judgeAnswer(input, currentItem.answer, selectedType.answer_format);
    setResult({ ok: verdict.ok, correctAnswer: currentItem.answer });
  };

  const handleNext = () => {
    setItemIndex((prev) => prev + 1);
    setInput("");
    setResult(null);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">
        <aside className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h1 className="text-lg font-bold mb-4">学年 → カテゴリ → タイプ</h1>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {grades.map((grade) => (
              <div key={grade.grade_id}>
                <div className="font-bold text-slate-700">{grade.grade_name}</div>
                <div className="mt-2 space-y-2">
                  {grade.categories.map((cat) => (
                    <div key={cat.category_id} className="pl-2">
                      <div className="text-sm font-semibold text-slate-600">{cat.category_name}</div>
                      <div className="mt-1 space-y-1">
                        {cat.types.map((type) => (
                          <button
                            key={type.type_id}
                            onClick={() => handleSelectType(type)}
                            className={`block w-full text-left text-sm rounded-md px-2 py-1 transition ${
                              selectedType?.type_id === type.type_id
                                ? "bg-indigo-100 text-indigo-700"
                                : "hover:bg-slate-100 text-slate-700"
                            }`}
                          >
                            {type.type_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="mb-4">
            <div className="text-sm text-slate-500">選択タイプ</div>
            <div className="text-lg font-bold">{selectedType?.type_name ?? "未選択"}</div>
          </div>

          {currentItem ? (
            <>
              <div className="mb-6">
                <div className="text-sm text-slate-500 mb-1">問題</div>
                <div className="text-xl font-bold">{renderPrompt(currentItem)}</div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
                <div className="w-full md:w-2/3">
                  <label className="text-sm text-slate-500">解答</label>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2"
                    placeholder="例: 12 / 3.50 / 2/3 / 8,3 / 2:3"
                  />
                </div>
                <button
                  onClick={handleJudge}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md font-bold"
                >
                  判定
                </button>
                <button
                  onClick={handleNext}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md font-bold"
                >
                  次の問題
                </button>
              </div>

              {result && (
                <div className={`mt-4 rounded-md border px-3 py-2 ${result.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                  <div className="font-bold">{result.ok ? "正解！" : "不正解"}</div>
                  <div className="text-sm text-slate-700">正答: {result.correctAnswer}</div>
                </div>
              )}
            </>
          ) : (
            <div className="text-slate-500">タイプを選択してください。</div>
          )}
        </section>
      </div>
    </main>
  );
}
