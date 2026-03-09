"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStateFromClient } from "packages/learning-engine/studentStore";
import { SkillProgressBar } from "packages/ui";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { getLearningPattern } from "@/lib/learningPatternCatalog";

type WeakReviewItem = {
  patternId: string;
  title: string;
  mastery: number;
  attempts: number;
  skillTitle: string;
};

const buildWeakReviewItems = (): WeakReviewItem[] => {
  const state = loadStateFromClient();

  return Object.values(state.patternProgress)
    .filter((progress) => progress.attempts >= 2 && progress.mastery < 0.7)
    .map((progress) => {
      const pattern = getLearningPattern(progress.patternKey);

      return {
        patternId: progress.patternKey,
        title: pattern?.title ?? progress.patternKey,
        mastery: progress.mastery,
        attempts: progress.attempts,
        skillTitle: pattern?.skillTitle ?? "Review"
      };
    })
    .sort((left, right) => {
      const masteryDelta = left.mastery - right.mastery;
      if (masteryDelta !== 0) {
        return masteryDelta;
      }
      const attemptDelta = right.attempts - left.attempts;
      if (attemptDelta !== 0) {
        return attemptDelta;
      }
      return left.title.localeCompare(right.title, "ja");
    });
};

export default function ReviewPage() {
  const router = useRouter();
  const [weakItems, setWeakItems] = useState<WeakReviewItem[]>([]);

  useEffect(() => {
    setWeakItems(buildWeakReviewItems());
    trackAnalyticsEvent("review_open");
  }, []);

  const handlePractice = (patternId: string) => {
    router.push(`/quest?patternId=${encodeURIComponent(patternId)}`);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#fffaf0_40%,#f8fafc_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-600">Review</div>
          <h1 className="mt-3 text-4xl font-black text-slate-900">Weak Skills</h1>
          <p className="mt-3 text-sm text-slate-600">苦手な pattern を直接えらんで復習できます。</p>
          <div className="mt-8 space-y-4">
            {weakItems.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm font-semibold text-emerald-800">
                Weak Skills はまだありません。
              </div>
            ) : (
              weakItems.map((item) => (
                <button
                  key={item.patternId}
                  type="button"
                  onClick={() => handlePractice(item.patternId)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{item.skillTitle}</div>
                      <div className="mt-1 text-lg font-bold text-slate-900">{item.title}</div>
                    </div>
                    <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                      Practice
                    </div>
                  </div>
                  <SkillProgressBar mastery={item.mastery} />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                    <span>mastery {item.mastery.toFixed(2)}</span>
                    <span>attempts {item.attempts}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
