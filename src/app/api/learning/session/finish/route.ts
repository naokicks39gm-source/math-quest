import { NextResponse } from "next/server";
import { finishSession, serializeState } from "packages/learning-engine";
import type { LearningSessionFinishResponse } from "packages/problem-format";
import { getLearningSessionById, upsertLearningSession } from "@/lib/server/db";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { sessionId?: string };
    const sessionId = body.sessionId?.trim() ?? "";
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
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
    const result = finishSession(serializeState(JSON.parse(stored.stateJson)));
    upsertLearningSession({
      sessionId,
      skillId: stored.skillId,
      stateJson: JSON.stringify(result.state),
      sessionJson: JSON.stringify(result.state.session ?? null),
      status: "completed",
      expiresAt: stored.expiresAt,
      finished: true
    });
    const response: LearningSessionFinishResponse = {
      sessionId,
      expiresAt: stored.expiresAt,
      state: result.state,
      result: result.result
    };
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}
