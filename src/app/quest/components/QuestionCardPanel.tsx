import { InlineMath } from "react-katex";
import SecondaryExplanationPanel from "@/components/SecondaryExplanationPanel";
import { QuestMemoPanel } from "./QuestMemoPanel";

type Props = {

quest:any;
combo:number;
nextQuestion:any;
uiText:any;
currentCardRef:any;
qaRowRef:any;
qaPromptRef:any;
qaPromptContentRef:any;
qaAnswerRef:any;
qaAnswerContentRef:any;
quizBuildError:any;
router:any;
setRetryNonce:any;
describeStockReason:any;

/* QuestionCardPanel Props 追加 */

useSingleLineQa:boolean;
useFastLearningLoop:boolean;

/* current */
currentItem:any;
currentType:any;
currentAid:any;
currentElementaryAid:any;

currentSkillProgress:any;
currentPatternPool:string[];
currentSessionSeed:any;
currentLearningIndex:number;

currentLearningIsFallback:boolean;
currentLearningFallbackCount:number;

/* is */
isStarting:boolean;

isSecondaryQuest:boolean;
isElementaryQuest:boolean;
isHighSchoolQuest:boolean;

isLearningSessionMode:boolean;

isQuadraticRootsQuestion:boolean;
isH1ReferenceOnlyQuestion:boolean;
isE1TwoLineQuestionLevel:boolean;
isE2EqualShareType:boolean;

/* show */
showLearningHint:boolean;
showLearningExplanation:boolean;

showSecondaryHint:boolean;
showSecondaryExplanation:boolean;

showElementaryHint:boolean;
showElementaryExplanation:boolean;

showHighSchoolHint:boolean;

/* setters */
setShowSecondaryHint:any;
setShowSecondaryExplanation:any;

setShowElementaryHint:any;
setShowElementaryExplanation:any;

setShowHighSchoolHint:any;

/* render */
renderPrompt:any;
renderFractionEditorValue:any;
renderAnswerWithSuperscript:any;

/* QA layout */
qaPromptFontPx:number;
qaAnswerFontPx:number;
qaAnswerOffsetPx:number;

/* answer */
fractionInput:any;
displayedAnswer:any;

quadraticFractionInputs:any;
quadraticAnswers:any;
quadraticActiveIndex:number;

setQuadraticActiveIndex:any;

resultOverlay:any;

/* quiz */
quizItems:any[];
emptyMessage:string;

devMode:boolean;

learningState:any;
learningProblem:any;

/* stock */
stockShortages:any[];
activePickMeta:any;
activeStockInfo:any;

quizSize:number;

shouldAutoFinishLearningSession:boolean;

/* learning */
skipFromExplanation:any;

currentElementaryHintText:string;

/* memo */
undoMemo:any;
clearMemo:any;

memoCanvasHostRef:any;
drawAreaRef:any;
memoCanvasRef:any;

handleMemoPointerDown:any;
handleMemoPointerMove:any;
handleMemoPointerEnd:any;

shouldRenderElementaryExplanationPanel:boolean;

};

