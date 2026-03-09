"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SkillList, type SkillCardItem } from "packages/ui";
import { loadStateFromClient } from "packages/learning-engine/studentStore";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { practiceSkills } from "@/lib/learningSkillCatalog";
import { readDailyStreak, type DailyStreak } from "@/lib/streak";
import { readXp, type StoredXp } from "@/lib/xp";

const getSkillBucket = (mastery: number) => {
  if (mastery >= 0.75) {
    return "mastered";
  }

  if (mastery > 0) {
    return "learning";
  }

  return "not_started";
};

const getSkillSortRank = (mastery: number) => {
  const bucket = getSkillBucket(mastery);

  if (bucket === "learning") {
    return 0;
  }

  if (bucket === "not_started") {
    return 1;
  }

  return 2;
};

const buildSkillItems = (): SkillCardItem[] => {
  const state = loadStateFromClient();

  return practiceSkills
    .map((skill) => {
      const progress = state.skillProgress[skill.id];
      const mastery = progress?.mastery ?? 0;

      return {
        id: skill.id,
        code: skill.code,
        title: skill.title,
        grade: skill.grade,
        mastery,
        mastered: progress?.mastered ?? false
      };
    })
    .sort((left, right) => {
      const rankDelta = getSkillSortRank(left.mastery ?? 0) - getSkillSortRank(right.mastery ?? 0);

      if (rankDelta !== 0) {
        return rankDelta;
      }

      const leftBucket = getSkillBucket(left.mastery ?? 0);
      const rightBucket = getSkillBucket(right.mastery ?? 0);

      if (leftBucket === "learning" && rightBucket === "learning") {
        return (left.mastery ?? 0) - (right.mastery ?? 0);
      }

      return left.title.localeCompare(right.title, "ja");
    });
};

const getRecommendedSkill = (items: SkillCardItem[]) =>
  items
    .filter((skill) => (skill.mastery ?? 0) < 0.75)
    .sort((left, right) => {
      const masteryDelta = (left.mastery ?? 0) - (right.mastery ?? 0);
      if (masteryDelta !== 0) {
        return masteryDelta;
      }
      return left.title.localeCompare(right.title, "ja");
    })[0] ?? null;

export default function SkillsPage() {
  const router = useRouter();
  const [streak, setStreak] = useState<DailyStreak | null>(null);
  const [xp, setXp] = useState<StoredXp>({ totalXp: 0 });
  const [skills, setSkills] = useState<SkillCardItem[]>(() =>
    practiceSkills.map((skill) => ({
      id: skill.id,
      code: skill.code,
      title: skill.title,
      grade: skill.grade,
      mastery: 0,
      mastered: false
    }))
  );

  useEffect(() => {
    setSkills(buildSkillItems());
    setStreak(readDailyStreak());
    setXp(readXp());
    trackAnalyticsEvent("skill_open");
  }, []);

  const recommendedSkill = getRecommendedSkill(skills);

  const handleSelect = (skill: SkillCardItem) => {
    router.push(`/quest?skillId=${encodeURIComponent(skill.id)}`);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#f8fafc_45%,#e2e8f0_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <section className="mb-6 rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-600">Recommended</div>
          {recommendedSkill ? (
            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                {recommendedSkill.grade ?? recommendedSkill.code ?? recommendedSkill.id}
              </div>
              <h2 className="mt-2 text-2xl font-black text-slate-900">{recommendedSkill.title}</h2>
              <p className="mt-2 text-sm text-slate-600">mastery {((recommendedSkill.mastery ?? 0) * 100).toFixed(0)}%</p>
              <button
                type="button"
                onClick={() => handleSelect(recommendedSkill)}
                className="mt-4 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
              >
                Start Practice
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-800">
              すべての skill を mastered しています。
            </div>
          )}
        </section>
        <section className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Learning Progress</div>
          <h1 className="mt-3 text-4xl font-black text-slate-900">Skill List</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white">XP {xp.totalXp}</div>
            {streak ? <p className="text-lg font-bold text-amber-600">🔥 {streak.streak} day streak</p> : null}
          </div>
          <p className="mt-3 text-sm text-slate-600">進捗を見ながら、次に進める skill を選べます。</p>
          <div className="mt-8">
            <SkillList skills={skills} onSelect={handleSelect} />
          </div>
        </section>
      </div>
    </main>
  );
}
