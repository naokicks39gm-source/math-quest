import { useEffect, useRef } from "react";

export function useLearningSessionController(deps:any){

const {
isLearningSessionMode,
skillIdFromQuery,
questSession,
questStatus,
questLearningResult,
questLearningLoading,
setLearningError,
setLearningLoading,
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
startLearningSession
} = deps

const startedRequestKeyRef = useRef<string | null>(null)
const questSessionRef = useRef(questSession)
const questStatusRef = useRef(questStatus)
const questLearningResultRef = useRef(questLearningResult)
const questLearningLoadingRef = useRef(questLearningLoading)
const freshFromQueryRef = useRef(freshFromQuery)
const retryFromQueryRef = useRef(retryFromQuery)
const setLearningErrorRef = useRef(setLearningError)
const setLearningLoadingRef = useRef(setLearningLoading)
const setLearningResultRef = useRef(setLearningResult)
const syncLearningUiFromSessionRef = useRef(syncLearningUiFromSession)
const clearLearningRecoveryStorageRef = useRef(clearLearningRecoveryStorage)
const loadLearningRecoveryRef = useRef(loadLearningRecovery)
const purgeFreshLearningRecoveryRef = useRef(purgeFreshLearningRecovery)
const clearPersistedLearningSessionRef = useRef(clearPersistedLearningSession)
const resetLearningSessionUiRef = useRef(resetLearningSessionUi)
const resumeLearningSessionRef = useRef(resumeLearningSession)
const startLearningSessionRef = useRef(startLearningSession)

useEffect(() => {
questSessionRef.current = questSession
questStatusRef.current = questStatus
questLearningResultRef.current = questLearningResult
questLearningLoadingRef.current = questLearningLoading
freshFromQueryRef.current = freshFromQuery
retryFromQueryRef.current = retryFromQuery
setLearningErrorRef.current = setLearningError
setLearningLoadingRef.current = setLearningLoading
setLearningResultRef.current = setLearningResult
syncLearningUiFromSessionRef.current = syncLearningUiFromSession
clearLearningRecoveryStorageRef.current = clearLearningRecoveryStorage
loadLearningRecoveryRef.current = loadLearningRecovery
purgeFreshLearningRecoveryRef.current = purgeFreshLearningRecovery
clearPersistedLearningSessionRef.current = clearPersistedLearningSession
resetLearningSessionUiRef.current = resetLearningSessionUi
resumeLearningSessionRef.current = resumeLearningSession
startLearningSessionRef.current = startLearningSession
})

useEffect(() => {
startedRequestKeyRef.current = null
}, [skillIdFromQuery])

useEffect(()=>{

console.log("TRACE_USE_EFFECT_START")

if(!isLearningSessionMode || !skillIdFromQuery){

if(!questSessionRef.current){

startedRequestKeyRef.current = null

setLearningErrorRef.current(null)

setLearningLoadingRef.current(false)

setLearningResultRef.current(null)

syncLearningUiFromSessionRef.current(null,null)

clearLearningRecoveryStorageRef.current()

}

return

}

if(questSessionRef.current) return

if(questLearningLoadingRef.current) return

if(questLearningResultRef.current){

startedRequestKeyRef.current = null
return

}

const recovery = loadLearningRecoveryRef.current()

const forceFreshStart =
Boolean((freshFromQueryRef.current || retryFromQueryRef.current) && !questLearningResultRef.current)

if(forceFreshStart && questStatusRef.current !== "cleared"){

const requestKey = `fresh:${skillIdFromQuery}:${freshFromQueryRef.current ? "1" : "0"}:${retryFromQueryRef.current ? "1" : "0"}`

if(startedRequestKeyRef.current === requestKey) return

purgeFreshLearningRecoveryRef.current()

clearLearningRecoveryStorageRef.current()

clearPersistedLearningSessionRef.current(skillIdFromQuery)

resetLearningSessionUiRef.current()

console.log("CALLING START SESSION", skillIdFromQuery)
void startLearningSessionRef.current(
skillIdFromQuery,
{ fresh:true }
)

startedRequestKeyRef.current = requestKey

return

}

if(recovery?.sessionId){

const requestKey = `resume:${skillIdFromQuery}:${recovery.sessionId}`

if(startedRequestKeyRef.current === requestKey) return

void resumeLearningSessionRef.current(
recovery.sessionId,
skillIdFromQuery
)

startedRequestKeyRef.current = requestKey

return

}

const requestKey = `start:${skillIdFromQuery}`

if(startedRequestKeyRef.current === requestKey) return

console.log("CALLING START SESSION", skillIdFromQuery)
void startLearningSessionRef.current(skillIdFromQuery)

setTimeout(() => {
  const session = questSessionRef.current;

  if (session?.problems?.length) {
    console.log("FORCE SET CURRENT PROBLEM");

    syncLearningUiFromSessionRef.current(
      session,
      session.problems[0]
    );
  }
}, 0);

startedRequestKeyRef.current = requestKey

},[
isLearningSessionMode,
skillIdFromQuery
])

}
