import { NextResponse } from "next/server";
import { finishSession, serializeState } from "packages/learning-engine";
import type { LearningSessionFinishResponse } from "packages/problem-format";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { state?: unknown };
    const result = finishSession(serializeState(body.state));
    const response: LearningSessionFinishResponse = {
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
