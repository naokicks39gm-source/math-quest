type Props = {

undoMemo:any

clearMemo:any

memoCanvasHostRef:any

drawAreaRef:any

memoCanvasRef:any

handleMemoPointerDown:any

handleMemoPointerMove:any

handleMemoPointerEnd:any

shouldRenderElementaryExplanationPanel:boolean

currentElementaryAid:any

nextQuestion:any

uiText:any

quest:any

isStarting:boolean

};

export function QuestMemoPanel({

undoMemo,

clearMemo,

memoCanvasHostRef,

drawAreaRef,

memoCanvasRef,

handleMemoPointerDown,

handleMemoPointerMove,

handleMemoPointerEnd,

shouldRenderElementaryExplanationPanel,

currentElementaryAid,

nextQuestion,

uiText,

quest,

isStarting

}:Props){

return (

<section className="w-full rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-md">
              <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-800">
                <span>計算メモ（2本指ピンチで縮小）</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={undoMemo}
                    className="px-2 py-1 rounded-md bg-slate-100 text-slate-700"
                  >
                    1つ戻る
                  </button>
                  <button
                    type="button"
                    onClick={clearMemo}
                    className="px-2 py-1 rounded-md bg-slate-700 text-white"
                  >
                    メモ消去
                  </button>
                </div>
              </div>
              {shouldRenderElementaryExplanationPanel && currentElementaryAid && (
                <ElementaryExplanationPanel
                  aid={currentElementaryAid}
                  onNext={nextQuestion}
                  nextLabel={uiText.nextQuestion}
                  disabled={quest.status !== "playing" || isStarting}
                />
              )}
              <div ref={memoCanvasHostRef} className="relative h-[40vh] min-h-[260px] w-full">
                <div
                  ref={drawAreaRef}
                  data-testid="calc-memo-area"
                  className="relative h-full w-full overflow-hidden bg-white"
                  style={{
                    touchAction: "none",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    WebkitTouchCallout: "none",
                    WebkitTapHighlightColor: "transparent"
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  onPointerDown={handleMemoPointerDown}
                  onPointerMove={handleMemoPointerMove}
                  onPointerUp={handleMemoPointerEnd}
                  onPointerCancel={handleMemoPointerEnd}
                  onPointerLeave={handleMemoPointerEnd}
                >
                  <canvas
                    ref={memoCanvasRef}
                    className="block h-full w-full select-none"
                    aria-label="calc-memo-canvas"
                    draggable={false}
                  />
                </div>
              </div>
            </section>

);

}