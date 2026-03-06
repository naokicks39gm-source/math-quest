"use client";

import type { Dispatch, SetStateAction } from "react";

type AnswerInputProps = {
  answer: string;
  setAnswer: Dispatch<SetStateAction<string>>;
};

const keypadKeys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", "⌫", "C"];

export default function AnswerInput({ answer, setAnswer }: AnswerInputProps) {
  const handleKeyPress = (key: string) => {
    if (key === "⌫") {
      setAnswer((current) => current.slice(0, -1));
      return;
    }

    if (key === "C") {
      setAnswer("");
      return;
    }

    setAnswer((current) => `${current}${key}`);
  };

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Answer</div>
      <input
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        inputMode="numeric"
        placeholder="答えを入力"
        className="mt-4 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-2xl font-bold text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
      />
      <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {keypadKeys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleKeyPress(key)}
            className={`rounded-2xl px-4 py-4 text-lg font-bold shadow-sm transition hover:-translate-y-0.5 ${
              key === "C"
                ? "bg-rose-100 text-rose-700"
                : key === "⌫"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-100 text-slate-900"
            }`}
          >
            {key}
          </button>
        ))}
      </div>
    </section>
  );
}
