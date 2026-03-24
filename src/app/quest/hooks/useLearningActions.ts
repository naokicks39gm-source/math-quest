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
correct
}:{
sessionId:string
index:number
answer:string
correct:boolean
})=>{

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

if(!learningState || !learningSessionId || !quest.session){

return null

}

const answerIndex = quest.session.index

const data = await submitLearningAnswerCore({

sessionId:learningSessionId,
index:answerIndex,
answer:answerText,
correct

})

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
