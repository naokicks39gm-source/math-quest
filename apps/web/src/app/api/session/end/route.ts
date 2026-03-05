import { NextResponse } from "next/server";
import { endSessionAndSendReport } from "@/lib/server/sessionService";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { sessionId?: string };
    const sessionId = body.sessionId?.trim() ?? "";
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }
    const result = await endSessionAndSendReport(sessionId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}

