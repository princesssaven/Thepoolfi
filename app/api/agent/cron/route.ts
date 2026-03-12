import { NextRequest, NextResponse } from "next/server";

import { AuthError, requireAuth } from "@/backend/auth";
import { runAutopilotCronSweep } from "@/backend/service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
    const result = await runAutopilotCronSweep();
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron sweep failed" },
      { status: 500 }
    );
  }
}
