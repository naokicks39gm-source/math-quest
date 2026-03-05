import { SecondaryLearningAid } from "@/lib/secondaryExplanations";
import { InlineMath } from "react-katex";

type Props = {
  aid: SecondaryLearningAid;
  onNext?: () => void;
  nextLabel?: string;
  showNextButton?: boolean;
};

export default function SecondaryExplanationPanel({ aid, onNext, nextLabel = "次の問題へ", showNextButton = false }: Props) {
  const { explanation } = aid;

  return (
    <section className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4 text-base text-slate-800">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="space-y-4 text-base">
          <div className="space-y-2">
            {explanation.derivationLines.map((line, idx) => (
              <div key={`${idx}-${line.value}`} className="overflow-x-auto py-1 text-slate-800">
                {line.kind === "tex" ? <InlineMath math={line.value} /> : line.value}
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
            <div className="text-xl font-bold text-indigo-900">{explanation.conclusion}</div>
          </div>
          {showNextButton && onNext && (
            <button
              type="button"
              onClick={onNext}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
            >
              {nextLabel}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
