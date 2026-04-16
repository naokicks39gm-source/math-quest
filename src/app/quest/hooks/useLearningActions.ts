import { useCallback } from "react";

export function useLearningActions(quest:any){
const {
setSession,
setCurrentProblem,
setLearningAttemptCount,
setLearningHint,
setLearningExplanation
} = quest

const finishLearningSessionCore = async(sessionId:string)=>{

const response = await fetch("/api/learning/session/finish",{
method:"POST",
headers:{ "Content-Type":"application/json"},
body:JSON.stringify({
sessionId
})
})

const data = await response.json()

if(!response.ok){

throw new Error(
"error" in data && data.error
? data.error
: "learning_session_finish_failed"
)

}

return data

}

// ↓ここに移動

const submitLearningAnswerCore = async({
sessionId,
index,
answer,
correct,
learningStateExists,
learningSessionId,
sessionIndex
}:{
sessionId:string
index:number
answer:string
correct:boolean
learningStateExists:boolean
learningSessionId:string|null
sessionIndex:number | null | undefined
})=>{
console.log("TRACE_LEARNING_STATE", {
learningStateExists,
learningSessionId: learningSessionId,
sessionIndex: sessionIndex,
time: Date.now()
});
// console.log("API_CALL_START");
// console.log("API_FETCH_START");
const response = await fetch("/api/learning/session/answer",{
method:"POST",
headers:{ "Content-Type":"application/json"},
body:JSON.stringify({
sessionId,
index,
answer,
correct
})
})

const data = await response.json()

if(!response.ok){

throw new Error(
data?.error ?? "answer failed"
)

}

return data

}

const submitLearningAnswer = async(
learningState:any,
learningSessionId:string|null,
quest:any,
answerText:string,
correct:boolean
)=>{

// console.log("TRACE_D_ACTION_ENTER",{
// learningStateExists: !!learningState,
// learningSessionId,
// sessionIndex: quest?.session?.index ?? null,
// currentProblemId: quest?.currentProblem?.problemId ?? null,
// answerText,
// correct
// })

if(!learningState || !learningSessionId || !quest.session){

// console.log("TRACE_E_ACTION_EARLY_RETURN",{
// learningStateExists: !!learningState,
// learningSessionId,
// hasSession: !!quest?.session
// })

return null

}

const answerIndex = quest.session.index

const data = await submitLearningAnswerCore({

sessionId:learningSessionId,
index:answerIndex,
answer:answerText,
correct,
learningStateExists: !!learningState,
learningSessionId,
sessionIndex: quest?.session?.index ?? null

})

// console.log("TRACE_F_ACTION_RESPONSE",{
// sessionIndex: data?.session?.index ?? null,
// problemId: data?.problem?.problemId ?? null,
// problemQuestion: data?.problem?.problem?.question ?? null,
// finished: data?.finished ?? null
// })
// console.log("ANSWER_RESPONSE",data)
// console.log("NEXT_PROBLEM_API",{
// problemId:data.problem?.problemId ?? data.nextProblem?.problemId,
// question:data.problem?.problem?.question ?? data.nextProblem?.problem?.question
// })

if(data.session){

// console.log("TRACE_G_SET_SESSION",{
// sessionIndex: data?.session?.index ?? null
// })
// console.log("SET_SESSION",data.session?.index)

setSession(data.session)

}

if(data.problem){

// console.log("TRACE_H_SET_CURRENT_PROBLEM",{
// problemId: data?.problem?.problemId ?? data?.nextProblem?.problemId ?? null,
// question: data?.problem?.problem?.question ?? data?.nextProblem?.problem?.question ?? null
// })
// console.log("SET_CURRENT_PROBLEM",data.problem?.problemId)

setCurrentProblem(data.problem)

}else if(data.nextProblem){

// console.log("TRACE_H_SET_CURRENT_PROBLEM",{
// problemId: data?.problem?.problemId ?? data?.nextProblem?.problemId ?? null,
// question: data?.problem?.problem?.question ?? data?.nextProblem?.problem?.question ?? null
// })
// console.log("SET_CURRENT_PROBLEM",data.nextProblem?.problemId)

setCurrentProblem(data.nextProblem)

}

setLearningAttemptCount(
data.attemptCount ?? 0
)

setLearningHint(
data.hint ?? null
)

setLearningExplanation(
data.explanation ?? null
)

if(data.finished){

await runFinishLearningSession(
learningState,
learningSessionId,
null,
quest
)

}

// console.log("TRACE_I_ACTION_RETURN",{
// sessionIndex: data?.session?.index ?? null,
// problemId: data?.problem?.problemId ?? null
// })

return data
}

const runFinishLearningSession = async(
learningState:any,
learningSessionId:string|null,
skillIdFromQuery:string|null,
deps:any
)=>{

if(deps.finishGuardRef.current){

return null

}

deps.finishGuardRef.current = true

clearPendingAdvanceTimers(deps)

try{

return await finishQuestLearningSession(
learningState,
learningSessionId,
skillIdFromQuery,
deps
)

}catch(error){

deps.finishGuardRef.current = false

throw error

}

}

const applyFinishLearningSessionState=(
data:any,
completedSkillId:string|null,
deps:any
)=>{

deps.persistLearningState(data.state,{
sessionId:data.sessionId,
recoveryAnswers:[],
skillId:completedSkillId,
expiresAt:data.expiresAt
})

deps.clearLearningRecovery()

deps.setLearningSessionId(null)

deps.updateDailyStreak()

deps.trackAnalyticsEvent("session_finish")

deps.setLearningResultSkillId(completedSkillId)

deps.setLearningResult(data.result)

deps.quest.setStatus("cleared")

deps.setMessage("できた！")

}

const finishQuestLearningSession = async(
learningState:any,
learningSessionId:string|null,
skillIdFromQuery:string|null,
deps:any
)=>{

if(!learningState || !learningSessionId) return null

const completedSkillId =
deps.quest.session?.skillId
?? deps.quest.learningResultSkillId
?? null

const data =
await finishLearningSessionCore(learningSessionId)

if(!data.result.cleared && completedSkillId){

deps.finishGuardRef.current = false

await deps.quest.startLearningSession(
completedSkillId,
{
carryoverHistory:data.result.history,
recentProblems:data.result.recentProblems
}
)

return null

}

applyFinishLearningSessionState(
data,
completedSkillId ?? skillIdFromQuery,
deps
)

return data.result

}
const clearPendingAdvanceTimers = (
deps:any
)=>{

deps.advanceGuardRef.current = false

if(deps.autoNextTimerRef.current){

window.clearTimeout(deps.autoNextTimerRef.current)

deps.autoNextTimerRef.current = null

}

if(deps.wrongMarkTimerRef.current){

window.clearTimeout(deps.wrongMarkTimerRef.current)

deps.wrongMarkTimerRef.current = null

}

deps.setResultMark(null)

}
const resetLearningSessionCore = useCallback(() => {

setSession(null);
setCurrentProblem(null);
setLearningAttemptCount(0);
setLearningHint(null);
setLearningExplanation(null);

},[
setCurrentProblem,
setLearningAttemptCount,
setLearningExplanation,
setLearningHint,
setSession
]);

return{

resetLearningSessionCore,
finishLearningSessionCore,
applyFinishLearningSessionState,
finishQuestLearningSession,
submitLearningAnswerCore,
submitLearningAnswer,
clearPendingAdvanceTimers,
runFinishLearningSession

};

}
