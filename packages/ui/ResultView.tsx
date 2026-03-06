type ResultViewProps = {
  isCorrect: boolean | null;
  correctAnswer: string;
};

export default function ResultView({ isCorrect, correctAnswer }: ResultViewProps) {
  if (isCorrect === null) {
    return null;
  }

  return (
    <section
      className={`rounded-[28px] border px-6 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] ${
        isCorrect
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-rose-200 bg-rose-50 text-rose-900"
      }`}
    >
      <div className="text-2xl font-black">{isCorrect ? "正解" : "不正解"}</div>
      <div className="mt-2 text-sm font-medium">正しい答え: {correctAnswer}</div>
    </section>
  );
}
