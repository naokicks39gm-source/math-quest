import { NextResponse } from "next/server";
import { isValidEmail } from "@/lib/server/crypto";
import { upsertStudent } from "@/lib/server/db";

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as { displayName?: string; parentEmail?: string };
    const displayName = body.displayName?.trim() ?? "";
    const parentEmail = body.parentEmail?.trim() ?? "";
    if (!displayName) {
      return NextResponse.json({ error: "displayName is required" }, { status: 400 });
    }
    if (!isValidEmail(parentEmail)) {
      return NextResponse.json({ error: "valid parentEmail is required" }, { status: 400 });
    }
    const student = upsertStudent(displayName, parentEmail);
    return NextResponse.json({
      studentId: student.id,
      displayName: student.displayName,
      parentEmailMasked: student.parentEmailMask
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    if (message.includes("MQ_EMAIL_ENC_KEY")) {
      return NextResponse.json(
        { error: "サーバー設定エラーです（暗号鍵未設定）。管理者に連絡してください。" },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