export function QuestionCardPanel({

quest,
currentItem,
currentType,
combo,
nextQuestion,
uiText,
isStarting,

useSingleLineQa,
useFastLearningLoop,

currentCardRef,
qaRowRef,
qaPromptRef,
qaPromptContentRef,
qaAnswerRef,
qaAnswerContentRef,

currentAid,
currentElementaryAid,

currentSkillProgress,
currentPatternPool,
currentSessionSeed,
currentLearningIndex,

currentLearningIsFallback,
currentLearningFallbackCount,

isSecondaryQuest,
isElementaryQuest,
isHighSchoolQuest,

isLearningSessionMode,

isQuadraticRootsQuestion,
isH1ReferenceOnlyQuestion,
isE1TwoLineQuestionLevel,
isE2EqualShareType,

showLearningHint,
showLearningExplanation,

showSecondaryHint,
showSecondaryExplanation,

showElementaryHint,
showElementaryExplanation,

showHighSchoolHint,

setShowSecondaryHint,
setShowSecondaryExplanation,

setShowElementaryHint,
setShowElementaryExplanation,

setShowHighSchoolHint,

renderPrompt,
renderFractionEditorValue,
renderAnswerWithSuperscript,

qaPromptFontPx,
qaAnswerFontPx,
qaAnswerOffsetPx,

fractionInput,
displayedAnswer,

quadraticFractionInputs,
quadraticAnswers,
quadraticActiveIndex,

setQuadraticActiveIndex,

resultOverlay,
quizBuildError,
router,
setRetryNonce,
describeStockReason,

quizItems,
emptyMessage,

devMode,

learningState,
learningProblem,

stockShortages,
activePickMeta,
activeStockInfo,

quizSize,

shouldAutoFinishLearningSession,

skipFromExplanation,

currentElementaryHintText,

undoMemo,
clearMemo,

memoCanvasHostRef,
drawAreaRef,
memoCanvasRef,

handleMemoPointerDown,
handleMemoPointerMove,
handleMemoPointerEnd,

shouldRenderElementaryExplanationPanel

}:Props){

return(

<>


            <div
              ref={currentCardRef}
              className="relative overflow-hidden rounded-2xl border-x-[10px] border-t-[10px] border-b-[14px] border-x-amber-700 border-t-amber-700 border-b-slate-300 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 
              mt-25 px-6 py-1 text-emerald-50 text-2xl font-black shadow-[inset_0_0_0_2px_rgba(255,255,255,0.08),inset_0_0_45px_rgba(0,0,0,0.45),0_10px_28px_rgba(0,0,0,0.35)] min-h-[200px] sm:min-h-[240px] flex items-center justify-center"
            >
              <div className="pointer-events-none absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_12%_20%,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.10),transparent_34%),repeating-linear-gradient(12deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_2px,transparent_2px,transparent_8px)]" />
              {combo >= 2 && (
                <div className="pointer-events-none absolute top-2 right-2 -rotate-12 rounded-md border border-yellow-200/70 bg-yellow-300/90 px-2 py-0.5 text-[10px] sm:text-xs font-black tracking-wide text-emerald-950 shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                  れんぞく {combo} かい
                </div>
              )}
              <div className="pointer-events-none absolute bottom-0 left-3 flex items-end gap-2">
                <div aria-label="board-eraser" className="h-6 w-12 rounded-md border border-amber-900 bg-gradient-to-b from-amber-200 to-amber-500 shadow-[0_2px_0_rgba(0,0,0,0.28)]" />
                <div className="flex items-end gap-1">
                  <div aria-label="board-chalk-white" className="h-2.5 w-7 rounded-full border border-slate-300 bg-white shadow-[0_1px_0_rgba(0,0,0,0.2)]" />
                  <div aria-label="board-chalk-pink" className="h-2.5 w-6 rounded-full border border-pink-300 bg-pink-100 shadow-[0_1px_0_rgba(0,0,0,0.2)]" />
                  <div aria-label="board-chalk-blue" className="h-2.5 w-6 rounded-full border border-sky-300 bg-sky-100 shadow-[0_1px_0_rgba(0,0,0,0.2)]" />
                </div>
              </div>
              {!useFastLearningLoop && (
                <button
                  type="button"
                  onClick={nextQuestion}
                  disabled={quest.status !== "playing" || isStarting}
                  className="absolute bottom-3 right-3 z-20 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs sm:text-sm font-bold text-emerald-900 shadow-[0_2px_0_rgba(0,0,0,0.25)] active:translate-y-[1px] disabled:bg-slate-300 disabled:text-slate-500"
                >
                  {uiText.nextQuestion}
                </button>
              )}
              <div
                ref={qaRowRef}
                className={
                  useSingleLineQa
                    ? "relative z-10 w-full flex flex-wrap items-start justify-start gap-5  sm:gap-3"
                    : "relative z-10 w-full flex flex-col justify-start gap-1 pt-1 sm:gap-2"
                }
              >
                <div
                  ref={qaPromptRef}
                  style={(isSecondaryQuest || isE2EqualShareType) ? { fontSize: `${qaPromptFontPx}px` } : undefined}
                  className={
                    useSingleLineQa
                      ? "min-w-0 w-auto max-w-full whitespace-normal break-words text-[28px] sm:text-[32px] leading-tight font-extrabold text-emerald-50"
                      : isE1TwoLineQuestionLevel
                        ? "min-w-0 w-full whitespace-normal break-words text-[28px] sm:text-[32px] leading-tight font-extrabold text-emerald-50"
                        : isE2EqualShareType
                        ? "min-w-0 w-full whitespace-normal break-words text-[20px] sm:text-[24px] leading-tight font-extrabold text-emerald-50"
                        : "min-w-0 w-full overflow-x-auto whitespace-nowrap text-[28px] sm:text-[32px] leading-tight font-extrabold text-emerald-50"
                  }
                >
                  <span
                    ref={qaPromptContentRef}
                    className={isE2EqualShareType || isE1TwoLineQuestionLevel ? "block whitespace-normal break-words align-middle" : "inline-block whitespace-normal break-words align-middle"}
                  >
                    {currentItem ? renderPrompt(currentItem, currentType?.type_id, currentType?.display_name ?? currentType?.type_name) : null}
                  </span>
                </div>
                {isH1ReferenceOnlyQuestion && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/95 px-3 py-2 text-sm font-bold text-amber-900">
                    このカードは例題表示のみです。右下の「次へ」で進めます。
                  </div>
                )}
                {isQuadraticRootsQuestion ? (
                  <div
                    ref={qaAnswerRef}
                    className={
                      useSingleLineQa
                        ? "w-auto shrink-0 flex items-center gap-2 overflow-x-auto whitespace-nowrap"
                        : "w-full sm:w-auto flex items-center gap-2 overflow-x-auto whitespace-nowrap"
                    }
                    style={useSingleLineQa ? undefined : { marginLeft: `${qaAnswerOffsetPx}px` }}
                  >
                    <div ref={qaAnswerContentRef} className="relative inline-flex items-center gap-2 overflow-visible">
                      <span className="text-[20px] sm:text-[24px] font-bold text-emerald-100" style={isSecondaryQuest ? { fontSize: `${Math.max(18, qaAnswerFontPx - 6)}px` } : undefined}>x1 =</span>
                      <button
                        type="button"
                        onClick={() => setQuadraticActiveIndex(0)}
                        aria-label="recognized-answer-1"
                        className={`${quadraticFractionInputs[0].enabled ? "w-[98px] sm:w-[116px] h-[64px] sm:h-[76px] text-[18px] sm:text-[22px]" : "w-[72px] sm:w-[84px] h-[48px] sm:h-[56px] text-[22px] sm:text-[26px]"} shrink-0 px-2 sm:px-3 rounded-xl border-2 font-extrabold text-center overflow-x-auto whitespace-nowrap flex items-center justify-center ${
                          quadraticActiveIndex === 0 ? "border-emerald-300 bg-emerald-100 text-emerald-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"
                        }`}
                        style={{
                          opacity: quadraticFractionInputs[0].enabled ? 1 : (quadraticAnswers[0] ? 1 : 0.35),
                          fontSize: isSecondaryQuest ? `${qaAnswerFontPx}px` : undefined
                        }}
                      >
                        {quadraticFractionInputs[0].enabled
                          ? renderFractionEditorValue(quadraticFractionInputs[0])
                          : renderAnswerWithSuperscript(quadraticAnswers[0])}
                      </button>
                      <span className="text-[20px] sm:text-[24px] font-bold text-emerald-100" style={isSecondaryQuest ? { fontSize: `${Math.max(18, qaAnswerFontPx - 6)}px` } : undefined}>x2 =</span>
                      <button
                        type="button"
                        onClick={() => setQuadraticActiveIndex(1)}
                        aria-label="recognized-answer-2"
                        className={`${quadraticFractionInputs[1].enabled ? "w-[98px] sm:w-[116px] h-[64px] sm:h-[76px] text-[18px] sm:text-[22px]" : "w-[72px] sm:w-[84px] h-[48px] sm:h-[56px] text-[22px] sm:text-[26px]"} shrink-0 px-2 sm:px-3 rounded-xl border-2 font-extrabold text-center overflow-x-auto whitespace-nowrap flex items-center justify-center ${
                          quadraticActiveIndex === 1 ? "border-emerald-300 bg-emerald-100 text-emerald-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"
                        }`}
                        style={{
                          opacity: quadraticFractionInputs[1].enabled ? 1 : (quadraticAnswers[1] ? 1 : 0.35),
                          fontSize: isSecondaryQuest ? `${qaAnswerFontPx}px` : undefined
                        }}
                      >
                        {quadraticFractionInputs[1].enabled
                          ? renderFractionEditorValue(quadraticFractionInputs[1])
                          : renderAnswerWithSuperscript(quadraticAnswers[1])}
                      </button>
                      {resultOverlay}
                    </div>
                  </div>
                ) : (
                  <div
                    ref={qaAnswerRef}
                    className={
                      useSingleLineQa
                        ? "relative w-auto shrink-0 flex items-center gap-2 overflow-visible"
                        : "relative w-full sm:w-auto flex items-center gap-2 overflow-visible"
                    }
                    style={useSingleLineQa ? undefined : { marginLeft: `${qaAnswerOffsetPx}px` }}
                  >
                    <div ref={qaAnswerContentRef} className="relative inline-flex items-center gap-2 overflow-visible">
                      {isSecondaryQuest ? (
                        <span className="text-[24px] sm:text-[30px] leading-none font-extrabold text-emerald-100" style={isSecondaryQuest ? { fontSize: `${qaAnswerFontPx}px` } : undefined}>=</span>
                      ) : null}
                      <div className={`relative overflow-visible ${fractionInput.enabled ? "w-[190px] sm:w-[220px]" : "w-[150px] sm:w-[180px]"}`}>
                        <div
                          aria-label="recognized-answer"
                          className={`${fractionInput.enabled ? "w-[190px] sm:w-[220px] h-[74px] sm:h-[84px] text-[20px] sm:text-[24px]" : "w-[150px] sm:w-[180px] h-[56px] sm:h-[64px] text-[26px] sm:text-[30px]"} shrink-0 max-w-full px-2 sm:px-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-900 font-extrabold text-center overflow-x-auto whitespace-nowrap flex items-center justify-center`}
                          style={{
                            opacity: fractionInput.enabled ? 1 : (displayedAnswer ? 1 : 0.35),
                            fontSize: isSecondaryQuest ? `${qaAnswerFontPx}px` : undefined
                          }}
                        >
                          {fractionInput.enabled
                            ? renderFractionEditorValue(fractionInput)
                            : renderAnswerWithSuperscript(displayedAnswer || "")}
                        </div>
                        {resultOverlay}
                      </div>
                    </div>
                  </div>
                )}
              </div> 
              </div>
      {quest.status === "playing" && (
        <div aria-hidden="true" className="h-[292px] sm:h-[276px]" />
      )}
      {/* Center: Character & Message */} 
      <div className="flex flex-col items-center space-y-3 my-2 flex-1 justify-start w-full">
        {quest.learningLoading ? (
          <div className="w-full text-center rounded-2xl border border-sky-200 bg-sky-50 px-4 py-6 shadow-sm">
            <div className="text-base font-black text-sky-700">れんしゅうを じゅんびちゅうです</div>
            <div className="mt-2 text-sm text-sky-700">れんしゅうを じゅんびしています...</div>
          </div>
        ) : quest.status === 'blocked' ? (
          <div className="w-full text-center rounded-2xl border border-red-200 bg-red-50 px-4 py-6 shadow-sm">
            <div className="text-base font-black text-red-700">出題を準備できませんでした</div>
            <div className="mt-2 text-sm text-red-700">
              {quizBuildError ?? "このタイプは一時的に出題候補不足です。別タイプを選ぶか、時間をおいて再試行してください。"}
            </div>
            {stockShortages.length > 0 && (
              <div className="mt-3 rounded-lg border border-red-200 bg-white/70 px-3 py-2 text-left">
                <div className="text-xs font-bold text-red-700">候補不足タイプ一覧</div>
                <ul className="mt-1 space-y-1 text-xs text-red-700">
                  {stockShortages.slice(0, 8).map((item) => (
                    <li key={item.typeId}>
                      {item.typeName} ({item.typeId}): {item.count}題 / 理由 {describeStockReason(item.reason)}
                      {item.reasonDetail ? ` (${item.reasonDetail})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => setRetryNonce((prev: number) => prev + 1)}
                className="w-full px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold"
              >
                もう一度ためす
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="w-full px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold"
              >
                トップへ戻る
              </button>
            </div>
          </div>
        ) : (
          <>
            {stockShortages.length > 0 && (
              <div className="w-full mb-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-left">
                <div className="text-xs font-bold text-amber-800">候補不足タイプ一覧</div>
                {activePickMeta && (
                  <div className="mt-1 text-[11px] text-amber-700">
                    抽出: 要求 {activePickMeta.requested} / 有効候補 {activePickMeta.availableAfterDedupe} / 取得 {activePickMeta.picked}
                  </div>
                )}
                <ul className="mt-1 space-y-1 text-xs text-amber-800">
                  {stockShortages.slice(0, 8).map((item) => (
                    <li key={item.typeId}>
                      {item.typeName} ({item.typeId}): {item.count}題 / 理由 {describeStockReason(item.reason)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {devMode && (
              <div className="w-full mb-2 rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-left">
                {isLearningSessionMode ? (
                  <>
                    <div className="text-xs font-bold text-sky-800">DEV診断: Learning Engine</div>
                    <div className="mt-1 space-y-0.5 text-[11px] text-sky-900">
                      <div>skillId: {quest.session?.skillId ?? "-"}</div>
                      <div>skillProgress: {currentSkillProgress ? JSON.stringify(currentSkillProgress) : "-"}</div>
                      <div>studentXP: {learningState?.student.xpTotal ?? 0}</div>
                      <div>sessionXP: {learningState?.student.xpSession ?? 0}</div>
                      <div>studentLevel: {learningState?.student.level ?? 1}</div>
                      <div>targetDifficulty: {quest.session?.startedDifficulty ?? "-"}</div>
                      <div>patternPool:</div>
                      {currentPatternPool.length > 0 ? (
                        <div className="whitespace-pre-wrap pl-3">
                          {currentPatternPool.join("\n")}
                        </div>
                      ) : (
                        <div className="pl-3">-</div>
                      )}
                      <div>selectedPattern: {learningProblem?.patternKey ?? learningProblem?.problem.meta?.source ?? "-"}</div>
                      <div>sessionSeed: {currentSessionSeed}</div>
                      <div className="pt-1">session</div>
                      <div className="pl-3">size: {quest.session?.problems.length ?? 0}</div>
                      <div className="pl-3">index: {currentLearningIndex + 1} / {quest.session?.problems.length ?? 0}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs font-bold text-sky-800">DEV診断: Lv/type/stock</div>
                    <div className="mt-1 space-y-0.5 text-[11px] text-sky-900">
                      <div>表示: {currentType?.display_name ?? currentType?.type_name ?? "-"}</div>
                      <div>type_id: {currentType?.type_id ?? "-"}</div>
                      <div>pattern_id: {currentType?.generation_params?.pattern_id ?? "-"}</div>
                      <div>stock.count: {activeStockInfo?.count ?? 0}</div>
                      <div>stock.reason: {activeStockInfo?.reason ?? "-"}</div>
                      <div>stock.reason_detail: {activeStockInfo?.reasonDetail ?? "-"}</div>
                      <div>stock.unique: {activeStockInfo?.uniqueCount ?? 0}</div>
                      <div>stock.expanded: {activeStockInfo?.expandedCount ?? 0}</div>
                      <div>pick: {activePickMeta?.picked ?? 0} / {activePickMeta?.requested ?? quizSize}</div>
                    </div>
                  </>
                )}
              </div>
            )}
            {!shouldAutoFinishLearningSession && (quizItems.length === 0 || !currentItem) && (
              <div className="w-full text-slate-500 text-center">
                {quizItems.length === 0 ? emptyMessage : uiText.selectType}
              </div>
            )}

            {(currentAid || (isElementaryQuest && currentElementaryAid)) && (
              isSecondaryQuest ? (
                <section className="w-full">
                  <div className={`grid gap-2 ${showLearningExplanation ? "grid-cols-1" : "grid-cols-2"}`}>
                    {(!isLearningSessionMode || showLearningHint) && (
                      <button
                        type="button"
                        onClick={() => setShowSecondaryHint((prev: boolean) => !prev)}
                        className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-left text-base font-bold text-indigo-700"
                      >
                        {showSecondaryHint ? "ヒントを隠す" : "ヒントを見る"}
                      </button>
                    )}
                    {(!isLearningSessionMode || showLearningExplanation) && (
                      <button
                        type="button"
                        onClick={() => setShowSecondaryExplanation((prev: boolean) => !prev)}
                        className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-left text-base font-bold text-violet-700"
                      >
                        {showSecondaryExplanation ? "解説を隠す" : "解説を見る"}
                      </button>
                    )}
                  </div>
                  {(showSecondaryHint || (isLearningSessionMode && showLearningHint && !showLearningExplanation && showSecondaryHint)) && (
                    <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
                      <div className="text-sm font-bold text-amber-700">ヒント</div>
                      {isLearningSessionMode && currentLearningIsFallback ? (
                        <div className="mt-1 text-sm font-semibold text-amber-700">もう一度挑戦しよう</div>
                      ) : null}
                      {isLearningSessionMode && currentLearningFallbackCount >= 1 ? (
                        <div className="mt-1 text-sm font-semibold text-amber-700">別の問題に挑戦しよう</div>
                      ) : null}
                      {isLearningSessionMode && quest.learningHint ? (
                        <div className="whitespace-pre-line text-base font-semibold text-slate-800">{quest.learningHint}</div>
                      ) : currentAid!.hintLines && currentAid!.hintLines.length > 0 ? (
                        <ul className="mt-0.5 list-none space-y-1 pl-0 text-base font-semibold text-slate-800">
                          {currentAid!.hintLines.map((line: any, idx: number) => (
                            <li key={`hint-line-${idx}`} className="leading-7">
                              {line.kind === "tex" ? <InlineMath math={line.value} /> : line.value}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-base font-semibold text-slate-800">{currentAid!.hint}</div>
                      )}
                    </div>
                  )}
                  {showSecondaryExplanation && (
                    <div className="mt-2">
                      {isLearningSessionMode && quest.learningExplanation ? (
                        <section className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4 text-base text-slate-800">
                          <div className="rounded-lg border border-slate-200 bg-white p-4">
                            <div className="whitespace-pre-line text-base leading-7">{quest.learningExplanation}</div>
                            <button
                              type="button"
                              onClick={skipFromExplanation}
                              className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
                            >
                              {uiText.nextQuestion}
                            </button>
                          </div>
                        </section>
                      ) : (
                        <SecondaryExplanationPanel
                          aid={currentAid!}
                          onNext={skipFromExplanation}
                          nextLabel={uiText.nextQuestion}
                          showNextButton
                        />
                      )}
                    </div>
                  )}
                </section>
              ) : isElementaryQuest && currentElementaryAid ? (
                <section className="w-full">
                  <div className="space-y-2">
                    {(!isLearningSessionMode || showLearningHint) && (
                      <button
                        type="button"
                        onClick={() => setShowElementaryHint((prev: boolean) => !prev)}
                        className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-base font-bold text-amber-700"
                      >
                        {showElementaryHint ? "ヒントを隠す" : "ヒントを見る"}
                      </button>
                    )}
                    {(!isLearningSessionMode || showLearningExplanation) && (
                      <button
                        type="button"
                        onClick={() => setShowElementaryExplanation((prev: boolean) => !prev)}
                        className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-base font-bold text-emerald-700"
                      >
                        {showElementaryExplanation ? "解説を隠す" : "解説を見る"}
                      </button>
                    )}
                  </div>
                  {showElementaryHint && (
                    <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
                      <div className="text-sm font-bold text-amber-700">ヒント</div>
                      <div className="mt-1 text-base font-semibold text-slate-800">{currentElementaryHintText}</div>
                    </div>
                  )}
                </section>
              ) : (
                isHighSchoolQuest ? (
                  <section className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setShowHighSchoolHint((prev: boolean) => !prev)}
                      className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-amber-800 text-left hover:bg-amber-50"
                    >
                      {showHighSchoolHint ? "ヒントを閉じる" : "ヒントを見る"}
                    </button>
                    {showHighSchoolHint && (
                      <div className="mt-2">
                        <SecondaryExplanationPanel aid={currentAid!} />
                      </div>
                    )}
                  </section>
                ) : (
                  <SecondaryExplanationPanel aid={currentAid!} />
                )
              )
            )}

            <QuestMemoPanel
undoMemo={undoMemo}
clearMemo={clearMemo}
memoCanvasHostRef={memoCanvasHostRef}
drawAreaRef={drawAreaRef}
memoCanvasRef={memoCanvasRef}
handleMemoPointerDown={handleMemoPointerDown}
handleMemoPointerMove={handleMemoPointerMove}
handleMemoPointerEnd={handleMemoPointerEnd}
shouldRenderElementaryExplanationPanel={shouldRenderElementaryExplanationPanel}
currentElementaryAid={currentElementaryAid}
nextQuestion={nextQuestion}
uiText={uiText}
quest={quest}
isStarting={isStarting}
/>
          </>
        )}
      </div>

</>

);

}
