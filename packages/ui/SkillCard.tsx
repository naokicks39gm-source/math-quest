"use client";

import SkillProgressBar from "packages/ui/SkillProgressBar";

export type SkillCardItem = {
  id: string;
  title: string;
  code?: string;
  grade?: string;
  mastery?: number;
  mastered?: boolean;
};

type SkillCardProps = {
  skill: SkillCardItem;
  onSelect: (skill: SkillCardItem) => void;
};

export default function SkillCard({ skill, onSelect }: SkillCardProps) {
  const mastery = typeof skill.mastery === "number" ? Math.max(0, Math.min(1, skill.mastery)) : undefined;
  const status = mastery !== undefined ? (mastery >= 0.75 ? "mastered" : "learning") : undefined;

  return (
    <button
      type="button"
      onClick={() => onSelect(skill)}
      className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-[0.2em] text-slate-500">{skill.code ?? skill.grade ?? skill.id}</div>
          <div className="mt-1 text-lg font-bold text-slate-900">{skill.title}</div>
        </div>
        {status ? (
          <div className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            {status}
          </div>
        ) : null}
      </div>
      {mastery !== undefined ? (
        <>
          <SkillProgressBar mastery={mastery} />
          <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
            <span>{skill.grade ?? "Skill"}</span>
            <span>{Math.round(mastery * 100)}%</span>
          </div>
        </>
      ) : null}
    </button>
  );
}
