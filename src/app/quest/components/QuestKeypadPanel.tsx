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

// console.log("TRACE_HANDLE_ATTACK_DEFINED", typeof handleAttack);
const currentProblem = quest.currentProblem ?? null;
const session = quest.session ?? null;
const loading = sessionActionLoading;
const noProblem = !currentProblem;
const noSession = !session;
const isLoading = loading;
// console.log("TRACE_DISABLED_FULL", {
//   noProblem,
//   noSession,
//   isLoading,
//   currentProblem,
//   session,
//   loading
// });

return (

 <div
          className="w-full pt-2 pb-3 sticky bottom-0 bg-slate-50/95 backdrop-blur-sm z-20 space-y-2"
          style={{
            outline: "2px solid blue"
          }}
        >
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
              onJudge={() => {
                // console.log("TRACE_JUDGE_CLICK");
                // console.log("TRACE_BUTTON_CLICK");
                handleAttack?.();
              }}
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
              onJudge={() => {
                // console.log("TRACE_JUDGE_CLICK");
                // console.log("TRACE_BUTTON_CLICK");
                handleAttack?.();
              }}
              onEnd={endLearningSession}
              judgeLabel={uiText.judge}
              endLabel="おわり"
              endDisabled={sessionActionLoading}
            />
          ) : (
            // console.log("TRACE_USING_ELEMENTARY_KEYPAD"),
            (
            <ElementaryKeypad
              isPlaying={quest.status === "playing"}
              isStarting={isStarting}
              isAnswerLocked={isAnswerLockedByExplanation}
              canSubmit={canSubmitResolved}
              canUseKeyToken={canUseKeyToken}
              onInput={(token) => {
                // console.log("TRACE_KEYPAD_INPUT", token);
                // console.log("TRACE_HANDLE_DIGIT_DEFINED", typeof learningOrchestrator.handleInput);
                return learningOrchestrator.handleInput(
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
                );
              }}
              onDelete={handleDelete}
              onJudge={() => {
                // console.log("TRACE_JUDGE_CLICK");
                // console.log("TRACE_BUTTON_CLICK");
                handleAttack?.();
              }}
              onEnd={endLearningSession}
              judgeLabel={uiText.judge}
              endLabel="おわり"
              endDisabled={sessionActionLoading}
            />
            )
          )}
        </div>

);

}
