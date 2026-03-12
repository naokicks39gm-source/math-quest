"use client";

import type { SkillStatus } from "packages/skill-system/skillTypes";

import SkillProgressBar from "packages/ui/SkillProgressBar";

export type SkillCardItem = {
  id: string;
  title: string;
  code?: string;
  grade?: string;
  gradeLevel?: "1" | "2" | "3";
  mastery?: number;
  mastered?: boolean;
  unlocked?: boolean;
  status?: SkillStatus;
};

type SkillCardProps = {
  skill: SkillCardItem;
  onSelect: (skill: SkillCardItem) => void;
};

export default function SkillCard({ skill, onSelect }: SkillCardProps) {
  const mastery = typeof skill.mastery === "number" ? Math.max(0, Math.min(1, skill.mastery)) : undefined;
  const masteryPercent = mastery !== undefined ? Math.round(mastery * 100) : 0;
  const status =
    skill.status ??
    (skill.mastered || (mastery ?? 0) >= 0.8
      ? "MASTERED"
      : skill.unlocked === false
        ? "LOCKED"
        : (mastery ?? 0) > 0
          ? "LEARNING"
          : "AVAILABLE");
  const isLocked = status === "LOCKED";
  const statusClass =
    status === "MASTERED"
      ? "bg-emerald-50 text-emerald-700"
      : status === "LEARNING"
        ? "bg-sky-100 text-sky-700"
        : status === "AVAILABLE"
          ? "bg-amber-100 text-amber-700"
          : "bg-slate-200 text-slate-600";
  const statusLabel =
    status === "MASTERED"
      ? "クリア"
      : status === "LEARNING"
        ? "れんしゅう中"
        : status === "AVAILABLE"
          ? "つぎ"
          : "これから";

  return (
    <button
      type="button"
      onClick={() => onSelect(skill)}
      disabled={isLocked}
      className={`w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition ${
        isLocked
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mt-1 text-lg font-bold text-slate-900">{skill.title}</div>
        </div>
        <div className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
          {statusLabel}
        </div>
      </div>
      {mastery !== undefined ? (
        <>
          <SkillProgressBar mastery={mastery} />
          <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
            <span>すすみぐあい</span>
            <span>{masteryPercent}%</span>
          </div>
        </>
      ) : null}
    </button>
  );
}
