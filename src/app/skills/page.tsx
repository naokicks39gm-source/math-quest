"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SkillList, type SkillCardItem } from "packages/ui";
import { loadStateFromClient } from "packages/learning-engine/studentStore";
import type { SkillStatus } from "packages/skill-system/skillTypes";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { practiceSkills } from "@/lib/learningSkillCatalog";
import { readDailyStreak, type DailyStreak } from "@/lib/streak";

const resolveSkillStatus = (unlocked: boolean, mastery: number, mastered: boolean): SkillStatus => {
  if (mastered || mastery >= 0.8) return "MASTERED";
  if (!unlocked) return "LOCKED";
  if (mastery > 0) return "LEARNING";
  return "AVAILABLE";
};

const buildSkillItems = (state: ReturnType<typeof loadStateFromClient>): SkillCardItem[] => {
  return practiceSkills
    .map((skill) => {
      const progress = state.skillProgress[skill.id];
      const mastery = progress?.mastery ?? 0;
      const mastered = progress?.mastered === true || mastery >= 0.8;
      const unlocked = state.unlockedSkills.includes(skill.id);

      return {
        id: skill.id,
        code: skill.code,
        title: skill.title,
        grade: skill.grade,
        gradeLevel: skill.gradeLevel,
        mastery,
        mastered,
        unlocked,
        status: resolveSkillStatus(unlocked, mastery, mastered)
      };
    });
};

const getRecommendedSkill = (items: SkillCardItem[]) =>
  practiceSkills
    .map((skill) => {
      const progress = items.find((item) => item.id === skill.id);
      return {
        ...skill,
        mastery: progress?.mastery ?? 0,
        mastered: progress?.mastered ?? false,
        unlocked: progress?.unlocked ?? false,
        status: progress?.status
      };
    })
    .filter((skill) => skill.unlocked === true && (skill.mastery ?? 0) < 0.8 && skill.patterns.length > 0)
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
  const [xp, setXp] = useState(0);
  const [skills, setSkills] = useState<SkillCardItem[]>(() =>
    practiceSkills.map((skill) => ({
      id: skill.id,
      code: skill.code,
      title: skill.title,
      grade: skill.grade,
      gradeLevel: skill.gradeLevel,
      mastery: 0,
      mastered: false,
      unlocked: skill.id === practiceSkills[0]?.id,
      status: skill.id === practiceSkills[0]?.id ? "AVAILABLE" : "LOCKED"
    }))
  );

  useEffect(() => {
    const state = loadStateFromClient();
    const nextXp = state.student.xpTotal ?? 0;

    setSkills(buildSkillItems(state));
    setStreak(readDailyStreak());
    setXp(nextXp);
    console.log("studentXP", nextXp);
    trackAnalyticsEvent("skill_open");
  }, []);

  const recommendedSkill = getRecommendedSkill(skills);

  const handleSelect = (skill: SkillCardItem) => {
    if (skill.status === "LOCKED") {
      return;
    }
    router.push(`/quest?skillId=${encodeURIComponent(skill.id)}&fresh=1`);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#f8fafc_45%,#e2e8f0_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        {recommendedSkill ? (
          <section className="mb-6 rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
            <div className="text-sm font-semibold tracking-[0.2em] text-sky-600">おすすめ</div>
            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-5">
              <h2 className="mt-2 text-2xl font-black text-slate-900">{recommendedSkill.title}</h2>
              <p className="mt-2 text-sm text-slate-600">すすみぐあい {((recommendedSkill.mastery ?? 0) * 100).toFixed(0)}%</p>
              <button
                type="button"
                onClick={() => handleSelect(recommendedSkill)}
                className="mt-4 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
              >
                はじめる
              </button>
            </div>
          </section>
        ) : null}
        <section className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="text-sm font-semibold tracking-[0.2em] text-emerald-600">いまの すすみぐあい</div>
          <h1 className="mt-3 text-4xl font-black text-slate-900">べんきょう いちらん</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white">ポイント {xp}</div>
            {streak ? <p className="text-lg font-bold text-amber-600">🔥 {streak.streak} にち れんぞく</p> : null}
          </div>
          <p className="mt-3 text-sm text-slate-600">すすみぐあいを みながら、つぎの べんきょうを えらべます。</p>
          <div className="mt-8">
            <SkillList skills={skills} onSelect={handleSelect} />
          </div>
        </section>
      </div>
    </main>
  );
}
