

import { useState,useCallback,useMemo } from "react"    
type Params={

quest:any

setLearningSessionId:(v:string|null)=>void
setLearningResultSkillId:(v:string|null)=>void

setItemIndex:(v:number)=>void
setCombo:(v:number)=>void

setLearningAttemptCount:(v:number)=>void

}

export function useLearningOrchestrator({

quest,

setLearningSessionId,

setItemIndex,

setCombo,

setLearningAttemptCount,

setQuestionResults

}:Params){
const [history,setHistory]=useState<any[]>([])

const [results,setResults]=useState<any[]>([])

const [questionIndex,setQuestionIndex]=useState(0)

const [question,setQuestion]=useState<any>(null)

const [input,setInput]=useState("")

const [resultMark,setResultMark]=useState<any>(null)

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
resultMark,

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
correctCount



}

}