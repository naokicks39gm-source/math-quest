"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { dummySkills } from "@/mock/dummySkills";
import { AnswerInput, ProblemCard, ResultView, SessionResultView } from "packages/ui";

const TOTAL_QUESTIONS = 5;

type PracticeProblem = {
  id: string;
  question: string;
  answer: string;
  typeId: string;
  patternId: string | null;
  difficulty: number;
};

type SkillProblemsResponse = {
  skillId: string;
  skillTitle: string;
  problems: PracticeProblem[];
};

function MockPracticeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const skillId = searchParams.get("skillId");
  const selectedSkill = useMemo(
    () => dummySkills.find((skill) => skill.id === skillId) ?? dummySkills[0],
    [skillId]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [hasJudgedCurrentQuestion, setHasJudgedCurrentQuestion] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [problems, setProblems] = useState<PracticeProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeSkillId = selectedSkill.id;
  const currentProblem = problems[currentIndex] ?? null;

  const resetSessionState = () => {
    setCurrentIndex(0);
    setCorrectCount(0);
    setAnswer("");
    setResult(null);
    setHasJudgedCurrentQuestion(false);
    setIsSessionComplete(false);
  };

  const loadProblems = async (nextSkillId: string) => {
    setLoading(true);
    setError(null);
    resetSessionState();

    try {
      const response = await fetch(`/api/skill/${encodeURIComponent(nextSkillId)}`, {
        method: "GET",
        cache: "no-store"
      });
      const data = (await response.json()) as SkillProblemsResponse | { error?: string };

      if (!response.ok) {
        throw new Error("error" in data && data.error ? data.error : "failed_to_load_skill_problems");
      }

      if (!("problems" in data) || data.problems.length !== TOTAL_QUESTIONS) {
        throw new Error("invalid_problem_count");
      }

      setProblems(data.problems);
    } catch (fetchError) {
      setProblems([]);
      setError(fetchError instanceof Error ? fetchError.message : "failed_to_load_skill_problems");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProblems(activeSkillId);
  }, [activeSkillId]);

  const handleJudge = () => {
    if (!currentProblem) return;
    const isCorrect = answer.trim() === currentProblem.answer;
    setResult(isCorrect);

    if (!hasJudgedCurrentQuestion) {
      if (isCorrect) {
        setCorrectCount((current) => current + 1);
      }
      setHasJudgedCurrentQuestion(true);
    }
  };

  const handleNext = () => {
    if (!currentProblem) return;
    if (currentIndex + 1 >= TOTAL_QUESTIONS) {
      setIsSessionComplete(true);
      return;
    }

    setCurrentIndex((current) => current + 1);
    setAnswer("");
    setResult(null);
    setHasJudgedCurrentQuestion(false);
  };

  const handleRetry = () => {
    void loadProblems(activeSkillId);
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
            {selectedSkill.code} / Question {Math.min(currentIndex + 1, TOTAL_QUESTIONS)} / {TOTAL_QUESTIONS}
          </p>
        </section>

        {loading ? (
          <section className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
            <div className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-600">Loading</div>
            <p className="mt-3 text-lg font-bold text-slate-900">問題を生成しています...</p>
          </section>
        ) : error ? (
          <section className="rounded-[32px] border border-rose-200 bg-rose-50 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
            <div className="text-sm font-semibold uppercase tracking-[0.35em] text-rose-600">Load Error</div>
            <p className="mt-3 text-lg font-bold text-rose-900">{error}</p>
            <button
              type="button"
              onClick={() => void loadProblems(activeSkillId)}
              className="mt-5 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
            >
              Retry Load
            </button>
          </section>
        ) : isSessionComplete ? (
          <SessionResultView
            score={correctCount}
            totalQuestions={TOTAL_QUESTIONS}
            onRetry={handleRetry}
            onBackToSkills={handleBackToSkills}
          />
        ) : !currentProblem ? (
          <section className="rounded-[32px] border border-amber-200 bg-amber-50 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
            <div className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-700">No Problems</div>
            <p className="mt-3 text-lg font-bold text-amber-900">問題を用意できませんでした。</p>
          </section>
        ) : (
          <>
            <ProblemCard question={currentProblem.question} />
            <AnswerInput answer={answer} setAnswer={setAnswer} />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleJudge}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
              >
                判定
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
              >
                Next問題
              </button>
            </div>

            <ResultView isCorrect={result} correctAnswer={currentProblem.answer} />
          </>
        )}
      </div>
    </main>
  );
}

export default function MockPracticePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6d6_0%,#fffaf0_35%,#eef6ff_100%)] px-6 py-10 text-slate-900" />}>
      <MockPracticeContent />
    </Suspense>
  );
}
