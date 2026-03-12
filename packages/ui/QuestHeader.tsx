"use client";

type Props = {
  skillTitle: string;
  index: number;
  total: number;
  xpTotal: number;
};

export default function QuestHeader({
  skillTitle,
  index,
  total,
  xpTotal
}: Props) {
  const completed = Math.min(index + 1, total);
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isMastered = total > 0 && completed >= total;

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-2xl font-bold text-slate-900">{skillTitle}</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-600">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-sky-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div>{completed} / {total}</div>
            {isMastered ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold uppercase tracking-[0.12em] text-green-700">
                MASTERED
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
