import { useCallback, useMemo, useState } from "react"
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

const startLearningSession = useCallback(async(
 skillId:string,
 options?:{fresh?:boolean}
)=>{

console.log(
 "START SESSION skillId:",
 skillId,
 options
)
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

console.log("DATA FULL",data)

console.log("SESSION EXISTS",!!data.session)

console.log("PROBLEMS",data.session?.problems)

console.log("FIRST",data.firstProblem)

setSession(data.session)

console.log("START RESPONSE",data)

console.log(
 "SESSION PROBLEMS",
 data.session?.problems?.length
)

console.log(
 "FIRST PROBLEM",
 data.firstProblem
)


setSession(data.session)

if(data.firstProblem){

 setCurrentProblem(data.firstProblem)

}else if(data.session?.problems?.length){

 setCurrentProblem(
  data.session.problems[0]
 )

}else{

 console.error(
  "SESSION HAS NO PROBLEMS",
  data.session
 )

}

}catch(e){

console.error(e)

setLearningError("session start failed")

}finally{

setLearningLoading(false)

}
},[])


return useMemo(()=>({

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

}),[
learningResult,
session,
status,
currentProblem,
startLearningSession,
learningLoading,
learningError,
learningHint,
learningExplanation,
learningAttemptCount
])

}
