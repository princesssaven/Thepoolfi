import { describe, expect, it } from "vitest";

import { validatePolicy } from "@/agent/policy";
import { ProposedDecision, UserInstructionProfile } from "@/agent/types";

const profile: UserInstructionProfile = {
  instruction: "Grow SOL",
  riskTolerance: "medium",
  maxTransactionSol: 2,
  allowedProtocols: ["jupiter", "marinade", "raydium"],
  blockedProtocols: ["raydium"],
  humanConfirmation: false
};

const decision: ProposedDecision = {
  opportunityId: "opp-1",
  protocol: "jupiter",
  actionType: "swap",
  amountSol: 1.2,
  reason: "test",
  riskScore: 44,
  requiresConfirmation: false
};

describe("validatePolicy", () => {
  it("approves a compliant decision", () => {
    const result = validatePolicy(decision, profile, 0.5);
    expect(result.approved).toBe(true);
  });

  it("rejects blocked protocol", () => {
    const result = validatePolicy({ ...decision, protocol: "raydium" }, profile, 0.5);
    expect(result.approved).toBe(false);
    expect(result.reason).toContain("blocked");
  });

  it("rejects oversized high-risk decisions", () => {
    const result = validatePolicy({ ...decision, riskScore: 80, amountSol: 1 }, profile, 0.4);
    expect(result.approved).toBe(false);
    expect(result.reason).toContain("High-risk");
  });
});
