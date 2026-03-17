

import { useState,useCallback,useMemo } from "react"    
type Params={

quest:any

setLearningSessionId:(v:string|null)=>void
setLearningResultSkillId:(v:string|null)=>void

setItemIndex:(v:number)=>void
setCombo:(v:number)=>void

setLearningAttemptCount:(v:number)=>void

isStarting:boolean

isAnswerLockedByExplanation:boolean

input:string
setInput:(v:string)=>void

setResultMark:(v:any)=>void

isQuadraticRootsQuestion:boolean

quadraticAnswers:any
quadraticActiveIndex:number

isHighSchoolQuest:boolean

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

}

export function useLearningOrchestrator({

quest,

setLearningSessionId,

setItemIndex,

setCombo,

setLearningAttemptCount,

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

}:Params){
const [history,setHistory]=useState<any[]>([])

const [results,setResults]=useState<any[]>([])

const [questionIndex,setQuestionIndex]=useState(0)

const [question,setQuestion]=useState<any>(null)


const [questionResults,setQuestionResults]=useState<any>({})

const syncLearningUiFromSession = useCallback((

session:any,

problem:any

)=>{

if(!session){

quest.setCurrentProblem(null)

quest.setLearningAttemptCount(0)

quest.setLearningHint(null)

quest.setLearningExplanation(null)

return

}

const currentProblem =
problem ??
session.problems?.[session.index] ??
null

quest.setCurrentProblem(currentProblem)

quest.setLearningAttemptCount(
currentProblem?.attemptCount ?? 0
)

quest.setLearningHint(
session?.currentHint ?? null
)

quest.setLearningExplanation(
session?.currentExplanation ?? null
)

},[
quest
])


const resetLearningSessionUi = useCallback(()=>{

setLearningSessionId(null)

quest.setSession(null)

setItemIndex(0)

setCombo(0)

setLearningAttemptCount(0)

setQuestionResults({})

quest.setCurrentProblem(null)

quest.setLearningHint(null)

quest.setLearningExplanation(null)

},[
quest,
setLearningSessionId,
setItemIndex,
setCombo,
setLearningAttemptCount,
setQuestionResults
])


const finishLearningSession = useCallback((session:any)=>{

if(!session)return

quest.setStatus("cleared")

quest.setSession(session)

quest.setCurrentProblem(null)

quest.setLearningHint(null)

quest.setLearningExplanation(null)

},[
quest
])

const applyFinishLearningSessionState =useCallback((result:any)=>{

if(!result)return

quest.setLearningResult(result)

},[
quest
])

const restartSameLevel = useCallback(()=>{

sessionStartTrackedRef.current = false

clearAllFractionAutoMoveTimers()

setItemIndex(0)

setQuestionResults({})

setPracticeResult(null)

setResultMark(null)

setRecognizedNumber(null)

setInput("")

setFractionInput({ ...EMPTY_FRACTION_EDITOR })

setQuadraticAnswers(["",""])

setQuadraticFractionInputs([
{ ...EMPTY_FRACTION_EDITOR },
{ ...EMPTY_FRACTION_EDITOR }
])

setQuadraticActiveIndex(0)

setPreviewImages([])

setCombo(0)

quest.setStatus("playing")

setMessage("Battle Start!")

canvasRef.current?.clear()

setRetryNonce(prev=>prev+1)

},[
quest,
setItemIndex,
setQuestionResults,
setCombo
])

const advanceQuestion = useCallback((

question:any,

createQuestion:()=>any,

setHistory:(v:any)=>void,

setQuestion:(v:any)=>void,

setInput:(v:string)=>void,

setResultMark:(v:any)=>void

)=>{

if(question){

const text =
`${question.val1} ${question.operator} ${question.val2} = ${question.answer}`

setHistory((prev:any)=>
[...prev,
{id:Date.now()+Math.random(),text}
].slice(-5)
)

}

const current =
createQuestion()

setQuestion(current)

setInput("")

setResultMark(null)

},[])

const advanceQuestionWithDelay = useCallback((

ms:number,

timerRef:any,

advanceFn:()=>void

)=>{

if(timerRef.current){

window.clearTimeout(timerRef.current)

}

timerRef.current =
window.setTimeout(()=>{

advanceFn()

},ms)

},[])

const recordResult = useCallback((

question:any,
userAnswer:string,
correct:boolean,

setResults:any,
setQuestionIndex:any,

questionIndex:number,
totalQuizQuestions:number,

quest:any,
setMessage:any,

advanceQuestionWithDelay:any

)=>{

if(!question)return

const text =
`${question.val1} ${question.operator} ${question.val2} = ${question.answer}`

setResults((prev:any)=>[

...prev,

{
id:Date.now()+Math.random(),
text,
userAnswer,
correct

}

])

if(questionIndex >= totalQuizQuestions){

quest.setStatus("cleared")

setMessage("クリアー！")

return

}

setQuestionIndex((prev:number)=>prev+1)

advanceQuestionWithDelay(800)

},[])

const handleInput = useCallback((
num:string,

)=>{
     const handleInput = (num: string) => {
        if (quest.status !== 'playing' || isStarting || isAnswerLockedByExplanation) return;
        const currentText = isQuadraticRootsQuestion ? quadraticAnswers[quadraticActiveIndex] : input;
        const normalizedToken = (() => {
          if (num === "frac") return "/";
          if (num === "pow") return "^";
          if (num === "var") return "x";
          if (num === "abs") return "|x|";
          if (num === "sqrt") return "sqrt(";
          if (num === "log") return "log(";
          if (num === "pi") return "π";
          return num;
        })();
        const isDigit = /^\d$/.test(normalizedToken);
        const maxInputLength = isHighSchoolQuest ? 24 : 12;
    
        if (normalizedToken === "/") {
          if (isQuadraticRootsQuestion) {
            clearQuadraticFractionAutoMoveTimer(quadraticActiveIndex);
            setQuadraticFractionInputs((prev) => {
              if (prev[quadraticActiveIndex].enabled) return prev;
              const next: [FractionEditorState, FractionEditorState] = [prev[0], prev[1]];
              next[quadraticActiveIndex] = { enabled: true, num: "", den: "", part: "num" };
              return next;
            });
            setQuadraticAnswers((prev) => {
              const next: [string, string] = [...prev] as [string, string];
              next[quadraticActiveIndex] = "";
              return next;
            });
          } else {
            clearFractionAutoMoveTimer();
            setFractionInput((prev) => (prev.enabled ? prev : { enabled: true, num: "", den: "", part: "num" }));
            setInput("");
          }
          setResultMark(null);
          return;
        }
    
        if (isQuadraticRootsQuestion && quadraticFractionInputs[quadraticActiveIndex].enabled) {
          const currentEditor = quadraticFractionInputs[quadraticActiveIndex];
          const currentPartValue = currentEditor.part === "num" ? currentEditor.num : currentEditor.den;
          if (!isFractionPartTokenValid(currentPartValue, normalizedToken)) return;
          setQuadraticFractionInputs((prev) => {
            const target = prev[quadraticActiveIndex];
            const next: [FractionEditorState, FractionEditorState] = [prev[0], prev[1]];
            const part = target.part;
            const maxLen = isDigit ? 6 : 7;
            const nextPartValue = `${part === "num" ? target.num : target.den}${normalizedToken}`;
            if (nextPartValue.length > maxLen) return prev;
            next[quadraticActiveIndex] = {
              ...target,
              num: part === "num" ? nextPartValue : target.num,
              den: part === "den" ? nextPartValue : target.den
            };
            return next;
          });
          if (currentEditor.part === "num") {
            clearQuadraticFractionAutoMoveTimer(quadraticActiveIndex);
            quadraticFractionAutoMoveTimerRefs.current[quadraticActiveIndex] = window.setTimeout(() => {
              setQuadraticFractionInputs((prev) => {
                const target = prev[quadraticActiveIndex];
                if (!target.enabled || target.part !== "num" || target.num.length === 0 || target.den.length > 0) return prev;
                const next: [FractionEditorState, FractionEditorState] = [prev[0], prev[1]];
                next[quadraticActiveIndex] = { ...target, part: "den" };
                return next;
              });
              quadraticFractionAutoMoveTimerRefs.current[quadraticActiveIndex] = null;
            }, FRACTION_AUTO_MOVE_DELAY_MS);
          }
          setResultMark(null);
          return;
        }
    
        if (!isQuadraticRootsQuestion && fractionInput.enabled) {
          const currentPartValue = fractionInput.part === "num" ? fractionInput.num : fractionInput.den;
          if (!isFractionPartTokenValid(currentPartValue, normalizedToken)) return;
          setFractionInput((prev) => {
            const part = prev.part;
            const maxLen = isDigit ? 12 : 13;
            const nextPartValue = `${part === "num" ? prev.num : prev.den}${normalizedToken}`;
            if (nextPartValue.length > maxLen) return prev;
            return {
              ...prev,
              num: part === "num" ? nextPartValue : prev.num,
              den: part === "den" ? nextPartValue : prev.den
            };
          });
          if (fractionInput.part === "num") {
            clearFractionAutoMoveTimer();
            fractionAutoMoveTimerRef.current = window.setTimeout(() => {
              setFractionInput((prev) => {
                if (!prev.enabled || prev.part !== "num" || prev.num.length === 0 || prev.den.length > 0) return prev;
                return { ...prev, part: "den" };
              });
              fractionAutoMoveTimerRef.current = null;
            }, FRACTION_AUTO_MOVE_DELAY_MS);
          }
          setResultMark(null);
          return;
        }
    
        const canAppendToken = (text: string, token: string) => {
          if (/^\d$/.test(token)) return true;
          if (token === "-") {
            if (!isSecondaryQuest) return text.length === 0;
            if (text.length === 0) return true;
            return /[\dxyabmnpiπ)]$/.test(text);
          }
          if (token === ".") {
            if (text.includes(".")) return false;
            if (text === "" || text === "-") return false;
            return true;
          }
          if (token === "×") {
            if (text.length === 0) return false;
            return /[\dxyabmnpiπ)]$/.test(text);
          }
          if (token === "+") {
            if (!isSecondaryQuest) return false;
            if (text.length === 0) return false;
            return /[\dxyabmnpiπ)]$/.test(text);
          }
          if ((VARIABLE_SYMBOLS as readonly string[]).includes(token)) {
            if (!isSecondaryQuest) return false;
            if (text.length === 0) return true;
            if (/[\^(/]$/.test(text)) return false;
            return true;
          }
          if (token === "^") {
            if (!isSecondaryQuest) return false;
            if (text.length === 0) return false;
            return /[\dxyabmnpiπ)]$/.test(text);
          }
          if (token === "()") {
            if (!isSecondaryQuest) return false;
            if (text.endsWith("^")) return false;
            return true;
          }
          if (token === "|x|") return isHighSchoolQuest;
          if (token === "sqrt(" || token === "log(") return isHighSchoolQuest;
          if (token === "π") return isHighSchoolQuest;
          if (token === "+/-") return false;
          return false;
        };
        if (!canAppendToken(currentText, normalizedToken)) return;
    
        if (isQuadraticRootsQuestion) {
          setQuadraticAnswers((prev) => {
            const next: [string, string] = [...prev] as [string, string];
            const maxLen = isDigit ? 6 : (isHighSchoolQuest ? 24 : 7);
            if (next[quadraticActiveIndex].length >= maxLen) return prev;
            next[quadraticActiveIndex] = normalizedToken === "()" ? `${next[quadraticActiveIndex]}()` : `${next[quadraticActiveIndex]}${normalizedToken}`;
            return next;
          });
          setResultMark(null);
          return;
        }
        const appendInput = (symbol: string) => {
          setInput((prev) => prev + symbol);
        };
        if (input.length >= maxInputLength) return;
        if ((VARIABLE_SYMBOLS as readonly string[]).includes(normalizedToken)) {
          appendInput(normalizedToken);
        } else {
          appendInput(normalizedToken === "()" ? "()" : normalizedToken);
        }
        setResultMark(null);
      };

if(
quest.status!=="playing" ||
isStarting ||
isAnswerLockedByExplanation
)return

const normalizedToken = (()=>{

if(num==="frac") return "/"
if(num==="pow") return "^"

return num

})()

setInput((prev:string)=>{

const next = prev + normalizedToken

if(next.length>24) return prev

return next

})

setResultMark(null)

},[
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

fractionInput,
quadraticFractionInputs,

isSecondaryQuest
])

const correctCount = useMemo(()=>{

return results.filter(
([,result]:any)=>
result.everWrong !== true
).length

},[results])

return{
history,
results,
questionIndex,

question,
input,

setQuestion,
setInput,
setResultMark,

setHistory,
setResults,
setQuestionIndex,

syncLearningUiFromSession,
resetLearningSessionUi,
finishLearningSession,
applyFinishLearningSessionState,
restartSameLevel,
advanceQuestion,
advanceQuestionWithDelay,
recordResult,
handleInput,
correctCount,

questionResults,
setQuestionResults,



}

}