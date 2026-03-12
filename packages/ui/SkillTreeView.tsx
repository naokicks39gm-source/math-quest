"use client";

import type { SkillNode } from "packages/skill-system/skillTypes";

import SkillProgressBar from "./SkillProgressBar";

type SkillTreeViewProps = {
  skills: SkillNode[];
  currentSkillId?: string;
  focusSkillId?: string;
  onSkillClick?: (skillId: string) => void;
};

const getStatusLabel = (status: SkillNode["status"]) => {
  if (status === "MASTERED") return "クリア！";
  if (status === "LEARNING") return "れんしゅう中";
  if (status === "AVAILABLE") return "つぎ";
  return "これから";
};

const clampMastery = (mastery: number) => Math.max(0, Math.min(1, mastery));
const getMasteryTone = (mastery: number): "danger" | "warning" | "success" => {
  const percent = clampMastery(mastery) * 100;
  if (percent < 40) return "danger";
  if (percent < 80) return "warning";
  return "success";
};

const collectVisibleSkillIds = (skills: SkillNode[], focusSkillId?: string) => {
  if (!focusSkillId) return new Set(skills.map((skill) => skill.id));

  const skillMap = new Map(skills.map((skill) => [skill.id, skill] as const));
  const focus = skillMap.get(focusSkillId);
  if (!focus) return new Set(skills.map((skill) => skill.id));

  const visible = new Set<string>([focus.id]);
  const frontier = new Set<string>([focus.id]);

  for (let depth = 0; depth < 2; depth += 1) {
    const nextFrontier = new Set<string>();

    for (const skillId of frontier) {
      const skill = skillMap.get(skillId);
      if (!skill) continue;

      for (const prerequisiteId of skill.prerequisite) {
        if (!visible.has(prerequisiteId) && skillMap.has(prerequisiteId)) {
          visible.add(prerequisiteId);
          nextFrontier.add(prerequisiteId);
        }
      }

      for (const nextSkillId of skill.nextSkills) {
        if (!visible.has(nextSkillId) && skillMap.has(nextSkillId)) {
          visible.add(nextSkillId);
          nextFrontier.add(nextSkillId);
        }
      }
    }

    if (nextFrontier.size === 0) break;
    frontier.clear();
    for (const skillId of nextFrontier) frontier.add(skillId);
  }

  return visible;
};

export default function SkillTreeView({ skills, currentSkillId, focusSkillId, onSkillClick }: SkillTreeViewProps) {
  const currentSkill = skills.find((skill) => skill.id === currentSkillId);
  const nextSkillIds = new Set(currentSkill?.nextSkills ?? []);
  const visibleSkillIds = collectVisibleSkillIds(skills, focusSkillId);
  const visibleSkills = skills.filter((skill) => visibleSkillIds.has(skill.id));

  return (
    <section className="max-h-[90vh] overflow-y-auto overscroll-contain rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
      <div className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-600">Skill Tree</div>
      <h2 className="mt-3 text-4xl font-black text-slate-900">すすみかた</h2>
      <p className="mt-4 text-base font-medium text-slate-600">いまのスキルと、つぎにすすむスキルです。</p>

      <div className="mt-6 space-y-4">
        {visibleSkills.map((skill) => {
          const mastery = clampMastery(skill.mastery ?? 0);
          const masteryPercent = Math.round(mastery * 100);
          const statusLabel = skill.status;
          const isCurrent = skill.id === currentSkillId;
          const isNext = nextSkillIds.has(skill.id);
          const isClickable = skill.unlocked && Boolean(onSkillClick);
          const cardClass = isCurrent
            ? "border-blue-500 bg-blue-50"
            : skill.mastered
              ? "border-emerald-300 bg-emerald-50/70"
              : "border-slate-200 bg-slate-50";
          const tone = getMasteryTone(mastery);
          const CardTag = isClickable ? "button" : "article";

          return (
            <CardTag
              key={skill.id}
              type={isClickable ? "button" : undefined}
              onClick={isClickable ? () => onSkillClick?.(skill.id) : undefined}
              className={`w-full rounded-2xl border p-4 text-left transition ${cardClass} ${skill.unlocked ? "opacity-100" : "opacity-40"} ${isClickable ? "cursor-pointer hover:-translate-y-0.5" : "cursor-default"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{skill.id}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="text-lg font-bold text-slate-900">{skill.title}</div>
                    {isNext ? (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-green-700">
                        NEXT
                      </span>
                    ) : null}
                  </div>
                </div>
                <div
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                    statusLabel === "MASTERED"
                      ? "bg-emerald-100 text-emerald-700"
                      : statusLabel === "LEARNING"
                        ? "bg-sky-100 text-sky-700"
                        : statusLabel === "AVAILABLE"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {getStatusLabel(statusLabel)}
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">XP</div>
                  <div className="mt-2 text-lg font-bold text-slate-900">
                    {skill.xp} / {skill.requiredXP}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">あと少し！</div>
                  <div className="mt-2 text-lg font-bold text-slate-900">{Math.max(skill.requiredXP - skill.xp, 0)}</div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">すすみぐあい</div>
                  <div className="text-sm font-bold text-slate-900">{masteryPercent}%</div>
                </div>
                <SkillProgressBar mastery={mastery} tone={tone} />
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">つぎ</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {skill.nextSkills.slice(0, 1).length > 0 ? (
                    skill.nextSkills.slice(0, 1).map((nextSkillId) => (
                      <span
                        key={nextSkillId}
                        className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        {nextSkillIds.has(nextSkillId) ? (
                          <span className="mr-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-green-700">
                            NEXT
                          </span>
                        ) : null}
                        {nextSkillId}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm font-medium text-slate-500">さいごまでできたよ</span>
                  )}
                </div>
              </div>
            </CardTag>
          );
        })}
      </div>
    </section>
  );
}
