import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, requireAuth } from "@/backend/auth";
import { startAutopilot } from "@/backend/service";

export const runtime = "nodejs";

const bodySchema = z.object({
  walletAddress: z.string().min(32),
  intervalSec: z.number().int().positive().optional()
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    requireAuth(req, parsed.data.walletAddress);
    const status = startAutopilot(parsed.data);
    return NextResponse.json({ status });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start autopilot" },
      { status: 500 }
    );
  }
}
