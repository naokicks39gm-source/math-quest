"use client";

import { useRouter } from "next/navigation";

export default function JuniorHome() {
  const router = useRouter();
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-300 bg-white p-6 shadow-sm space-y-4">
        <h1 className="text-2xl font-black text-slate-900">中学校コース</h1>
        <p className="text-sm text-slate-700">中学生向けの学習を開始します。</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push("/quest")}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white"
          >
            クエスト開始
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-bold text-slate-800"
          >
            トップへ戻る
          </button>
        </div>
      </section>
    </main>
  );
}
