import { ElementaryLearningAid } from "@/lib/elementaryExplanations";

type Props = {
  aid: ElementaryLearningAid;
  onNext: () => void;
  nextLabel: string;
  disabled?: boolean;
};

const dotRow = (count: number) => {
  const capped = Math.max(0, Math.min(count, 20));
  return "●".repeat(capped) || "-";
};

export default function ElementaryExplanationPanel({ aid, onNext, nextLabel, disabled = false }: Props) {
  return (
    <section className="mb-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-slate-800">
      <div className="text-sm font-black text-emerald-800">{aid.title}</div>
      <ol className="mt-2 list-decimal pl-5 text-xs sm:text-sm space-y-1">
        {aid.steps.map((step, idx) => (
          <li key={`${idx}-${step}`}>{step}</li>
        ))}
      </ol>

      {aid.visual?.mode === "abacus" && (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-white p-2 text-xs font-mono">
          <div>{aid.visual.left} こ: {dotRow(aid.visual.left ?? 0)}</div>
          <div>{aid.visual.operator === "+" ? "ふやす" : "とる"} {aid.visual.right} こ: {dotRow(aid.visual.right ?? 0)}</div>
          <div className="mt-1 border-t border-emerald-200 pt-1">
            こたえ {aid.visual.result} こ: {dotRow(aid.visual.result ?? 0)}
          </div>
        </div>
      )}

      {aid.visual?.mode === "column" && (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-white p-2 text-xs font-mono">
          <div className="text-right">{aid.visual.top ?? ""}</div>
          <div className="text-right">{aid.visual.operator} {aid.visual.bottom ?? ""}</div>
          <div className="my-1 border-t border-slate-400" />
          <div className="text-right">{aid.visual.result}</div>
        </div>
      )}

      <div className="mt-2 rounded-lg border border-emerald-300 bg-emerald-100 px-2 py-1 text-sm font-bold text-emerald-900">
        こたえ: {aid.conclusion}
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onNext}
          disabled={disabled}
          className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-bold shadow disabled:bg-slate-300"
        >
          {nextLabel}
        </button>
      </div>
    </section>
  );
}
