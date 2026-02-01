"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import data from "@/content/mvp_e3_e6_types.json";
import { isSupportedType } from "@/lib/questSupport";

type AnswerFormat = {
  kind: "int" | "dec" | "frac" | "pair" | "expr";
};

type TypeDef = {
  type_id: string;
  type_name: string;
  answer_format: AnswerFormat;
  example_items: Array<{ prompt: string; answer: string }>;
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

export default function Home() {
  const router = useRouter();
  const allGrades = data.grades as GradeDef[];
  const grades = useMemo(() => {
    return allGrades
      .map((grade) => ({
        ...grade,
        categories: grade.categories
          .map((cat) => ({
            ...cat,
            types: cat.types.filter(isSupportedType)
          }))
          .filter((cat) => cat.types.length > 0)
      }))
      .filter((grade) => grade.categories.length > 0);
  }, [allGrades]);
  const LS_KEY = "mq:last_type_id";
  const [gradeId, setGradeId] = useState(grades[0]?.grade_id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [typeId, setTypeId] = useState("");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    if (saved) {
      const foundGrade = grades.find((g) =>
        g.categories.some((c) => c.types.some((t) => t.type_id === saved))
      );
      if (foundGrade) {
        setGradeId(foundGrade.grade_id);
        const foundCat = foundGrade.categories.find((c) =>
          c.types.some((t) => t.type_id === saved)
        );
        if (foundCat) {
          setCategoryId(foundCat.category_id);
          setTypeId(saved);
        }
      }
    }
  }, [grades]);

  const categories = useMemo(() => {
    return grades.find((g) => g.grade_id === gradeId)?.categories ?? [];
  }, [grades, gradeId]);

  const types = useMemo(() => {
    return categories.find((c) => c.category_id === categoryId)?.types ?? [];
  }, [categories, categoryId]);

  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].category_id);
    }
  }, [categories, categoryId]);

  useEffect(() => {
    if (types.length > 0 && !typeId) {
      setTypeId(types[0].type_id);
    }
  }, [types, typeId]);

  const handleStart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!typeId) {
      console.warn("typeId empty");
      return;
    }
    localStorage.setItem(LS_KEY, typeId);
    const url = `/quest?type=${encodeURIComponent(typeId)}&category=${encodeURIComponent(categoryId)}`;
    router.push(url);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <h1 className="text-2xl font-black text-slate-900 text-center">Math Quest</h1>
        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-700">
            学年
            <select
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2"
              value={gradeId}
              onChange={(e) => {
                setGradeId(e.target.value);
                setCategoryId("");
                setTypeId("");
              }}
            >
              {grades.map((g) => (
                <option key={g.grade_id} value={g.grade_id}>
                  {g.grade_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            カテゴリ
            <select
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setTypeId("");
              }}
            >
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            タイプ
            <select
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
            >
              {types.map((t) => (
                <option key={t.type_id} value={t.type_id}>
                  {t.type_name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={handleStart}
          disabled={!typeId}
          className="w-full py-3 rounded-lg font-bold text-white bg-indigo-600 disabled:bg-slate-300"
        >
          はじめる
        </button>
      </div>
    </main>
  );
}
