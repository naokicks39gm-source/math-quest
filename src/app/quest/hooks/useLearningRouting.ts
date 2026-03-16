import { useCallback } from "react"
import { useRouter } from "next/navigation"

type Params = {

skillIdFromQuery:string|null

setLearningSessionId:(v:string|null)=>void

clearLearningRecoveryStorage:()=>void

clearPersistedLearningSession:(skillId:string)=>void

setLearningResult:(v:any)=>void

resetLearningSessionUi:()=>void

purgeFreshLearningRecovery:()=>void

}

export function useLearningRouting({

skillIdFromQuery,

setLearningSessionId,

clearLearningRecoveryStorage,

clearPersistedLearningSession,

setLearningResult,

resetLearningSessionUi,

purgeFreshLearningRecovery

}:Params){

const router = useRouter()



const handleFreshStart = useCallback((skillId:string)=>{

clearLearningRecoveryStorage()

clearPersistedLearningSession(skillId)

setLearningSessionId(null)

router.replace(`/quest?skillId=${skillId}&fresh=1`)

},[
router,
clearLearningRecoveryStorage,
clearPersistedLearningSession,
setLearningSessionId
])






const resolveSkillId = useCallback(()=>{

if(skillIdFromQuery)return skillIdFromQuery

return null

},[
skillIdFromQuery
])

const handleRetry = useCallback((skillId:string)=>{

setLearningResult(null)

resetLearningSessionUi()

purgeFreshLearningRecovery()

clearLearningRecoveryStorage()

clearPersistedLearningSession(skillId)

router.replace(
`/quest?skillId=${encodeURIComponent(skillId)}&fresh=1`
)

},[
router,
clearLearningRecoveryStorage,
clearPersistedLearningSession,
setLearningSessionId
])

return{

handleFreshStart,

handleRetry,

resolveSkillId

}

}