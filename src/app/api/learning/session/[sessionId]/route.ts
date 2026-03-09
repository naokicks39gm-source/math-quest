import { NextResponse } from "next/server";
import { serializeState } from "packages/learning-engine";
import type { LearningSessionResumeResponse } from "packages/problem-format";
import { getLearningSessionById } from "@/lib/server/db";

export async function GET(_: Request, context: { params: Promise<unknown> }) {
  try {
    const params = await context.params;
    const resolvedSessionId =
      typeof params === "object" &&
      params !== null &&
      "sessionId" in params &&
      typeof (params as { sessionId?: unknown }).sessionId === "string"
        ? (params as { sessionId: string }).sessionId.trim()
        : "";
    if (!resolvedSessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const stored = getLearningSessionById(resolvedSessionId);
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
    const session = state.session;
    if (!session) {
      return NextResponse.json({ error: "learning_session_invalid" }, { status: 422 });
    }
    if (session.skillId && session.skillId !== stored.skillId) {
      return NextResponse.json({ error: "learning_session_skill_mismatch" }, { status: 409 });
    }

    const response: LearningSessionResumeResponse = {
      sessionId: stored.sessionId,
      expiresAt: stored.expiresAt,
      state,
      session
    };
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}
