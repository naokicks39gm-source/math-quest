"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GradeDef } from "@/lib/elementaryContent";
import { getCatalogGrades } from "@/lib/gradeCatalog";

const LS_LAST_TYPE_ID = "mq:last_type_id";

export default function Home() {
  const router = useRouter();
  const grades = useMemo(() => getCatalogGrades() as GradeDef[], []);
  const initialGrade = grades[0];
  const initialCategory = initialGrade?.categories[0];
  const initialType = initialCategory?.types[0];

  const [gradeId, setGradeId] = useState(initialGrade?.grade_id ?? "");
  const [categoryId, setCategoryId] = useState(initialCategory?.category_id ?? "");
  const [typeId, setTypeId] = useState(initialType?.type_id ?? "");

  const categories = useMemo(() => {
    return grades.find((g) => g.grade_id === gradeId)?.categories ?? [];
  }, [grades, gradeId]);

  const types = useMemo(() => {
    return categories.find((c) => c.category_id === categoryId)?.types ?? [];
  }, [categories, categoryId]);

  useEffect(() => {
    const savedTypeId = typeof window !== "undefined" ? localStorage.getItem(LS_LAST_TYPE_ID) : null;
    if (!savedTypeId) return;

    const foundGrade = grades.find((g) =>
      g.categories.some((c) => c.types.some((t) => t.type_id === savedTypeId))
    );
    if (!foundGrade) return;

    setGradeId(foundGrade.grade_id);
    const foundCat = foundGrade.categories.find((c) =>
      c.types.some((t) => t.type_id === savedTypeId)
    );
    if (!foundCat) return;

    setCategoryId(foundCat.category_id);
    setTypeId(savedTypeId);
  }, [grades]);

  const handleStart = () => {
    if (!typeId) return;
    localStorage.setItem(LS_LAST_TYPE_ID, typeId);
    const url = `/quest?type=${encodeURIComponent(typeId)}&category=${encodeURIComponent(categoryId)}`;
    router.push(url);
  };

  const handleStartAll = () => {
    router.push("/quest");
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-5">
        <section className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
          <h1 className="text-2xl font-black text-slate-900">Math Quest</h1>
          <div className="font-semibold text-slate-800">学習の選択と開始</div>

          <label className="block text-sm font-bold text-slate-700">
            学年
            <select
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2"
              value={gradeId}
              onChange={(e) => {
                const nextGradeId = e.target.value;
                setGradeId(nextGradeId);
                const nextGrade = grades.find((g) => g.grade_id === nextGradeId);
                const nextCategory = nextGrade?.categories[0];
                setCategoryId(nextCategory?.category_id ?? "");
                setTypeId(nextCategory?.types[0]?.type_id ?? "");
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
                const nextCategoryId = e.target.value;
                setCategoryId(nextCategoryId);
                const nextCategory = categories.find((c) => c.category_id === nextCategoryId);
                setTypeId(nextCategory?.types[0]?.type_id ?? "");
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
                  {t.display_name ?? t.type_name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleStart}
              disabled={!typeId}
              className="px-4 py-2 rounded-lg font-bold text-white bg-indigo-600 disabled:bg-slate-300"
            >
              選択した学習ではじめる
            </button>
            <button
              type="button"
              onClick={handleStartAll}
              className="px-4 py-2 rounded-lg font-bold text-indigo-700 bg-indigo-50 border border-indigo-200"
            >
              全学年まとめてはじめる
            </button>
          </div>

          <p className="text-xs text-slate-500">
            保護者レポート配信を使う場合は、下のボタンから保護者設定を先に保存してください。
          </p>
        </section>

        <section className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <button
            type="button"
            onClick={() => router.push("/guardian")}
            className="w-full py-3 rounded-lg font-bold text-white bg-slate-900"
          >
            保護者レポート設定ページへ
          </button>
        </section>
      </div>
    </main>
  );
}
