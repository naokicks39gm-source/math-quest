import { SecondaryLearningAid } from "@/lib/secondaryExplanations";

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
          <div>
            <div className="text-lg font-bold text-slate-800">{explanation.title}</div>
            <div className="text-slate-700">{explanation.point}</div>
          </div>

          <div>
            <div className="font-bold text-slate-700">図</div>
            <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-sm text-slate-100">
              {explanation.diagramLines.join("\n")}
            </pre>
          </div>

          <div>
            <div className="font-bold text-slate-700">表</div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {explanation.table.headers.map((header) => (
                      <th key={header} className="border border-slate-300 bg-slate-100 px-3 py-2 text-left">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {explanation.table.rows.map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                      {row.map((cell, cellIndex) => (
                        <td key={`cell-${rowIndex}-${cellIndex}`} className="border border-slate-300 px-3 py-2 align-top">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="font-bold text-slate-700">手順</div>
            <ol className="list-decimal space-y-1 pl-6 text-slate-700">
              {explanation.steps.map((step, idx) => (
                <li key={`${idx}-${step}`}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
            <div className="text-sm font-bold text-indigo-700">答え</div>
            <div className="text-lg font-bold text-indigo-900">{explanation.conclusion}</div>
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
