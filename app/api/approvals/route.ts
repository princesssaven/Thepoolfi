import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, requireAuth } from "@/backend/auth";
import { listPendingApprovals } from "@/backend/service";

export const runtime = "nodejs";

const querySchema = z.object({
  wallet: z.string().min(32)
});

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse({
    wallet: req.nextUrl.searchParams.get("wallet")
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Missing or invalid wallet query param" }, { status: 400 });
  }

  try {
    requireAuth(req, parsed.data.wallet);
    const approvals = listPendingApprovals(parsed.data.wallet);
    return NextResponse.json({ approvals });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load approvals" },
      { status: 500 }
    );
  }
}
