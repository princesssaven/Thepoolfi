import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, requireAuth } from "@/backend/auth";
import { executeManualTransaction } from "@/backend/service";

export const runtime = "nodejs";

const bodySchema = z.object({
  walletAddress: z.string().min(32),
  protocol: z.enum(["jupiter", "marinade", "raydium"]),
  actionType: z.enum(["swap", "stake", "farm", "claim", "unstake", "rebalance", "exit"]),
  amountSol: z.number().positive(),
  reason: z.string().min(3),
  riskScore: z.number().min(0).max(100).optional(),
  requiresConfirmation: z.boolean().optional(),
  inputSymbol: z.string().min(1).optional(),
  outputSymbol: z.string().min(1).optional()
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    requireAuth(req, parsed.data.walletAddress);
    const result = await executeManualTransaction(parsed.data);
    return NextResponse.json({
      message: "Transaction execution request processed",
      ...result
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute transaction" },
      { status: 500 }
    );
  }
}
