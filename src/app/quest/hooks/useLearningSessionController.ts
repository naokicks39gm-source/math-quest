import { useEffect } from "react";

export function useLearningSessionController(deps:any){

const {
isLearningSessionMode,
skillIdFromQuery,
quest,
setLearningError,
setLearningResult,
syncLearningUiFromSession,
clearLearningRecoveryStorage,
loadLearningRecovery,
freshFromQuery,
retryFromQuery,
purgeFreshLearningRecovery,
clearPersistedLearningSession,
resetLearningSessionUi,
resumeLearningSession,
learningActions,
loadStateFromClient
} = deps

useEffect(()=>{

if(quest.session) return

if(!isLearningSessionMode || !skillIdFromQuery){

setLearningError(null)

quest.setLearningLoading(false)

setLearningResult(null)

syncLearningUiFromSession(null,null)

clearLearningRecoveryStorage()

return

}

const recovery = loadLearningRecovery()

const forceFreshStart =
Boolean((freshFromQuery || retryFromQuery) && !quest.learningResult)

const persistedSession =
loadStateFromClient().session

if(quest.learningResult){

return

}

if(forceFreshStart && quest.status !== "cleared"){

purgeFreshLearningRecovery()

clearLearningRecoveryStorage()

clearPersistedLearningSession(skillIdFromQuery)

resetLearningSessionUi()

void quest.startLearningSession(
skillIdFromQuery,
{ fresh:true }
)

return

}

if(recovery?.sessionId){

void resumeLearningSession(
recovery.sessionId,
skillIdFromQuery
)

return

}

void quest.startLearningSession(skillIdFromQuery)

},[
isLearningSessionMode,
skillIdFromQuery,
quest,
freshFromQuery,
retryFromQuery
])

}