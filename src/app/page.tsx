"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trackAnalyticsEvent } from "@/lib/analytics";

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    trackAnalyticsEvent("app_start");
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_35%,#f8fafc_100%)] px-6 py-16 text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(14,165,233,0.16),transparent_32%),radial-gradient(circle_at_85%_78%,rgba(16,185,129,0.12),transparent_30%)]"
      />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center justify-center text-center">
        <div className="rounded-[36px] border border-white/80 bg-white/90 px-8 py-12 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="text-sm font-black uppercase tracking-[0.35em] text-sky-600">MVP Release</div>
          <h1 className="mt-4 text-5xl font-black tracking-tight text-slate-900 sm:text-6xl">Math Quest</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            毎日の学習を続けやすくするための、進捗つきの算数・数学トレーニングです。
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push("/skills")}
              className="rounded-2xl bg-sky-600 px-6 py-4 text-base font-black text-white shadow-[0_10px_30px_rgba(2,132,199,0.28)] transition hover:-translate-y-0.5"
            >
              Start Learning
            </button>
            <button
              type="button"
              onClick={() => router.push("/review")}
              className="rounded-2xl border border-slate-300 bg-white px-6 py-4 text-base font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Review Weak Skills
            </button>
          </div>
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-left">
            <div className="text-sm font-bold text-slate-800">保護者向け設定</div>
            <p className="mt-1 text-sm text-slate-600">レポート配信を使う場合は、先に保護者設定を保存してください。</p>
            <button
              type="button"
              onClick={() => router.push("/guardian")}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
            >
              保護者レポート設定へ
            </button>
          </div>
          {!mounted ? <div className="mt-4 text-xs text-slate-400">Loading...</div> : null}
        </div>
      </div>
    </main>
  );
}
