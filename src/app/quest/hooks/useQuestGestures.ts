import { useEffect } from "react";

export function useQuestGestures(args: any) {
  const {
    quest,
    isStarting,
    itemIndex,
    currentType,
    plusMinusPressRef,
    plusMinusWindowHandlersRef,
    plusMinusTouchHandlersRef,
    setPlusMinusPopupOpen,
    setPlusMinusCandidate,
    setPlusMinusPopupAnchor,
    PLUS_MINUS_POPUP_SWITCH_PX,
    PLUS_MINUS_TAP_DEADZONE_PX,
    PLUS_MINUS_LONG_PRESS_MS,
    onInput
  } = args;

  const clearPlusMinusPressTimer = (state: any) => {
    if (!state || state.longPressTimer === null) return;
    window.clearTimeout(state.longPressTimer);
    state.longPressTimer = null;
  };

  const detachPlusMinusWindowTracking = () => {
    const handlers = plusMinusWindowHandlersRef.current;
    if (!handlers) return;
    window.removeEventListener("pointermove", handlers.move);
    window.removeEventListener("pointerup", handlers.up);
    window.removeEventListener("pointercancel", handlers.cancel);
    plusMinusWindowHandlersRef.current = null;
  };

  const detachPlusMinusTouchTracking = () => {
    const handlers = plusMinusTouchHandlersRef.current;
    if (!handlers) return;
    window.removeEventListener("touchmove", handlers.move);
    window.removeEventListener("touchend", handlers.end);
    window.removeEventListener("touchcancel", handlers.cancel);
    plusMinusTouchHandlersRef.current = null;
  };

  const resolvePlusMinusTokenFromDelta = (deltaY: number) =>
    deltaY < PLUS_MINUS_POPUP_SWITCH_PX ? "+" as const : "-" as const;

  const resetPlusMinusInputState = (skipDetach = false) => {
    clearPlusMinusPressTimer(plusMinusPressRef.current);
    const active = plusMinusPressRef.current;
    if (active?.triggerButton && active.triggerButton.hasPointerCapture(active.pointerId)) {
      active.triggerButton.releasePointerCapture(active.pointerId);
    }
    plusMinusPressRef.current = null;
    if (!skipDetach) detachPlusMinusWindowTracking();
    if (!skipDetach) detachPlusMinusTouchTracking();
    setPlusMinusPopupOpen(false);
    setPlusMinusCandidate(null);
    setPlusMinusPopupAnchor(null);
  };

  const finalizePlusMinusPress = (
    event: Pick<PointerEvent, "pointerId" | "clientY"> | null,
    cancelled: boolean
  ) => {
    const active = plusMinusPressRef.current;
    if (!active) {
      resetPlusMinusInputState();
      return;
    }
    if (active.settled) {
      resetPlusMinusInputState();
      return;
    }
    if (event && event.pointerId !== active.pointerId) return;
    active.settled = true;
    if (event) {
      active.currentY = event.clientY;
    }
    const deltaY = active.currentY - active.startY;
    const movedBeyondTap = Math.abs(deltaY) > PLUS_MINUS_TAP_DEADZONE_PX;
    const token = cancelled
      ? null
      : (movedBeyondTap ? resolvePlusMinusTokenFromDelta(deltaY) : "+" as const);
    resetPlusMinusInputState();
    if (token) onInput(token);
  };

  const attachPlusMinusWindowTracking = () => {
    detachPlusMinusWindowTracking();
    const move = (event: PointerEvent) => {
      const active = plusMinusPressRef.current;
      if (!active || active.pointerId !== event.pointerId || active.settled) return;
      active.currentY = event.clientY;
      if (!active.longPressed) return;
      setPlusMinusCandidate(resolvePlusMinusTokenFromDelta(active.currentY - active.startY));
      event.preventDefault();
    };
    const up = (event: PointerEvent) => {
      finalizePlusMinusPress(event, false);
    };
    const cancel = (event: PointerEvent) => {
      finalizePlusMinusPress(event, true);
    };
    plusMinusWindowHandlersRef.current = { move, up, cancel };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
  };

  const findTouchById = (touches: TouchList, id: number) => {
    for (let i = 0; i < touches.length; i += 1) {
      if (touches[i].identifier === id) return touches[i];
    }
    return null;
  };

  const attachPlusMinusTouchTracking = () => {
    detachPlusMinusTouchTracking();
    const move = (event: TouchEvent) => {
      const active = plusMinusPressRef.current;
      if (!active || active.settled) return;
      const touch = findTouchById(event.touches, active.pointerId) ?? findTouchById(event.changedTouches, active.pointerId);
      if (!touch) return;
      active.currentY = touch.clientY;
      if (active.longPressed) {
        setPlusMinusCandidate(resolvePlusMinusTokenFromDelta(active.currentY - active.startY));
      }
      event.preventDefault();
    };
    const end = (event: TouchEvent) => {
      const active = plusMinusPressRef.current;
      if (!active || active.settled) return;
      const touch = findTouchById(event.changedTouches, active.pointerId);
      if (!touch) return;
      finalizePlusMinusPress({ pointerId: active.pointerId, clientY: touch.clientY }, false);
    };
    const cancel = (event: TouchEvent) => {
      const active = plusMinusPressRef.current;
      if (!active || active.settled) return;
      const touch = findTouchById(event.changedTouches, active.pointerId);
      if (!touch) return;
      finalizePlusMinusPress({ pointerId: active.pointerId, clientY: touch.clientY }, true);
    };
    plusMinusTouchHandlersRef.current = { move, end, cancel };
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", cancel);
  };

  const handlePlusMinusFlickStart = (e: any) => {
    if (quest.status !== "playing" || isStarting) return;
    e.preventDefault();
    resetPlusMinusInputState();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const state: any = {
      pointerId: e.pointerId,
      startY: e.clientY,
      currentY: e.clientY,
      longPressed: false,
      settled: false,
      longPressTimer: null,
      triggerButton: e.currentTarget
    };
    attachPlusMinusWindowTracking();
    state.longPressTimer = window.setTimeout(() => {
      const active = plusMinusPressRef.current;
      if (!active || active.pointerId !== e.pointerId) return;
      active.longPressed = true;
      active.longPressTimer = null;
      const candidate = resolvePlusMinusTokenFromDelta(active.currentY - active.startY);
      setPlusMinusPopupAnchor({ left: rect.left + rect.width / 2, top: rect.top - 72 });
      setPlusMinusPopupOpen(true);
      setPlusMinusCandidate(candidate);
    }, PLUS_MINUS_LONG_PRESS_MS);
    plusMinusPressRef.current = state;
  };

  const handlePlusMinusTouchStart = (e: any) => {
    if (quest.status !== "playing" || isStarting) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    e.preventDefault();
    resetPlusMinusInputState();
    const rect = e.currentTarget.getBoundingClientRect();
    const state: any = {
      pointerId: touch.identifier,
      startY: touch.clientY,
      currentY: touch.clientY,
      longPressed: false,
      settled: false,
      longPressTimer: null,
      triggerButton: e.currentTarget
    };
    attachPlusMinusTouchTracking();
    state.longPressTimer = window.setTimeout(() => {
      const active = plusMinusPressRef.current;
      if (!active || active.pointerId !== touch.identifier) return;
      active.longPressed = true;
      active.longPressTimer = null;
      const candidate = resolvePlusMinusTokenFromDelta(active.currentY - active.startY);
      setPlusMinusPopupAnchor({ left: rect.left + rect.width / 2, top: rect.top - 72 });
      setPlusMinusPopupOpen(true);
      setPlusMinusCandidate(candidate);
    }, PLUS_MINUS_LONG_PRESS_MS);
    plusMinusPressRef.current = state;
  };

  const handlePlusMinusFlickEnd = (e: any) => {
    if (quest.status !== "playing" || isStarting) return;
    finalizePlusMinusPress({ pointerId: e.pointerId, clientY: e.clientY }, false);
  };

  const handlePlusMinusFlickCancel = (e: any) => {
    finalizePlusMinusPress({ pointerId: e.pointerId, clientY: e.clientY }, true);
  };

  useEffect(() => {
    resetPlusMinusInputState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIndex, currentType?.type_id, quest.status]);

  useEffect(
    () => () => {
      resetPlusMinusInputState();
    },
    []
  );

  return {
    handlePlusMinusFlickStart,
    handlePlusMinusTouchStart,
    handlePlusMinusFlickEnd,
    handlePlusMinusFlickCancel,
    resetPlusMinusInputState
  };
}
