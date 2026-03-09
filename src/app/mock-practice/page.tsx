"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { getPracticeSkill, practiceSkills } from "@/lib/learningSkillCatalog";
import { updateDailyStreak } from "@/lib/streak";
import { updateXpFromSession } from "@/lib/xp";
import { AnswerInput, ProblemCard, ResultView, SessionResultView } from "packages/ui";
import type {
  LearningSessionAnswerResponse,
  LearningSessionFinishResponse,
  LearningSessionStartResponse
} from "packages/problem-format/learningSessionApi";
import {
  LEARNING_STATE_KEY,
  loadStateFromClient,
  type LearningState
} from "packages/learning-engine/studentStore";
import type { SessionProblem, Session } from "packages/learning-engine/sessionTypes";

const TOTAL_QUESTIONS = 5;

function MockPracticeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const skillId = searchParams.get("skillId");
  const selectedSkill = useMemo(
    () => (skillId ? getPracticeSkill(skillId) : undefined) ?? practiceSkills[0],
    [skillId]
  );

  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [hasJudgedCurrentQuestion, setHasJudgedCurrentQuestion] = useState(false);
  const [learningState, setLearningState] = useState<LearningState | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [judgedProblem, setJudgedProblem] = useState<SessionProblem | null>(null);
  const [resultSummary, setResultSummary] = useState<LearningSessionFinishResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeSkillId = selectedSkill.id;
  const currentProblem = session ? session.problems[session.index] ?? null : null;
  const displayedProblem = hasJudgedCurrentQuestion ? judgedProblem : currentProblem;

  const persistState = (state: LearningState) => {
    setLearningState(state);
    setSession(state.session ?? null);
    window.localStorage.setItem(LEARNING_STATE_KEY, JSON.stringify(state));
  };

  const resetSessionState = () => {
    setAnswer("");
    setResult(null);
    setHasJudgedCurrentQuestion(false);
    setLearningState(null);
    setSession(null);
    setSessionId(null);
    setJudgedProblem(null);
    setResultSummary(null);
  };

  const loadSession = async (nextSkillId: string) => {
    setLoading(true);
    setError(null);
    resetSessionState();

    try {
      const state = loadStateFromClient();
      const response = await fetch("/api/learning/session/start", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          state,
          mode: "skill",
          skillId: nextSkillId
        })
      });
      const body = (await response.json()) as LearningSessionStartResponse | { error?: string };

      if (!response.ok) {
        throw new Error("error" in body && body.error ? body.error : "Session unavailable");
      }

      const data = body as LearningSessionStartResponse;
      if (!data.session?.problems?.length || data.session.problems.length !== TOTAL_QUESTIONS) {
        throw new Error("Session unavailable");
      }

      setSessionId(data.sessionId);
      persistState(data.state);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Session unavailable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSession(activeSkillId);
  }, [activeSkillId]);

  const handleJudge = async () => {
    if (!currentProblem || !learningState || hasJudgedCurrentQuestion) return;

    const isCorrect = answer.trim() === currentProblem.problem.answer;
    const answerIndex = session?.index ?? 0;

    try {
      const response = await fetch("/api/learning/session/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId,
          index: answerIndex,
          answer,
          correct: isCorrect
        })
      });
      const body = (await response.json()) as LearningSessionAnswerResponse | { error?: string };

      if (!response.ok) {
        throw new Error("error" in body && body.error ? body.error : "Answer submission failed");
      }

      const data = body as LearningSessionAnswerResponse;
      setSessionId(data.sessionId);
      setResult(isCorrect);
      setHasJudgedCurrentQuestion(true);
      setJudgedProblem(currentProblem);
      persistState(data.state);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Answer submission failed");
    }
  };

  const handleNext = async () => {
    if (!currentProblem || !learningState || !session || !sessionId || !hasJudgedCurrentQuestion) return;

    if (session.index >= session.problems.length) {
      try {
        const response = await fetch("/api/learning/session/finish", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            sessionId
          })
        });
        const body = (await response.json()) as LearningSessionFinishResponse | { error?: string };

        if (!response.ok) {
          throw new Error("error" in body && body.error ? body.error : "Finish failed");
        }

        const summary = body as LearningSessionFinishResponse;
        setSessionId(summary.sessionId);
        persistState(summary.state);
        updateDailyStreak();
        updateXpFromSession(summary.result.score);
        trackAnalyticsEvent("session_finish");
        setResultSummary(summary);
        setResult(null);
        setHasJudgedCurrentQuestion(false);
        setJudgedProblem(null);
        return;
      } catch (finishError) {
        setError(finishError instanceof Error ? finishError.message : "Finish failed");
        return;
      }
    }

    setAnswer("");
    setResult(null);
    setHasJudgedCurrentQuestion(false);
    setJudgedProblem(null);
  };

  const handleRetry = () => {
    void loadSession(activeSkillId);
  };

  const handleBackToSkills = () => {
    router.push("/mock-skills");
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6d6_0%,#fffaf0_35%,#eef6ff_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-600">Practice</div>
          <h1 className="mt-3 text-3xl font-black">{selectedSkill.title}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {selectedSkill.code} / Question {Math.min((session?.index ?? 0) + 1, TOTAL_QUESTIONS)} / {TOTAL_QUESTIONS}
          </p>
        </section>

        {loading ? (
          <section className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
            <div className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-600">Loading</div>
            <p className="mt-3 text-lg font-bold text-slate-900">セッションを開始しています...</p>
          </section>
        ) : error ? (
          <section className="rounded-[32px] border border-rose-200 bg-rose-50 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
            <div className="text-sm font-semibold uppercase tracking-[0.35em] text-rose-600">Load Error</div>
            <p className="mt-3 text-lg font-bold text-rose-900">{error}</p>
            <button
              type="button"
              onClick={() => void loadSession(activeSkillId)}
              className="mt-5 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
            >
              Retry Load
            </button>
          </section>
        ) : resultSummary ? (
          <SessionResultView
            skillId={activeSkillId}
            skillName={selectedSkill.title}
            score={resultSummary.result.score}
            totalQuestions={resultSummary.result.totalQuestions}
            earnedXp={resultSummary.result.score * 10}
            difficultyBefore={resultSummary.result.difficultyBefore}
            difficultyAfter={resultSummary.result.difficultyAfter}
            weakPatternsDetected={resultSummary.result.weakPatternsDetected}
            skillProgressBefore={resultSummary.result.skillProgressBefore}
            skillProgressAfter={resultSummary.result.skillProgressAfter}
            onRetry={handleRetry}
            onContinueLearning={() => {
              handleRetry();
            }}
            onBackToSkills={handleBackToSkills}
          />
        ) : !displayedProblem ? (
          <section className="rounded-[32px] border border-amber-200 bg-amber-50 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
            <div className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-700">Session unavailable</div>
            <p className="mt-3 text-lg font-bold text-amber-900">Session unavailable</p>
          </section>
        ) : (
          <>
            <ProblemCard question={displayedProblem.problem.question} />
            <AnswerInput answer={answer} setAnswer={setAnswer} />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleJudge()}
                disabled={hasJudgedCurrentQuestion}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                判定
              </button>
              <button
                type="button"
                onClick={() => void handleNext()}
                disabled={!hasJudgedCurrentQuestion}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next問題
              </button>
            </div>

            <ResultView isCorrect={result} correctAnswer={displayedProblem.problem.answer} />
          </>
        )}
      </div>
    </main>
  );
}

export default function MockPracticePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MockPracticeContent />
    </Suspense>
  );
}
