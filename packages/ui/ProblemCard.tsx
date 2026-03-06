type ProblemCardProps = {
  question: string;
};

export default function ProblemCard({ question }: ProblemCardProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Problem</div>
      <div className="mt-6 text-4xl font-black tracking-wide text-slate-900 sm:text-5xl">{question}</div>
    </section>
  );
}
