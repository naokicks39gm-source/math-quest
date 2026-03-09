"use client";

type SessionResultViewProps = {
  skillId?: string | null;
  skillName: string;
  score: number;
  totalQuestions: number;
  earnedXp: number;
  difficultyBefore: number;
  difficultyAfter: number;
  weakPatternsDetected: number;
  skillProgressBefore: { mastery: number } | null;
  skillProgressAfter: { mastery: number } | null;
  onRetry: () => void;
  onContinueLearning: (skillId: string) => void;
  onBackToSkills: () => void;
};

export default function SessionResultView({
  skillId,
  skillName,
  score,
  totalQuestions,
  earnedXp,
  difficultyBefore,
  difficultyAfter,
  weakPatternsDetected,
  skillProgressBefore,
  skillProgressAfter,
  onRetry,
  onContinueLearning,
  onBackToSkills
}: SessionResultViewProps) {
  const beforeMastery = skillProgressBefore?.mastery ?? 0;
  const afterMastery = skillProgressAfter?.mastery ?? 0;
  const delta = afterMastery - beforeMastery;
  const deltaLabel = `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`;
  const deltaColorClass = delta > 0 ? "text-emerald-600" : "text-slate-500";

  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
      <div className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-600">Session Result</div>
      <h2 className="mt-3 text-4xl font-black text-slate-900">Score</h2>
      <p className="mt-4 text-3xl font-bold text-slate-800">
        {score} / {totalQuestions} correct
      </p>
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">XP</div>
        <div className="mt-2 text-2xl font-black text-amber-700">+{earnedXp} XP</div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Difficulty</div>
          <div className="mt-2 text-lg font-bold text-slate-900">
            {difficultyBefore} → {difficultyAfter}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Weak Patterns</div>
          <div className="mt-2 text-lg font-bold text-slate-900">{weakPatternsDetected}</div>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Skill Progress</div>
        <div className="mt-2 text-sm font-semibold text-slate-600">{skillName}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-lg font-bold text-slate-900">
          <span>{beforeMastery.toFixed(2)}</span>
          <span className="text-slate-400">→</span>
          <span>{afterMastery.toFixed(2)}</span>
          <span className={deltaColorClass}>({deltaLabel})</span>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={() => {
            console.log("CONTINUE CLICKED");
            console.log("skillId", skillId);
            if (!skillId) {
              console.log("skillId missing");
              return;
            }
            onContinueLearning(skillId);
          }}
          disabled={skillId == null}
          className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue Learning
        </button>
        <button
          type="button"
          onClick={onBackToSkills}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
        >
          Back to Skills
        </button>
      </div>
    </section>
  );
}
