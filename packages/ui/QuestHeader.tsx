"use client";

type Props = {
  skillTitle: string;
  skillXP: number;
  requiredXP: number;
  xpTotal: number;
};

export default function QuestHeader({
  skillTitle,
  skillXP,
  requiredXP,
  xpTotal
}: Props) {
  const safeRequiredXP = Math.max(1, requiredXP);
  const progressPercent = Math.round((Math.min(skillXP, safeRequiredXP) / safeRequiredXP) * 100);
  const isMastered = skillXP >= safeRequiredXP;

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-2xl font-bold text-slate-900">{skillTitle}</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-600">
            <span className="shrink-0">XP {skillXP} / {safeRequiredXP}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-600">
            <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-sky-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {isMastered ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                クリア！
              </span>
            ) : null}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700">
          XP {xpTotal}
        </span>
      </div>
    </div>
  );
}
