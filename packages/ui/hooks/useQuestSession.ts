import { useState } from "react"
import type { Session } from "../../../packages/learning-engine/sessionTypes"

export function useQuestSession(){

const [learningResult, setLearningResult] = useState(null)

const [status, setStatus] = useState<'playing' | 'cleared' | 'blocked'>('playing')

const [session, setSession] = useState<Session | null>(null)

return {

learningResult,
setLearningResult,

session,
setSession,

status,
setStatus

}

}
