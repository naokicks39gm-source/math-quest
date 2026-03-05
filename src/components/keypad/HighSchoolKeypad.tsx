import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, TouchEvent as ReactTouchEvent } from "react";
import { HIGH_KEYPAD, JUNIOR_KEYPAD, KEYS } from "packages/keypad";
import {
  keypadKeySizeClass,
  keypadRightColumnClass,
  resolveMathKeypadToken,
  type MathKeypadToken
} from "./BaseMathKeypad";

type SecondaryMode = "junior" | "highschool";

type Props = {
  mode: SecondaryMode;
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

type PressState = {
  pointerId: number;
  startY: number;
  currentY: number;
  longPressed: boolean;
  settled: boolean;
  longPressTimer: number | null;
  triggerButton: HTMLButtonElement | null;
};

const LONG_PRESS_MS = 220;
const TAP_DEADZONE = 6;
const PLUS_MINUS_SWITCH_PX = 0;

export function SecondaryMathKeypad({
  mode,
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
  const keySize = keypadKeySizeClass[mode];
  const rightColumnClass = keypadRightColumnClass[mode];
  const keypadLayout = mode === "junior" ? JUNIOR_KEYPAD : HIGH_KEYPAD;

  const plusPressRef = useRef<PressState | null>(null);
  const plusHandlersRef = useRef<{ move: (e: PointerEvent) => void; up: (e: PointerEvent) => void; cancel: (e: PointerEvent) => void } | null>(null);
  const plusTouchHandlersRef = useRef<{ move: (e: TouchEvent) => void; end: () => void; cancel: () => void } | null>(null);
  const [plusPopupOpen, setPlusPopupOpen] = useState(false);
  const [plusCandidate, setPlusCandidate] = useState<"+" | "-" | null>(null);
  const [plusAnchor, setPlusAnchor] = useState<{ left: number; top: number } | null>(null);

  const detachPlusWindow = () => {
    const h = plusHandlersRef.current;
    if (!h) return;
    window.removeEventListener("pointermove", h.move);
    window.removeEventListener("pointerup", h.up);
    window.removeEventListener("pointercancel", h.cancel);
    plusHandlersRef.current = null;
  };

  const detachPlusTouch = () => {
    const h = plusTouchHandlersRef.current;
    if (!h) return;
    window.removeEventListener("touchmove", h.move);
    window.removeEventListener("touchend", h.end);
    window.removeEventListener("touchcancel", h.cancel);
    plusTouchHandlersRef.current = null;
  };

  const clearPressTimer = (state: PressState | null) => {
    if (!state || state.longPressTimer === null) return;
    window.clearTimeout(state.longPressTimer);
    state.longPressTimer = null;
  };

  const resetPlusState = () => {
    clearPressTimer(plusPressRef.current);
    const active = plusPressRef.current;
    if (active?.triggerButton && active.triggerButton.hasPointerCapture(active.pointerId)) {
      active.triggerButton.releasePointerCapture(active.pointerId);
    }
    plusPressRef.current = null;
    detachPlusWindow();
    detachPlusTouch();
    setPlusPopupOpen(false);
    setPlusCandidate(null);
    setPlusAnchor(null);
  };

  const finishPlusPress = (event: Pick<PointerEvent, "pointerId" | "clientY"> | null, cancelled: boolean) => {
    const active = plusPressRef.current;
    if (!active) return;
    if (event && event.pointerId !== active.pointerId) return;
    active.settled = true;
    if (event) active.currentY = event.clientY;
    const deltaY = active.currentY - active.startY;
    const moved = Math.abs(deltaY) > TAP_DEADZONE;
    const token = cancelled ? null : (moved ? (deltaY < PLUS_MINUS_SWITCH_PX ? "+" : "-") : "+");
    resetPlusState();
    if (!token) return;
    onInput(token);
  };

  const startPlusPointerTracking = () => {
    detachPlusWindow();
    const move = (e: PointerEvent) => {
      const active = plusPressRef.current;
      if (!active) return;
      active.currentY = e.clientY;
      setPlusCandidate(e.clientY - active.startY < PLUS_MINUS_SWITCH_PX ? "+" : "-");
      if (active.longPressed) e.preventDefault();
    };
    const up = (e: PointerEvent) => finishPlusPress(e, false);
    const cancel = (e: PointerEvent) => finishPlusPress(e, true);
    plusHandlersRef.current = { move, up, cancel };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
  };

  const startPlusTouchTracking = () => {
    detachPlusTouch();
    const move = (e: TouchEvent) => {
      const active = plusPressRef.current;
      if (!active) return;
      const touch = Array.from(e.touches).find((t) => t.identifier === active.pointerId);
      if (!touch) return;
      active.currentY = touch.clientY;
      setPlusCandidate(touch.clientY - active.startY < PLUS_MINUS_SWITCH_PX ? "+" : "-");
      if (active.longPressed) e.preventDefault();
    };
    const end = () => finishPlusPress(null, false);
    const cancel = () => finishPlusPress(null, true);
    plusTouchHandlersRef.current = { move, end, cancel };
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", cancel);
  };

  const handlePlusDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (baseDisabled) return;
    resetPlusState();
    startPlusPointerTracking();
    const button = e.currentTarget;
    button.setPointerCapture(e.pointerId);
    const state: PressState = {
      pointerId: e.pointerId,
      startY: e.clientY,
      currentY: e.clientY,
      longPressed: false,
      settled: false,
      longPressTimer: null,
      triggerButton: button
    };
    state.longPressTimer = window.setTimeout(() => {
      const active = plusPressRef.current;
      if (!active || active.settled || active.pointerId !== state.pointerId) return;
      active.longPressed = true;
      setPlusPopupOpen(true);
      setPlusCandidate("+");
      const rect = button.getBoundingClientRect();
      setPlusAnchor({ left: rect.left + rect.width / 2, top: rect.top - 10 });
    }, LONG_PRESS_MS);
    plusPressRef.current = state;
  };

  const handlePlusTouchStart = (e: ReactTouchEvent<HTMLButtonElement>) => {
    if (baseDisabled) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    resetPlusState();
    startPlusTouchTracking();
    const button = e.currentTarget;
    const state: PressState = {
      pointerId: touch.identifier,
      startY: touch.clientY,
      currentY: touch.clientY,
      longPressed: false,
      settled: false,
      longPressTimer: null,
      triggerButton: button
    };
    state.longPressTimer = window.setTimeout(() => {
      const active = plusPressRef.current;
      if (!active || active.settled || active.pointerId !== state.pointerId) return;
      active.longPressed = true;
      setPlusPopupOpen(true);
      setPlusCandidate("+");
      const rect = button.getBoundingClientRect();
      setPlusAnchor({ left: rect.left + rect.width / 2, top: rect.top - 10 });
    }, LONG_PRESS_MS);
    plusPressRef.current = state;
  };

  useEffect(
    () => () => {
      resetPlusState();
    },
    []
  );

  const handleTokenTap = (token: MathKeypadToken) => {
    if (token === KEYS.PLUS_MINUS || token === KEYS.DELETE) return;
    onInput(resolveMathKeypadToken(token, "x"));
  };

  const isTokenDisabled = (token: MathKeypadToken) => {
    if (token === KEYS.DELETE) return true;
    if (token === KEYS.PLUS_MINUS) return baseDisabled || (!canUseKeyToken("+") && !canUseKeyToken("-"));
    const resolved = resolveMathKeypadToken(token, "x");
    return baseDisabled || !canUseKeyToken(resolved);
  };

  return (
    <>
      <div className="w-full flex items-stretch gap-2">
        <div className="flex-1 flex flex-col gap-1.5">
          {keypadLayout.map((row, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
            >
              {row.map((token, colIndex) => {
                if (token === KEYS.DELETE) return null;
                const typedToken = token as MathKeypadToken;
                const disabled = isTokenDisabled(typedToken);
                const isPlus = typedToken === KEYS.PLUS_MINUS;
                return (
                  <button
                    key={`${rowIndex}-${colIndex}-${token}`}
                    type="button"
                    onClick={() => handleTokenTap(typedToken)}
                    onPointerDown={isPlus ? handlePlusDown : undefined}
                    onPointerUp={isPlus ? (e) => finishPlusPress(e, false) : undefined}
                    onPointerCancel={isPlus ? (e) => finishPlusPress(e, true) : undefined}
                    onTouchStart={isPlus ? handlePlusTouchStart : undefined}
                    disabled={disabled}
                    className={`
                      relative w-full font-bold leading-tight shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px] transition-all border
                      ${keySize}
                      ${disabled ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}
                      ${isPlus && plusPopupOpen && plusCandidate === "-" ? "bg-rose-50 text-rose-700 border-rose-300" : ""}
                    `}
                    style={isPlus ? { touchAction: "none" } : undefined}
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
            className="h-full w-full rounded-lg text-sm font-bold shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px] transition-all bg-red-100 text-red-600 border border-red-200 hover:bg-red-200 flex items-center justify-center"
          >
            ⌫
          </button>
          <button
            type="button"
            onClick={onJudge}
            disabled={baseDisabled || !canSubmit}
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

      {plusPopupOpen && plusAnchor && typeof document !== "undefined"
        ? createPortal(
          <div
            className="pointer-events-none fixed z-[130] inline-flex w-[52px] -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-slate-300 bg-white/95 shadow-xl"
            style={{ left: plusAnchor.left, top: plusAnchor.top }}
            aria-hidden="true"
          >
            <div className={`flex h-8 items-center justify-center text-sm font-bold ${plusCandidate === "+" ? "bg-emerald-100 text-emerald-800" : "bg-white text-slate-700"}`}>+</div>
            <div className={`flex h-8 items-center justify-center text-sm font-bold border-t border-slate-200 ${plusCandidate === "-" ? "bg-rose-100 text-rose-700" : "bg-white text-slate-700"}`}>-</div>
          </div>,
          document.body
        )
        : null}
    </>
  );
}

export default function HighSchoolKeypad(props: Omit<Props, "mode">) {
  return <SecondaryMathKeypad mode="highschool" {...props} />;
}
