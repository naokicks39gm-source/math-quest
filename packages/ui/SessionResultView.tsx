type SessionResultViewProps = {
  score: number;
  totalQuestions: number;
  onRetry: () => void;
  onBackToSkills: () => void;
};

export default function SessionResultView({
  score,
  totalQuestions,
  onRetry,
  onBackToSkills
}: SessionResultViewProps) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
      <div className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-600">Session Result</div>
      <h2 className="mt-3 text-4xl font-black text-slate-900">Score</h2>
      <p className="mt-4 text-3xl font-bold text-slate-800">
        {score} / {totalQuestions} correct
      </p>
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
          onClick={onBackToSkills}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
        >
          Back to Skills
        </button>
      </div>
    </section>
  );
}
