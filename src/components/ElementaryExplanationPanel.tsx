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

const getDigitHighlightIndex = (value: string, place: "ones" | "next") => {
  const digitIndexes: number[] = [];
  for (let i = 0; i < value.length; i += 1) {
    if (/\d/.test(value[i])) digitIndexes.push(i);
  }
  if (digitIndexes.length === 0) return -1;
  const offset = place === "ones" ? 0 : 1;
  const idx = digitIndexes.length - 1 - offset;
  return idx >= 0 ? digitIndexes[idx] : -1;
};

const renderAlignedValue = (value: string | undefined, place?: "ones" | "next") => {
  const text = value ?? "";
  if (!text || !place) return <span>{text}</span>;
  const highlightIndex = getDigitHighlightIndex(text, place);
  const highlightClass = place === "ones" ? "text-rose-600" : "text-indigo-600";
  return (
    <span>
      {text.split("").map((ch, i) => (
        <span key={`${ch}-${i}`} className={i === highlightIndex ? `${highlightClass} font-black` : ""}>
          {ch}
        </span>
      ))}
    </span>
  );
};

const getAdjustmentBadgeClass = (label: "+1" | "-1" | "+10") => {
  if (label === "-1") return "border-rose-300 bg-rose-500";
  if (label === "+10") return "border-sky-300 bg-sky-500";
  return "border-emerald-300 bg-emerald-500";
};

const renderColumnFrame = (
  frame: {
    title: string;
    top?: string;
    bottom?: string;
    operator?: "+" | "-" | "×" | "÷";
    line?: boolean;
    partial?: string;
    digitAdjustments?: Array<{ offsetFromRight: number; label: "+1" | "-1" | "+10" }>;
    focusPlace?: "ones" | "next";
  },
  key: string
) => (
  <article key={key} className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2">
    <div className="text-[11px] font-black text-emerald-700">{frame.title}</div>
    {frame.title === "答え" ? (
      <div className="mt-1 w-full max-w-[19rem] rounded-lg bg-emerald-50 px-3 py-2 text-left text-2xl sm:text-3xl font-black text-emerald-900">
        {frame.partial ?? ""}
      </div>
    ) : (
    <div className="relative mt-1 w-full max-w-[19rem] rounded-lg bg-emerald-50 px-2 py-2 font-mono text-left text-2xl sm:text-3xl leading-tight text-slate-800">
      {(() => {
        const stackIndexByOffset = new Map<number, number>();
        const orderedAdjustments = [...(frame.digitAdjustments ?? [])].sort((a, b) => {
          if (a.offsetFromRight !== b.offsetFromRight) return a.offsetFromRight - b.offsetFromRight;
          return a.label.localeCompare(b.label);
        });
        return orderedAdjustments.map((adj, idx) => {
          const stackIndex = stackIndexByOffset.get(adj.offsetFromRight) ?? 0;
          stackIndexByOffset.set(adj.offsetFromRight, stackIndex + 1);
          const rightBase = `calc(${1 + adj.offsetFromRight * 1.25}ch + 0.25rem)`;
          const right =
            adj.label === "+10"
              ? `calc(${rightBase} + 0.35ch)`
              : adj.label === "-1"
                ? `calc(${rightBase} - 0.35ch)`
                : rightBase;
          const top = `calc(-0.75rem - ${stackIndex * 1.05}rem)`;
          return (
            <div
              key={`${adj.label}-${adj.offsetFromRight}-${idx}`}
              className={`absolute rounded-full border px-2 py-0.5 text-[11px] font-black leading-none text-white shadow ${getAdjustmentBadgeClass(adj.label)}`}
              style={{ right, top }}
            >
              {adj.label}
            </div>
          );
        });
      })()}
      <div className="text-right">{renderAlignedValue(frame.top, frame.focusPlace)}</div>
      <div className="text-right">{frame.operator ?? ""} {renderAlignedValue(frame.bottom, frame.focusPlace)}</div>
      {frame.line && <div className="my-1 ml-auto w-[9.5rem] sm:w-[11rem] border-t-2 border-slate-500" />}
      <div className="text-right">{frame.partial ?? ""}</div>
    </div>
    )}
  </article>
);

export default function ElementaryExplanationPanel({ aid, onNext, nextLabel, disabled = false }: Props) {
  const isCircled = aid.numberingStyle === "circled";
  const stepLabels = ["①", "②", "③", "④", "⑤", "⑥"];
  return (
    <section className="mb-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-slate-800">
      <div className="text-sm font-black text-emerald-800">{aid.title}</div>
      {aid.steps.length > 0 && (
        isCircled ? (
          <div className="mt-2 space-y-1 text-sm leading-relaxed text-slate-800">
            {aid.steps.map((step, idx) => {
              const raw = step.replace(/^[①②③④⑤⑥]\s*/u, "");
              const label = step.match(/^[①②③④⑤⑥]/u)?.[0] ?? stepLabels[idx] ?? "・";
              return (
                <div key={`${aid.title}-step-${idx}`} className="flex items-start gap-2">
                  <span className="font-black text-emerald-800">{label}</span>
                  <span>{raw}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <ol className="mt-2 list-decimal pl-5 text-sm leading-relaxed text-slate-800">
            {aid.steps.map((step, idx) => (
              <li key={`${aid.title}-step-${idx}`}>{step}</li>
            ))}
          </ol>
        )
      )}

      {aid.visual?.mode === "abacus" && (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-white p-2 text-xs font-mono">
          <div>{aid.visual.left} こ: {dotRow(aid.visual.left ?? 0)}</div>
          <div>
            {aid.visual.operator === "+" ? "ふやす" : aid.visual.operator === "-" ? "とる" : "くらべる"} {aid.visual.right} こ: {dotRow(aid.visual.right ?? 0)}
          </div>
          <div className="mt-1 border-t border-emerald-200 pt-1">
            こたえ {aid.visual.result} こ: {dotRow(aid.visual.result ?? 0)}
          </div>
          {aid.visual.showTenBundle && (
            <div className="mt-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px]">
              <div>10のまとまり: {Math.floor((aid.visual.result ?? 0) / 10)}こ</div>
              <div>のこり: {(aid.visual.result ?? 0) % 10}こ</div>
            </div>
          )}
        </div>
      )}

      {aid.visual?.mode === "column" && (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-white p-2 text-sm font-mono">
          <div className="text-left w-full max-w-[19rem]">
            <div className="text-right">{aid.visual.top ?? ""}</div>
            <div className="text-right">{aid.visual.operator} {aid.visual.bottom ?? ""}</div>
            <div className="my-1 border-t border-slate-400" />
            <div className="text-right">{aid.visual.result}</div>
          </div>
        </div>
      )}

      {aid.visual?.mode === "column_story" && (
        <div className="mt-2 flex w-full flex-col items-start gap-2">
          {(aid.visual.frames ?? []).map((frame, idx) => renderColumnFrame(frame, `${idx}-${frame.title}`))}
        </div>
      )}

      {!aid.embedAnswerInSteps && (
        <div className="mt-2 rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-2 text-sm font-black text-emerald-900">
          こたえ: {aid.cleanAnswerText ?? aid.conclusion}
        </div>
      )}

      <div className="mt-2 flex justify-end">
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
