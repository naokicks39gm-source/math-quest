"use client";

type SkillClearViewProps = {
  skillTitle: string;
  earnedXp: number;
  skillXp: number;
  requiredXP: number;
  nextSkillTitle?: string | null;
  onNextSkill?: () => void;
  onRetry: () => void;
  onDone: () => void;
};

export default function SkillClearView({
  skillTitle,
  earnedXp,
  skillXp,
  requiredXP,
  nextSkillTitle,
  onNextSkill,
  onRetry,
  onDone
}: SkillClearViewProps) {
  return (
    <section className="rounded-[32px] border border-emerald-300 bg-white/95 p-8 text-center shadow-[0_24px_80px_rgba(5,150,105,0.22)] backdrop-blur">
      <div className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Clear</div>
      <h2 className="mt-3 text-4xl font-black text-emerald-700">クリア！</h2>
      <p className="mt-4 text-xl font-bold text-slate-900">{skillTitle}</p>

      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">今回ふえた XP</div>
        <div className="mt-2 text-2xl font-black text-emerald-700">+{earnedXp} XP</div>
      </div>

      <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">いまの XP</div>
        <div className="mt-2 text-lg font-bold text-slate-900">
          {skillXp} / {requiredXP}
        </div>
      </div>

      {nextSkillTitle ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">つぎのスキル</div>
          <div className="mt-2 text-lg font-bold text-slate-900">{nextSkillTitle}</div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        {nextSkillTitle && onNextSkill ? (
          <button
            type="button"
            onClick={onNextSkill}
            className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
          >
            つぎのスキルにすすむ
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRetry}
          className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
        >
          もういちど れんしゅうする
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
        >
          おわりにする
        </button>
      </div>
    </section>
  );
}
