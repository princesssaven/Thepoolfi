import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AuthError, requireAuth } from "@/backend/auth";
import { runManagedAgentCycle } from "@/backend/service";

export const runtime = "nodejs";

const bodySchema = z.object({
  walletAddress: z.string().min(32),
  instruction: z.string().min(5).optional(),
  riskTolerance: z.enum(["low", "medium", "high"]).optional(),
  maxTransactionSol: z.number().positive().optional(),
  allowedProtocols: z.array(z.string()).optional(),
  blockedProtocols: z.array(z.string()).optional(),
  humanConfirmation: z.boolean().optional()
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload",
        issues: parsed.error.issues
      },
      { status: 400 }
    );
  }

  try {
    requireAuth(req, parsed.data.walletAddress);
    const cycle = await runManagedAgentCycle({
      walletAddress: parsed.data.walletAddress,
      instruction: parsed.data.instruction,
      riskTolerance: parsed.data.riskTolerance,
      maxTransactionSol: parsed.data.maxTransactionSol,
      allowedProtocols: parsed.data.allowedProtocols,
      blockedProtocols: parsed.data.blockedProtocols,
      humanConfirmation: parsed.data.humanConfirmation
    });

    return NextResponse.json(cycle);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Agent run failed"
      },
      { status: 500 }
    );
  }
}
