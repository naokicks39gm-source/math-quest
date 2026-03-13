import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { serializeState, startSession } from "packages/learning-engine";
import type { LearningSessionStartRequest, LearningSessionStartResponse } from "packages/problem-format";
import { upsertLearningSession } from "@/lib/server/db";

const LEARNING_SESSION_TTL_MS = 30 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LearningSessionStartRequest;

    if (body.mode !== "skill" && body.mode !== "adaptive") {
      return NextResponse.json({ error: "mode must be skill or adaptive" }, { status: 400 });
    }

    const result = startSession(serializeState(body.state), {
      mode: body.mode,
      skillId: typeof body.skillId === "string" ? body.skillId : undefined,
      fresh: body.fresh === true,
      carryoverHistory: Array.isArray(body.carryoverHistory) ? body.carryoverHistory : undefined,
      recentProblems: Array.isArray(body.recentProblems) ? body.recentProblems : undefined
    });
    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + LEARNING_SESSION_TTL_MS;
    upsertLearningSession({
      sessionId,
      skillId: result.session.skillId ?? body.skillId ?? "",
      stateJson: JSON.stringify(result.state),
      sessionJson: JSON.stringify(result.session),
      status: "active",
      expiresAt,
      finished: false
    });

    const response: LearningSessionStartResponse = {
      sessionId,
      expiresAt,
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
