import { useState } from "react"

export function useLearningSession(){

const [learningResult,setLearningResult]=useState(null)

const [session,setSession]=useState(null)

const [status,setStatus]=useState("playing")

return{

learningResult,
setLearningResult,

session,
setSession,

status,
setStatus

}

}
