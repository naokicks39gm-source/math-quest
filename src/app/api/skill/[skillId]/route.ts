import { NextResponse } from "next/server";

type SkillRouteContext = {
  params: Promise<unknown>;
};

export async function GET(_request: Request, { params }: SkillRouteContext) {
  try {
    const resolvedParams = (await params) as { skillId?: string };
    const skillId = resolvedParams.skillId?.trim() ?? "";

    if (!skillId) {
      return NextResponse.json({ error: "skill_id_required" }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: "learning_session_api_required",
        skillId
      },
      { status: 410 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}
