"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GradeDef } from "@/lib/elementaryContent";
import { getCatalogGrades } from "@/lib/gradeCatalog";

const LS_LAST_TYPE_ID = "mq:last_type_id";

export default function Home() {
  const router = useRouter();
  const grades = useMemo(() => getCatalogGrades() as GradeDef[], []);

  const [gradeId, setGradeId] = useState(grades[0]?.grade_id ?? "");
  const [typeId, setTypeId] = useState("");
  const [mounted, setMounted] = useState(false);

  const grade = useMemo(() => {
    return grades.find((g) => g.grade_id === gradeId) ?? null;
  }, [grades, gradeId]);

  const problems = useMemo(() => {
    if (!grade) return [];
    return grade.categories.flatMap((category) =>
      category.types.map((type) => ({
        ...type,
        category_id: category.category_id
      }))
    );
  }, [grade]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const savedTypeId = typeof window !== "undefined" ? localStorage.getItem(LS_LAST_TYPE_ID) : null;
    if (!savedTypeId) return;

    const foundGrade = grades.find((g) =>
      g.categories.some((c) => c.types.some((t) => t.type_id === savedTypeId))
    );
    if (!foundGrade) return;

    setGradeId(foundGrade.grade_id);
    setTypeId(savedTypeId);
  }, [grades]);

  useEffect(() => {
    if (problems.length > 0 && !typeId) {
      setTypeId(problems[0].type_id);
    }
  }, [problems, typeId]);

  const handleStart = () => {
    if (!typeId) return;
    const selected = problems.find((problem) => problem.type_id === typeId);
    if (!selected) return;
    localStorage.setItem(LS_LAST_TYPE_ID, typeId);
    const run = Date.now().toString(36);
    const url = `/quest?type=${encodeURIComponent(typeId)}&category=${encodeURIComponent(selected.category_id)}&run=${encodeURIComponent(run)}`;
    router.push(url);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-100 via-slate-200 to-slate-100 text-slate-900 flex items-center justify-center p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_12%_14%,rgba(148,163,184,0.22),transparent_38%),radial-gradient(circle_at_88%_82%,rgba(148,163,184,0.18),transparent_36%),repeating-linear-gradient(135deg,rgba(148,163,184,0.06)_0px,rgba(148,163,184,0.06)_1px,transparent_1px,transparent_10px)]"
      />
      <div className="relative z-10 w-full max-w-3xl space-y-5">
        <section className="w-full bg-white/90 border border-slate-300/80 rounded-2xl p-6 shadow-[0_10px_30px_rgba(15,23,42,0.10)] backdrop-blur-sm space-y-3">
          <h1 className="text-2xl font-black text-slate-900">Math Quest</h1>
          <div className="font-semibold text-slate-800">学習の選択と開始</div>

          <label className="block text-sm font-bold text-slate-700">
            学年
            {mounted ? (
              <select
                className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2"
                value={gradeId}
                onChange={(e) => {
                  setGradeId(e.target.value);
                  setTypeId("");
                }}
              >
                {grades.map((g) => (
                  <option key={g.grade_id} value={g.grade_id}>
                    {g.grade_name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mt-1 h-10 w-full border border-slate-300 rounded-md bg-slate-100" />
            )}
          </label>

          <label className="block text-sm font-bold text-slate-700">
            問題
            {mounted ? (
              <select
                className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2"
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
              >
                {problems.map((t) => (
                  <option key={t.type_id} value={t.type_id}>
                    {t.display_name ?? t.type_name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mt-1 h-10 w-full border border-slate-300 rounded-md bg-slate-100" />
            )}
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleStart}
              disabled={!typeId}
              className="px-4 py-2 rounded-lg font-bold text-white bg-indigo-600 disabled:bg-slate-300"
            >
              スタート！
            </button>
          </div>

          <p className="text-xs text-slate-500">
            保護者レポート配信を使う場合は、下のボタンから保護者設定を先に保存してください。
          </p>
        </section>

        <section className="w-full bg-white/88 border border-slate-300/75 rounded-2xl p-6 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm space-y-3">
          <div className="font-semibold text-slate-800">保護者レポート設定</div>
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
