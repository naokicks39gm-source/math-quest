export function useMemoCanvas(args: any) {
  const {
    memoCanvasRef,
    drawAreaRef,
    memoStrokesRef,
    memoActiveStrokeRef,
    memoActivePointerIdRef,
    memoDrawRafRef,
    memoPointersRef,
    memoPinchStartRef,
    memoCanvasSize,
    calcZoom,
    calcPan,
    isPinchingMemo,
    setCalcZoom,
    setCalcPan,
    setMemoRedoStack,
    setMemoStrokes,
    setIsPinchingMemo,
    MIN_MEMO_ZOOM,
    MAX_MEMO_ZOOM,
    MEMO_BRUSH_WIDTH,
    MEMO_WORKSPACE_SCALE,
    OUTER_MARGIN,
    clamp
  } = args;

  const memoLogicalWidth = Math.ceil((memoCanvasSize.width / MIN_MEMO_ZOOM) * MEMO_WORKSPACE_SCALE) + OUTER_MARGIN * 2;
  const memoLogicalHeight = Math.ceil((memoCanvasSize.height / MIN_MEMO_ZOOM) * MEMO_WORKSPACE_SCALE) + OUTER_MARGIN * 2;
  const memoOffsetX = memoCanvasSize.width / 2 - (memoLogicalWidth * calcZoom) / 2 + calcPan.x;
  const memoOffsetY = memoCanvasSize.height / 2 - (memoLogicalHeight * calcZoom) / 2 + calcPan.y;
  const memoDistance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  const memoMidpoint = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  });
  const getMemoLogicalPoint = (clientX: number, clientY: number) => {
    const host = drawAreaRef.current;
    if (!host) return null;
    const rect = host.getBoundingClientRect();
    const x = (clientX - rect.left - memoOffsetX) / calcZoom;
    const y = (clientY - rect.top - memoOffsetY) / calcZoom;
    return {
      x: clamp(x, 0, memoLogicalWidth),
      y: clamp(y, 0, memoLogicalHeight)
    };
  };

  const drawMemoCanvas = () => {
    const canvas = memoCanvasRef.current;
    if (!canvas) return;
    const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(memoCanvasSize.width));
    const height = Math.max(1, Math.floor(memoCanvasSize.height));
    const pixelWidth = Math.max(1, Math.floor(width * dpr));
    const pixelHeight = Math.max(1, Math.floor(height * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(memoOffsetX, memoOffsetY);
    ctx.scale(calcZoom, calcZoom);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = MEMO_BRUSH_WIDTH;
    const drawStroke = (stroke: any) => {
      if (stroke.points.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        const p = stroke.points[i];
        ctx.lineTo(p.x, p.y);
      }
      if (stroke.points.length === 1) {
        const p = stroke.points[0];
        ctx.lineTo(p.x + 0.01, p.y + 0.01);
      }
      ctx.stroke();
    };
    memoStrokesRef.current.forEach(drawStroke);
    if (memoActiveStrokeRef.current) {
      drawStroke(memoActiveStrokeRef.current);
    }
    ctx.restore();
  };

  const scheduleMemoRedraw = () => {
    if (memoDrawRafRef.current) return;
    memoDrawRafRef.current = window.requestAnimationFrame(() => {
      memoDrawRafRef.current = null;
      drawMemoCanvas();
    });
  };

  const clearMemo = () => {
    memoActiveStrokeRef.current = null;
    memoActivePointerIdRef.current = null;
    memoStrokesRef.current = [];
    setCalcPan({ x: 0, y: 0 });
    setMemoRedoStack([]);
    setMemoStrokes([]);
    drawMemoCanvas();
  };

  const undoMemo = () => {
    const current = memoStrokesRef.current;
    if (current.length === 0) return;
    const next = current.slice(0, -1);
    const last = current[current.length - 1];
    memoStrokesRef.current = next;
    setMemoRedoStack((redo: any[]) => [...redo, last]);
    setMemoStrokes(next);
    drawMemoCanvas();
  };

  const handleMemoPointerDown = (e: any) => {
    if (e.pointerType === "touch") {
      e.preventDefault();
      memoPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (memoPointersRef.current.size === 2) {
        const [p1, p2] = [...memoPointersRef.current.values()];
        if (!p1 || !p2) return;
        if (memoActiveStrokeRef.current?.points.length) {
          const stroke = memoActiveStrokeRef.current;
          memoActiveStrokeRef.current = null;
          memoActivePointerIdRef.current = null;
          memoStrokesRef.current = [...memoStrokesRef.current, stroke];
          setMemoStrokes(memoStrokesRef.current);
        }
        memoPinchStartRef.current = {
          distance: Math.max(1, memoDistance(p1, p2)),
          zoom: calcZoom,
          mid: memoMidpoint(p1, p2),
          pan: calcPan
        };
        setIsPinchingMemo(true);
        drawMemoCanvas();
        return;
      }
      if (memoPointersRef.current.size > 1) return;
    }
    if (isPinchingMemo) return;
    const point = getMemoLogicalPoint(e.clientX, e.clientY);
    if (!point) return;
    memoActivePointerIdRef.current = e.pointerId;
    memoActiveStrokeRef.current = { points: [point] };
    setMemoRedoStack([]);
    drawMemoCanvas();
  };

  const handleMemoPointerMove = (e: any) => {
    if (e.pointerType === "touch" && memoPointersRef.current.has(e.pointerId)) {
      memoPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (memoPointersRef.current.size >= 2 && memoPinchStartRef.current) {
      e.preventDefault();
      const [p1, p2] = [...memoPointersRef.current.values()];
      if (!p1 || !p2) return;
      const dist = Math.max(1, memoDistance(p1, p2));
      const mid = memoMidpoint(p1, p2);
      const start = memoPinchStartRef.current;
      const zoomRatio = dist / start.distance;
      const nextZoom = clamp(start.zoom * zoomRatio, MIN_MEMO_ZOOM, MAX_MEMO_ZOOM);
      const nextPan = {
        x: start.pan.x + (mid.x - start.mid.x),
        y: start.pan.y + (mid.y - start.mid.y)
      };
      setCalcZoom(nextZoom);
      setCalcPan(nextPan);
      scheduleMemoRedraw();
      return;
    }
    if (memoActivePointerIdRef.current !== e.pointerId) return;
    const point = getMemoLogicalPoint(e.clientX, e.clientY);
    if (!point || !memoActiveStrokeRef.current) return;
    memoActiveStrokeRef.current.points.push(point);
    drawMemoCanvas();
  };

  const handleMemoPointerEnd = (e: any) => {
    if (e.pointerType === "touch") {
      memoPointersRef.current.delete(e.pointerId);
    }
    if (memoActivePointerIdRef.current === e.pointerId && memoActiveStrokeRef.current) {
      const stroke = memoActiveStrokeRef.current;
      if (stroke.points.length > 0) {
        memoStrokesRef.current = [...memoStrokesRef.current, stroke];
        setMemoStrokes(memoStrokesRef.current);
      }
      memoActiveStrokeRef.current = null;
      memoActivePointerIdRef.current = null;
      drawMemoCanvas();
    }
    if (memoPointersRef.current.size < 2) {
      memoPinchStartRef.current = null;
      setIsPinchingMemo(false);
    }
  };

  return {
    drawMemoCanvas,
    scheduleMemoRedraw,
    clearMemo,
    undoMemo,
    handleMemoPointerDown,
    handleMemoPointerMove,
    handleMemoPointerEnd
  };
}
