import { NextResponse } from "next/server";
import { recordAnswer, serializeState } from "packages/learning-engine";
import type { LearningSessionAnswerResponse } from "packages/problem-format";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      state?: unknown;
      correct?: boolean;
    };

    if (typeof body.correct !== "boolean") {
      return NextResponse.json({ error: "invalid_answer_payload" }, { status: 400 });
    }

    const result = recordAnswer(serializeState(body.state), {
      correct: body.correct
    });

    const response: LearningSessionAnswerResponse = {
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
