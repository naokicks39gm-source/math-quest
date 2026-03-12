import { NextResponse } from "next/server";
import { recordAnswer, serializeState } from "packages/learning-engine";
import type { LearningSessionAnswerRequest, LearningSessionAnswerResponse } from "packages/problem-format";
import { getLearningSessionById, upsertLearningSession } from "@/lib/server/db";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<LearningSessionAnswerRequest>;
    const sessionId = body.sessionId?.trim() ?? "";

    if (
      !sessionId ||
      typeof body.correct !== "boolean" ||
      typeof body.index !== "number" ||
      typeof body.answer !== "string"
    ) {
      return NextResponse.json({ error: "invalid_answer_payload" }, { status: 400 });
    }
    const stored = getLearningSessionById(sessionId);
    if (!stored) {
      return NextResponse.json({ error: "learning_session_not_found" }, { status: 404 });
    }
    if (stored.finished || stored.status !== "active") {
      return NextResponse.json({ error: "learning_session_completed" }, { status: 409 });
    }
    if (Date.now() > stored.expiresAt) {
      return NextResponse.json({ error: "learning_session_expired" }, { status: 409 });
    }
    const state = serializeState(JSON.parse(stored.stateJson));
    const currentIndex = state.session?.index ?? -1;
    if (currentIndex !== body.index) {
      return NextResponse.json({ error: "learning_session_index_mismatch" }, { status: 409 });
    }

    const result = recordAnswer(state, {
      correct: body.correct,
      userAnswer: body.answer
    });
    upsertLearningSession({
      sessionId,
      skillId: stored.skillId,
      stateJson: JSON.stringify(result.state),
      sessionJson: JSON.stringify(result.session),
      status: "active",
      expiresAt: stored.expiresAt,
      finished: false
    });

    const response: LearningSessionAnswerResponse = {
      sessionId,
      expiresAt: stored.expiresAt,
      state: result.state,
      session: result.session
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}
