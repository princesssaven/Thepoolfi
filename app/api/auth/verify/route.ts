import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, verifyWalletChallenge } from "@/backend/auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  walletAddress: z.string().min(32),
  challengeId: z.string().min(8),
  signatureBase64: z.string().min(32)
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const auth = verifyWalletChallenge(parsed.data);
    return NextResponse.json({
      token: auth.token,
      expiresAt: auth.expiresAt
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 }
    );
  }
}
