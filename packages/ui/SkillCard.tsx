"use client";

import type { DummySkill } from "@/mock/dummySkills";

type SkillCardProps = {
  skill: DummySkill;
  onSelect: (skill: DummySkill) => void;
};

export default function SkillCard({ skill, onSelect }: SkillCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(skill)}
      className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
    >
      <div className="text-sm font-semibold tracking-[0.2em] text-slate-500">{skill.code}</div>
      <div className="mt-1 text-lg font-bold text-slate-900">{skill.title}</div>
    </button>
  );
}
