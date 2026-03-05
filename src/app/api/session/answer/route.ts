import { NextResponse } from "next/server";
import { appendAnswer } from "@/lib/server/sessionService";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      sessionId?: string;
      typeId?: string;
      prompt?: string;
      predicted?: string;
      correctAnswer?: string;
      isCorrect?: boolean;
    };
    const sessionId = body.sessionId?.trim() ?? "";
    const typeId = body.typeId?.trim() ?? "";
    const prompt = body.prompt?.trim() ?? "";
    const predicted = body.predicted?.trim() ?? "";
    const correctAnswer = body.correctAnswer?.trim() ?? "";
    if (!sessionId || !typeId || !prompt) {
      return NextResponse.json({ error: "sessionId, typeId and prompt are required" }, { status: 400 });
    }
    appendAnswer({
      sessionId,
      typeId,
      prompt,
      predicted,
      correctAnswer,
      isCorrect: Boolean(body.isCorrect)
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}

