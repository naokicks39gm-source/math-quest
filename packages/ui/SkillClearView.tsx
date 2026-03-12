"use client";

type SkillClearViewProps = {
  skillTitle: string;
  gradeLevel?: "1" | "2" | "3";
  earnedXp: number;
  skillXp: number;
  requiredXP: number;
  nextSkillTitle?: string | null;
  history: {
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }[];
  onNextSkill?: () => void;
  onRetry: () => void;
  onDone: () => void;
};

export default function SkillClearView({
  skillTitle,
  gradeLevel = "1",
  earnedXp,
  skillXp,
  requiredXP,
  nextSkillTitle,
  history,
  onNextSkill,
  onRetry,
  onDone
}: SkillClearViewProps) {
  const nextLabel = gradeLevel === "1" ? "つぎのべんきょう" : "つぎの勉強";

  return (
    <section className="rounded-[32px] border border-emerald-300 bg-white/95 p-8 text-center shadow-[0_24px_80px_rgba(5,150,105,0.22)] backdrop-blur">
      <div className="text-sm font-semibold tracking-[0.2em] text-emerald-600">クリア</div>
      <h2 className="mt-3 text-4xl font-black text-emerald-700">クリア！</h2>
      <p className="mt-4 text-xl font-bold text-slate-900">{skillTitle}</p>

      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="text-xs font-semibold tracking-[0.15em] text-emerald-700">もらったポイント</div>
        <div className="mt-2 text-2xl font-black text-emerald-700">+{earnedXp} ポイント</div>
      </div>

      <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <div className="text-xs font-semibold tracking-[0.15em] text-sky-700">いまのポイント</div>
        <div className="mt-2 text-lg font-bold text-slate-900">
          {skillXp} / {requiredXP}
        </div>
      </div>

      {nextSkillTitle ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs font-semibold tracking-[0.15em] text-amber-700">{nextLabel}</div>
          <div className="mt-2 text-lg font-bold text-slate-900">{nextSkillTitle}</div>
        </div>
      ) : null}

      {history.length > 0 ? (
        <div className="mt-4 max-h-[32vh] overflow-y-auto text-left">
          {history.map((entry, index) => (
            <div key={`${entry.question}-${index}`} className="mb-2 rounded-xl border border-slate-200 p-3">
              <div className="whitespace-pre-line text-sm font-bold text-slate-900">{entry.question}</div>
              <div className="mt-1 text-sm text-slate-700">こたえ：{entry.userAnswer || "なし"}</div>
              <div className="text-sm text-slate-700">せいかい：{entry.correctAnswer}</div>
              <div className={`mt-1 text-sm font-bold ${entry.isCorrect ? "text-emerald-600" : "text-rose-600"}`}>
                {entry.isCorrect ? "〇" : "×"}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        {nextSkillTitle && onNextSkill ? (
          <button
            type="button"
            onClick={onNextSkill}
            className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
          >
            つぎへ
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRetry}
          className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
        >
          もういちど
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
        >
          おわる
        </button>
      </div>
    </section>
  );
}
