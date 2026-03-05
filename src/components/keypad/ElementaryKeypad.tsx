import {
  KEYPAD_LAYOUT_BY_MODE,
  keypadKeySizeClass,
  keypadRightColumnClass,
  resolveMathKeypadToken,
  type MathKeypadToken
} from "./BaseMathKeypad";

type Props = {
  isPlaying: boolean;
  isStarting: boolean;
  isAnswerLocked: boolean;
  canSubmit: boolean;
  canUseKeyToken: (token: string) => boolean;
  onInput: (token: string) => void;
  onDelete: () => void;
  onJudge: () => void;
  onEnd: () => void;
  endDisabled?: boolean;
  judgeLabel: string;
  endLabel?: string;
};

export default function ElementaryKeypad({
  isPlaying,
  isStarting,
  isAnswerLocked,
  canSubmit,
  canUseKeyToken,
  onInput,
  onDelete,
  onJudge,
  onEnd,
  endDisabled = false,
  judgeLabel,
  endLabel = "おわり"
}: Props) {
  const baseDisabled = !isPlaying || isStarting || isAnswerLocked;
  const keySize = keypadKeySizeClass.elementary;
  const rightColumnClass = keypadRightColumnClass.elementary;

  return (
    <div className="w-full flex items-stretch gap-2">
      <div className="flex-1 flex flex-col gap-0">
        {KEYPAD_LAYOUT_BY_MODE.elementary.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="grid grid-cols-3 gap-0">
            {row.map((token, colIndex) => {
              const typedToken = token as MathKeypadToken;
              const resolved = resolveMathKeypadToken(typedToken, "x");
              const disabled = baseDisabled || !canUseKeyToken(resolved);
              return (
                <button
                  key={`${rowIndex}-${colIndex}-${token}`}
                  type="button"
                  onClick={() => onInput(resolved)}
                  disabled={disabled}
                  className={`
                    w-full font-bold leading-tight shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px] transition-all border
                    ${keySize}
                    ${disabled ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}
                  `}
                >
                  {token}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className={rightColumnClass}>
        <button
          type="button"
          onClick={onDelete}
          disabled={baseDisabled}
          className="h-full w-full rounded-lg text-base font-bold shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px] transition-all bg-red-100 text-red-600 border border-red-200 hover:bg-red-200 flex items-center justify-center"
        >
          ⌫
        </button>
        <button
          type="button"
          onClick={onJudge}
          disabled={baseDisabled || !canSubmit}
          className="h-full w-full rounded-lg text-lg font-black shadow-[0_3px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[3px] transition-all bg-indigo-600 text-white border border-indigo-700 hover:bg-indigo-700 flex items-center justify-center"
        >
          {judgeLabel}
        </button>
        <button
          type="button"
          onClick={onEnd}
          disabled={endDisabled}
          className="h-full w-full rounded-md text-sm font-bold shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px] transition-all bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700 disabled:bg-slate-300 flex items-center justify-center"
        >
          {endLabel}
        </button>
      </div>
    </div>
  );
}
