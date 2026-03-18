import { getPracticeSkill, practiceSkills } from "@/lib/learningSkillCatalog";
import { QuestHeader, SkillClearView, SkillProgressBar, SkillTreeView } from "packages/ui";
type Props = {

quest:any

isLearningSessionMode:boolean

selectedPath:any

showGradeTypePicker:boolean

setShowGradeTypePicker:any

expandedGradePicker:boolean

setExpandedGradePicker:any

expandedGradeList:boolean

setExpandedGradeList:any

expandedProblemPicker:boolean

setExpandedProblemPicker:any

pendingGradeName:any

gradeOptions:any

pickerGradeId:any

setPendingGradeId:any

router:any

currentItem:any

currentType:any

learningProblem:any

getPracticeSkill:any

currentLearningSkillId:any

currentSkillXP:any

currentSkillRequiredXP:any

learningState:any

skillTree:any

setShowSkillTree:any

showSkillTree:boolean

showCurrentSkillSummary:boolean

currentSkillNode:any

recommendedSkillNode:any

SkillTreeView:any

nextQuestion:any

uiText:any

currentCardRef:any

combo:number
};

export function QuestHeaderPanel({

quest,

isLearningSessionMode,

selectedPath,

showGradeTypePicker,
setShowGradeTypePicker,

expandedGradePicker,
setExpandedGradePicker,

expandedGradeList,
setExpandedGradeList,

expandedProblemPicker,
setExpandedProblemPicker,

pendingGradeName,

gradeOptions,

pickerGradeId,
setPendingGradeId,

router,

currentItem,
currentType,

learningProblem,

getPracticeSkill,

currentLearningSkillId,

currentSkillXP,

currentSkillRequiredXP,

learningState,

skillTree,

setShowSkillTree,
showSkillTree,

showCurrentSkillSummary,

currentSkillNode,

recommendedSkillNode,

SkillTreeView,

nextQuestion,

currentCardRef,

combo,

uiText

}:Props){
return(
<>
{quest.status === "playing" && (
        <div className="fixed left-1/2 top-2 z-40 w-full max-w-md -translate-x-1/2 px-4">
          {!isLearningSessionMode && selectedPath && (
            <div className="w-full relative">
              <button
                type="button"
                onClick={() => {
                  setShowGradeTypePicker((prev) => !prev);
                  if (!showGradeTypePicker) {
                    setExpandedGradePicker(true);
                    setExpandedGradeList(false);
                    setExpandedProblemPicker(true);
                  }
                }}
                className="w-full bg-white border-2 border-slate-200 rounded-2xl px-3 py-2 text-[11px] font-bold text-slate-700 text-left hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{selectedPath.gradeName} / {selectedPath.typeName}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-500">問題を選ぶ</span>
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-600 shadow-sm">
                      {showGradeTypePicker ? "▲" : "▼"}
                    </span>
                  </span>
                </div>
              </button>
              {showGradeTypePicker && (
                <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg p-1">
                  <button
                    type="button"
                    onClick={() => setExpandedGradePicker((prev) => !prev)}
                    className="w-full flex items-center justify-between rounded-lg px-2 py-2 text-[11px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100"
                  >
                    <span>学年</span>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white text-slate-500">
                      {expandedGradePicker ? "▲" : "▼"}
                    </span>
                  </button>
                  {expandedGradePicker && (
                    <div className="mt-1 px-1">
                      <button
                        type="button"
                        onClick={() => setExpandedGradeList((prev) => !prev)}
                        className="w-full flex items-center justify-between rounded-lg px-2 py-2 text-[11px] font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      >
                        <span className="truncate">{pendingGradeName}</span>
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white text-slate-500">
                          {expandedGradeList ? "▲" : "▼"}
                        </span>
                      </button>
                      {expandedGradeList && (
                        <div className="mt-1 space-y-1">
                          {gradeOptions.map((grade) => {
                            const isPickedGrade = grade.gradeId === pickerGradeId;
                            return (
                              <button
                                key={grade.gradeId}
                                ref={isPickedGrade ? currentGradeOptionRef : null}
                                type="button"
                                onClick={() => {
                                  setPendingGradeId(grade.gradeId);
                                  setExpandedGradeList(false);
                                }}
                                className={`w-full text-left rounded-md px-2 py-1.5 text-[10px] font-bold border ${
                                  isPickedGrade
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                {grade.gradeName}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-2 border-t border-slate-200 pt-2">
                    <button
                      type="button"
                      onClick={() => setExpandedProblemPicker((prev) => !prev)}
                      className="w-full flex items-center justify-between rounded-lg px-2 py-2 text-[11px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100"
                    >
                      <span>問題</span>
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white text-slate-500">
                        {expandedProblemPicker ? "▲" : "▼"}
                      </span>
                    </button>
                    {expandedProblemPicker && (
                      <div ref={problemOptionsScrollRef} className="mt-1 space-y-1 px-1">
                        {pickerGradeTypes.map((option) => {
                          const optionKey = option.kind === "level" ? option.levelId : option.typeId;
                          const isCurrent =
                            option.kind === "level"
                              ? levelFromQuery === option.levelId
                              : option.typeId === currentType?.type_id;
                          return (
                            <button
                              key={optionKey}
                              ref={isCurrent ? currentProblemOptionRef : null}
                              type="button"
                              onClick={() => {
                                setShowGradeTypePicker(false);
                                if (isCurrent) return;
                                if (option.kind === "level") {
                                  router.push(`/quest?levelId=${encodeURIComponent(option.levelId)}`);
                                  return;
                                }
                                router.push(`/quest?type=${encodeURIComponent(option.typeId)}`);
                              }}
                              className={`w-full text-left rounded-lg px-2 py-2 text-[11px] ${
                                isCurrent
                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  : "text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <div className="font-bold truncate">{option.typeName}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {currentItem && currentType && (
            <div className="bg-slate-50/95 backdrop-blur-sm py-1">
            {quest.session && learningProblem ? (
              <div className="mb-2 flex items-start justify-between gap-3">
                <QuestHeader
                  skillTitle={getPracticeSkill(currentLearningSkillId ?? "")?.title ?? currentLearningSkillId ?? "-"}
                  skillXP={currentSkillXP}
                  requiredXP={currentSkillRequiredXP}
                  xpTotal={learningState?.student.xpTotal ?? 0}
                />
                {skillTree.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowSkillTree((prev) => !prev)}
                    className="shrink-0 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-700 shadow-sm transition hover:bg-sky-50"
                  >
                    {showSkillTree ? "とじる" : "すすみかた"}
                  </button>
                ) : null}
              </div>
            ) : null}
            {showCurrentSkillSummary ? (
              <section className="mb-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold tracking-[0.2em] text-slate-500">いまの べんきょう</div>
                    <div className="mt-2 text-lg font-bold text-slate-900">{currentSkillNode.title}</div>
                    <SkillProgressBar mastery={currentSkillNode.mastery} />
                    <div className="mt-2 flex items-center justify-between text-sm font-semibold text-slate-600">
                      <span>{Math.round(currentSkillNode.mastery * 100)}%</span>
                      <span>ポイント {currentSkillNode.xp}</span>
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (!currentLearningSkillId) return;
                          router.push(`/quest?skillId=${encodeURIComponent(currentLearningSkillId)}&fresh=1`);
                        }}
                        className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
                      >
                        もういちど
                      </button>
                    </div>
                  </div>
                  {recommendedSkillNode ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold tracking-[0.2em] text-slate-500">つぎの べんきょう</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <div className="text-lg font-bold text-slate-900">{recommendedSkillNode.title}</div>
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                          つぎ
                        </span>
                      </div>
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => router.push(`/quest?skillId=${encodeURIComponent(recommendedSkillNode.id)}&fresh=1`)}
                          className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
                        >
                          つぎへ
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}
            {skillTree.length > 0 ? (
              <div className="mb-4 min-h-0 overflow-hidden">
                {showSkillTree ? (
                  <div className="min-h-0">
                    <SkillTreeView
                      skills={skillTree}
                      currentSkillId={currentLearningSkillId ?? undefined}
                      focusSkillId={currentLearningSkillId ?? undefined}
                      onSkillClick={(skillId) => router.push(`/quest?skillId=${encodeURIComponent(skillId)}&fresh=1`)}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
            </div>
          )}
        </div>
      )}

            </>
);

}