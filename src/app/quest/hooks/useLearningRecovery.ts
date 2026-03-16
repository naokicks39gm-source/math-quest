import { useCallback } from "react";

type Params = {

quest:any

setLearningSessionId:(v:string|null)=>void
setLearningResultSkillId:(v:string|null)=>void

setItemIndex:(v:number)=>void
setCombo:(v:number)=>void

setLearningAttemptCount:(v:number)=>void

setQuestionResults:(v:any)=>void

}

export function useLearningRecovery({

quest,

setLearningSessionId,
setLearningResultSkillId,

setItemIndex,
setCombo,

setLearningAttemptCount,

setQuestionResults

}:Params){

const STORAGE_KEY="learning_recovery"
const STATE_KEY="learning_state"

const persistFullLearningState = useCallback(({

nextState,
sessionId,
skillId,
answers,
expiresAt

}:any)=>{

if(typeof window==="undefined")return

window.localStorage.setItem(
STATE_KEY,
JSON.stringify(nextState)
)

localStorage.setItem(

STORAGE_KEY,

JSON.stringify({

sessionId,

skillId,

currentIndex:
nextState.session?.index ?? 0,

answers:answers??[],

expiresAt:expiresAt??

Date.now() + (1000*60*60*24)
})

)

},[])



const clearLearningRecoveryStorage = useCallback(()=>{

localStorage.removeItem(STORAGE_KEY)

},[])





const saveLearningRecovery = useCallback((state:any)=>{

localStorage.setItem(

STORAGE_KEY,
JSON.stringify(state)

)

},[])





const loadLearningRecovery = useCallback(()=>{

const raw = localStorage.getItem(STORAGE_KEY)

if(!raw)return null

try{

return JSON.parse(raw)

}catch{

return null

}

},[])





const persistLearningState = useCallback((state:any)=>{

saveLearningRecovery(state)

},[saveLearningRecovery])





const applyRecovery = useCallback((data:any)=>{

if(!data)return

quest.setSession(data.session ?? null)

quest.setCurrentProblem(data.problem ?? null)

quest.setLearningHint(data.hint ?? null)

quest.setLearningExplanation(data.explanation ?? null)

setLearningSessionId(data.sessionId ?? null)

setItemIndex(data.currentIndex ?? 0)

setCombo(data.combo ?? 0)

setLearningAttemptCount(data.attemptCount ?? 0)

setQuestionResults(data.answers ?? {})

},[
quest,
setLearningSessionId,
setItemIndex,
setCombo,
setLearningAttemptCount,
setQuestionResults
])

return{

loadLearningRecovery,

saveLearningRecovery,

clearLearningRecoveryStorage,

persistLearningState,

persistFullLearningState,

applyRecovery

}

}