import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, requireAuth } from "@/backend/auth";
import { getAutopilotStatus } from "@/backend/service";

export const runtime = "nodejs";

const querySchema = z.object({
  wallet: z.string().min(32).optional()
});

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse({
    wallet: req.nextUrl.searchParams.get("wallet") ?? undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query params" }, { status: 400 });
  }

  try {
    if (parsed.data.wallet) {
      requireAuth(req, parsed.data.wallet);
      return NextResponse.json({ status: getAutopilotStatus(parsed.data.wallet) });
    }

    requireAuth(req);
    return NextResponse.json({ status: getAutopilotStatus() });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load scheduler status" },
      { status: 500 }
    );
  }
}
