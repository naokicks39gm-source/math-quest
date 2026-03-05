import { NextResponse } from "next/server";
import { startSessionForStudent } from "@/lib/server/sessionService";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { studentId?: string };
    const studentId = body.studentId?.trim() ?? "";
    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }
    const session = startSessionForStudent(studentId);
    return NextResponse.json({
      sessionId: session.id,
      startedAt: session.startedAt
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}

