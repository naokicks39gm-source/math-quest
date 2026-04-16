import {
  KEYPAD_LAYOUT_BY_MODE,
  keypadKeySizeClass,
  keypadRightColumnClass,
  resolveMathKeypadToken,
  type MathKeypadToken
} from "./BaseMathKeypad";
import { KEYS } from "packages/keypad";

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
  // console.log("TRACE_ELEMENTARY_KEYPAD_RENDER");
  const baseDisabled = !isPlaying || isStarting || isAnswerLocked;
  const keySize = keypadKeySizeClass.elementary;
  const rightColumnClass = keypadRightColumnClass.elementary;
  // console.log("TRACE_ON_INPUT_PROP", {
  //   hasOnInput: !!onInput,
  //   type: typeof onInput
  // });
  // console.log("TRACE_KEYPAD_DISABLED", {
  //   baseDisabled,
  //   canSubmit,
  //   canUseKeyToken: typeof canUseKeyToken
  // });

  return (
    <div className="w-full flex items-stretch gap-2">
      <div className="flex-1 flex flex-col gap-2 p-2">
        {KEYPAD_LAYOUT_BY_MODE.elementary.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="grid grid-cols-3 gap-2 w-full h-[72px]">
            {row.map((token, colIndex) => {
              const typedToken = token as MathKeypadToken;
              const resolved = resolveMathKeypadToken(typedToken, "x");
              const tokenAllowed = canUseKeyToken(resolved);
              const isDecimal = token === KEYS.DECIMAL;
              // console.log("TRACE_KEYPAD_DISABLED", {
              //   baseDisabled,
              //   canSubmit,
              //   tokenAllowed
              // });
              return (
                <button
                  key={`${rowIndex}-${colIndex}-${token}`}
                  type="button"
                  onMouseDown={() => {
                    if (resolved === "5") {
                      // console.log("TRACE_MOUSE_DOWN", "5");
                      onInput?.("5");
                      return;
                    }
                    // console.log("TRACE_MOUSE_DOWN");
                  }}
                  onClick={() => {
                    if (resolved === "5") {
                      // console.log("TRACE_CLICK", "5");
                      onInput?.("5");
                      return;
                    }
                    // console.log("TRACE_KEY_CLICK", resolved);
                    // console.log("TRACE_KEY_PRESS", resolved);
                    onInput?.(resolved);
                  }}
                  disabled={!tokenAllowed}
                  style={{
                    outline: "2px solid red",
                    pointerEvents: "auto",
                    position: "relative",
                    zIndex: 9999
                  }}
                  className={`
                    elementary-key pointer-events-auto w-full h-full p-3 font-bold leading-tight rounded-[12px] shadow-[0_3px_0_rgba(0,0,0,0.15)] active:translate-y-[2px] active:shadow-[0_1px_0_rgba(0,0,0,0.15)] transition-all border border-[#cfd6df] flex items-center justify-center
                    ${isDecimal ? "whitespace-nowrap" : ""}
                    ${keySize}
                    ${!tokenAllowed ? "bg-[#f4f6f9] text-slate-400" : "bg-[#f4f6f9] text-slate-700 hover:bg-[#e9edf3]"}
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
          className="row-span-1 h-full w-full rounded-lg text-base font-bold shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px] transition-all bg-red-100 text-red-600 border border-red-200 hover:bg-red-200 flex items-center justify-center"
        >
          ⌫
        </button>
        <button
          type="button"
          onClick={() => {
            // console.log("TRACE_BUTTON_FINAL");
            onJudge?.();
          }}
          disabled={baseDisabled || !canSubmit}
          className="row-span-2 h-full w-full rounded-lg text-lg font-black shadow-[0_3px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[3px] transition-all bg-indigo-600 text-white border border-indigo-700 hover:bg-indigo-700 flex items-center justify-center"
        >
          {judgeLabel}
        </button>
        <button
          type="button"
          onClick={onEnd}
          disabled={endDisabled}
          className="row-span-1 h-full w-full rounded-md text-sm font-bold shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px] transition-all bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700 disabled:bg-slate-300 flex items-center justify-center"
        >
          {endLabel}
        </button>
      </div>
    </div>
  );
}
