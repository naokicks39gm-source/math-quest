import { useState } from "react"
import type { Session } from "../../../packages/learning-engine/sessionTypes"
import type { SessionProblem } from "../../../packages/learning-engine/sessionTypes"

export function useQuestSession(){

const [learningResult, setLearningResult] = useState(null)

const [status, setStatus] = useState<'playing' | 'cleared' | 'blocked'>('playing')

const [session, setSession] = useState<Session | null>(null)

const [currentProblem, setCurrentProblem] = useState<SessionProblem | null>(null)

const [learningLoading,setLearningLoading]=useState(false)

const [learningError,setLearningError]=useState<string|null>(null)
const [learningHint,setLearningHint]=useState<string|null>(null)

const [learningExplanation,setLearningExplanation]=useState<string|null>(null)
const [learningAttemptCount,setLearningAttemptCount]=useState(0)


async function startLearningSession(skillId:string){
console.log("START SESSION skillId:",skillId)
setStatus("playing")

setLearningResult(null)

setLearningLoading(true)

setLearningError(null)

try{

const res=await fetch("/api/learning/session/start",{

method:"POST",

headers:{

"Content-Type":"application/json"

},

body:JSON.stringify({

skillId,
mode:"skill"

})

})


const data=await res.json()

setSession(data.session)

setCurrentProblem(data.firstProblem)

}catch(e){

console.error(e)

setLearningError("session start failed")

}finally{

setLearningLoading(false)

}

}


return {

learningResult,
setLearningResult,

session,
setSession,

status,
setStatus,

currentProblem,
setCurrentProblem,

startLearningSession,

learningLoading,
setLearningLoading,

learningError,
setLearningError,
learningHint,
setLearningHint,

learningExplanation,
setLearningExplanation,

learningAttemptCount,
setLearningAttemptCount,

}

}
