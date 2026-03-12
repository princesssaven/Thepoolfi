import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, requireAuth } from "@/backend/auth";
import { updatePolicyForWallet } from "@/backend/service";

export const runtime = "nodejs";

const bodySchema = z.object({
  walletAddress: z.string().min(32),
  riskTolerance: z.enum(["low", "medium", "high"]).optional(),
  maxTransactionSol: z.number().positive().max(100).optional(),
  maxHighRiskTxSizeSol: z.number().positive().max(20).optional(),
  maxDailyLossPct: z.number().min(0).max(100).optional(),
  nftApprovalThresholdSol: z.number().positive().max(500).optional(),
  humanConfirmation: z.boolean().optional(),
  autopilotEnabled: z.boolean().optional(),
  autopilotIntervalSec: z.number().int().positive().optional(),
  allowedProtocols: z.array(z.string().min(1)).optional(),
  blockedProtocols: z.array(z.string().min(1)).optional()
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    requireAuth(req, parsed.data.walletAddress);
    const policy = updatePolicyForWallet(parsed.data);
    return NextResponse.json({
      message: "Policy updated",
      policy
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set policy" },
      { status: 500 }
    );
  }
}
