import type { ReactNode, PointerEvent, TouchEvent } from "react";

type KeypadMode = "highschool" | "junior";
type PlusMinusCandidate = "+" | "-" | null;

type KeypadProps = {
  mode: KeypadMode;
  isPlaying: boolean;
  isStarting: boolean;
  isAnswerLocked: boolean;
  canSubmit: boolean;
  canUseKeyToken: (token: string) => boolean;
  renderKeyLabel: (token: string) => ReactNode;
  onInput: (token: string) => void;
  onDelete: () => void;
  onJudge: () => void;
  onEnd: () => void;
  endDisabled?: boolean;
  onPlusMinusPointerDown?: (e: PointerEvent<HTMLButtonElement>) => void;
  onPlusMinusPointerUp?: (e: PointerEvent<HTMLButtonElement>) => void;
  onPlusMinusPointerCancel?: (e: PointerEvent<HTMLButtonElement>) => void;
  onPlusMinusTouchStart?: (e: TouchEvent<HTMLButtonElement>) => void;
  plusMinusPopupOpen: boolean;
  plusMinusCandidate: PlusMinusCandidate;
  judgeLabel: string;
  endLabel?: string;
};

const COMMON_KEYPAD_LAYOUT = [
  "1", "2", "3", "()", "",
  "4", "5", "6", "x", "",
  "7", "8", "9", "+/-", "",
  "0", "/", "^", ".", ""
] as const;

export default function Keypad({
  mode,
  isPlaying,
  isStarting,
  isAnswerLocked,
  canSubmit,
  canUseKeyToken,
  renderKeyLabel,
  onInput,
  onDelete,
  onJudge,
  onEnd,
  endDisabled = false,
  onPlusMinusPointerDown,
  onPlusMinusPointerUp,
  onPlusMinusPointerCancel,
  onPlusMinusTouchStart,
  plusMinusPopupOpen,
  plusMinusCandidate,
  judgeLabel,
  endLabel = "おわり"
}: KeypadProps) {
  const isDisabledBase = !isPlaying || isStarting || isAnswerLocked;
  const plusMinusSupportsGesture = mode === "highschool";

  return (
    <div className="w-full space-y-1 pb-1">
      <div className="w-full flex items-stretch gap-2">
        <div className="flex-1 grid grid-cols-5 grid-rows-4 gap-1">
          {COMMON_KEYPAD_LAYOUT.map((token, index) => {
            if (!token) return <div key={`spacer-${index}`} className="h-9 w-full" />;
            const canUse = canUseKeyToken(token);
            const tokenDisabled = isDisabledBase || !canUse;
            const isPlusMinus = token === "+/-";
            return (
              <button
                key={`${token}-${index}`}
                type="button"
                onClick={() => {
                  if (isPlusMinus && plusMinusSupportsGesture) return;
                  onInput(token);
                }}
                onPointerDown={isPlusMinus && plusMinusSupportsGesture ? onPlusMinusPointerDown : undefined}
                onPointerUp={isPlusMinus && plusMinusSupportsGesture ? onPlusMinusPointerUp : undefined}
                onPointerCancel={isPlusMinus && plusMinusSupportsGesture ? onPlusMinusPointerCancel : undefined}
                onTouchStart={isPlusMinus && plusMinusSupportsGesture ? onPlusMinusTouchStart : undefined}
                disabled={tokenDisabled}
                className={`
                  relative overflow-visible w-full font-bold leading-tight shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px] transition-all border
                  ${isPlusMinus ? "h-10 rounded-lg text-[13px] tracking-wide mx-1" : "h-9 rounded-md text-[11px]"}
                  ${canUse ? "bg-white text-slate-700 border-slate-200 hover:bg-slate-50" : "bg-slate-100 text-slate-400 border-slate-200"}
                  ${isPlusMinus && plusMinusPopupOpen && plusMinusCandidate === "-" ? "bg-rose-50 text-rose-700 border-rose-300" : ""}
                `}
                style={isPlusMinus && plusMinusSupportsGesture ? { touchAction: "none" } : undefined}
              >
                {renderKeyLabel(token)}
              </button>
            );
          })}
        </div>
        <div className="w-[92px] grid grid-cols-1 grid-rows-[44px_88px_36px] gap-1.5">
          <button
            type="button"
            onClick={onDelete}
            disabled={isDisabledBase}
            className="h-full w-full rounded-lg text-sm font-bold shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px] transition-all bg-red-100 text-red-600 border border-red-200 hover:bg-red-200 flex items-center justify-center"
          >
            ⌫
          </button>
          <button
            type="button"
            onClick={onJudge}
            disabled={isDisabledBase || !canSubmit}
            className="h-full w-full rounded-lg text-base font-black shadow-[0_3px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[3px] transition-all bg-indigo-600 text-white border border-indigo-700 hover:bg-indigo-700 flex items-center justify-center"
          >
            {judgeLabel}
          </button>
          <button
            type="button"
            onClick={onEnd}
            disabled={endDisabled}
            className="h-full w-full rounded-md text-xs font-bold shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px] transition-all bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700 disabled:bg-slate-300 flex items-center justify-center"
          >
            {endLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
