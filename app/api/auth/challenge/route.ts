import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { issueWalletChallenge } from "@/backend/auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  walletAddress: z.string().min(32)
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const challenge = issueWalletChallenge(parsed.data.walletAddress);
    return NextResponse.json({
      challengeId: challenge.id,
      message: challenge.message,
      expiresAt: challenge.expiresAt
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to issue challenge" },
      { status: 500 }
    );
  }
}
