import ElementaryKeypad from "@/components/keypad/ElementaryKeypad";
import JuniorKeypad from "@/components/keypad/JuniorKeypad";
import HighSchoolKeypad from "@/components/keypad/HighSchoolKeypad";
type Props = {

quest:any

isStarting:boolean

isAnswerLockedByExplanation:boolean

canSubmitResolved:boolean

canUseKeyToken:any

setSettingsOpen:any

handleDelete:()=>void

handleAttack:()=>void

endLearningSession:()=>void

uiText:any

sessionActionLoading:boolean

isHighSchoolQuest:boolean

isJuniorQuest:boolean

learningOrchestrator:any

input:any

setInput:any

setResultMark:any

isQuadraticRootsQuestion:boolean

quadraticAnswers:any

quadraticActiveIndex:number

clearQuadraticFractionAutoMoveTimer:any

setQuadraticFractionInputs:any

setQuadraticAnswers:any

clearFractionAutoMoveTimer:any

setFractionInput:any

fractionInput:any

quadraticFractionInputs:any

isFractionPartTokenValid:any

quadraticFractionAutoMoveTimerRefs:any

FRACTION_AUTO_MOVE_DELAY_MS:number

fractionAutoMoveTimerRef:any

isSecondaryQuest:boolean

VARIABLE_SYMBOLS:any

};

export function QuestKeypadPanel({

quest,

isStarting,

isAnswerLockedByExplanation,

canSubmitResolved,

canUseKeyToken,
setSettingsOpen,

handleDelete,

handleAttack,

endLearningSession,

uiText,

sessionActionLoading,

isHighSchoolQuest,

isJuniorQuest,

learningOrchestrator,

input,

setInput,

setResultMark,

isQuadraticRootsQuestion,

quadraticAnswers,

quadraticActiveIndex,

clearQuadraticFractionAutoMoveTimer,

setQuadraticFractionInputs,

setQuadraticAnswers,

clearFractionAutoMoveTimer,

setFractionInput,

fractionInput,

quadraticFractionInputs,

isFractionPartTokenValid,

quadraticFractionAutoMoveTimerRefs,

FRACTION_AUTO_MOVE_DELAY_MS,

fractionAutoMoveTimerRef,

isSecondaryQuest,

VARIABLE_SYMBOLS

}:Props){

return (

 <div className="w-full pt-2 pb-3 sticky bottom-0 bg-slate-50/95 backdrop-blur-sm z-20 space-y-2">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setSettingsOpen((prev: boolean) => !prev)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm"
            >
              Settings
            </button>
          </div>
          {isHighSchoolQuest ? (
            <HighSchoolKeypad
              isPlaying={quest.status === "playing"}
              isStarting={isStarting}
              isAnswerLocked={isAnswerLockedByExplanation}
              canSubmit={canSubmitResolved}
              canUseKeyToken={canUseKeyToken}
              onInput={(token)=>
learningOrchestrator.handleInput(

token,

quest,
isStarting,
isAnswerLockedByExplanation,

input,
setInput,
setResultMark,

isQuadraticRootsQuestion,
quadraticAnswers,
quadraticActiveIndex,

isHighSchoolQuest,

clearQuadraticFractionAutoMoveTimer,
setQuadraticFractionInputs,

setQuadraticAnswers,

clearFractionAutoMoveTimer,
setFractionInput,
fractionInput,

quadraticFractionInputs,

isFractionPartTokenValid,

quadraticFractionAutoMoveTimerRefs,

FRACTION_AUTO_MOVE_DELAY_MS,

fractionAutoMoveTimerRef,

isSecondaryQuest,

VARIABLE_SYMBOLS

)
}
              onDelete={handleDelete}
              onJudge={handleAttack}
              onEnd={endLearningSession}
              judgeLabel={uiText.judge}
              endLabel="おわり"
              endDisabled={sessionActionLoading}
            />
          ) : isJuniorQuest ? (
            <JuniorKeypad
              isPlaying={quest.status === "playing"}
              isStarting={isStarting}
              isAnswerLocked={isAnswerLockedByExplanation}
              canSubmit={canSubmitResolved}
              canUseKeyToken={canUseKeyToken}
             onInput={(token)=>
learningOrchestrator.handleInput(

token,

quest,
isStarting,
isAnswerLockedByExplanation,

input,
setInput,
setResultMark,

isQuadraticRootsQuestion,
quadraticAnswers,
quadraticActiveIndex,

isHighSchoolQuest,

clearQuadraticFractionAutoMoveTimer,
setQuadraticFractionInputs,

setQuadraticAnswers,

clearFractionAutoMoveTimer,
setFractionInput,
fractionInput,

quadraticFractionInputs,

isFractionPartTokenValid,

quadraticFractionAutoMoveTimerRefs,

FRACTION_AUTO_MOVE_DELAY_MS,

fractionAutoMoveTimerRef,

isSecondaryQuest,

VARIABLE_SYMBOLS

)
}
              onDelete={handleDelete}
              onJudge={handleAttack}
              onEnd={endLearningSession}
              judgeLabel={uiText.judge}
              endLabel="おわり"
              endDisabled={sessionActionLoading}
            />
          ) : (
            <ElementaryKeypad
              isPlaying={quest.status === "playing"}
              isStarting={isStarting}
              isAnswerLocked={isAnswerLockedByExplanation}
              canSubmit={canSubmitResolved}
              canUseKeyToken={canUseKeyToken}
              onInput={(token)=>
learningOrchestrator.handleInput(

token,

quest,
isStarting,
isAnswerLockedByExplanation,

input,
setInput,
setResultMark,

isQuadraticRootsQuestion,
quadraticAnswers,
quadraticActiveIndex,

isHighSchoolQuest,

clearQuadraticFractionAutoMoveTimer,
setQuadraticFractionInputs,

setQuadraticAnswers,

clearFractionAutoMoveTimer,
setFractionInput,
fractionInput,

quadraticFractionInputs,

isFractionPartTokenValid,

quadraticFractionAutoMoveTimerRefs,

FRACTION_AUTO_MOVE_DELAY_MS,

fractionAutoMoveTimerRef,

isSecondaryQuest,

VARIABLE_SYMBOLS

)
}
              onDelete={handleDelete}
              onJudge={handleAttack}
              onEnd={endLearningSession}
              judgeLabel={uiText.judge}
              endLabel="おわり"
              endDisabled={sessionActionLoading}
            />
          )}
        </div>

);

}
