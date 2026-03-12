import { PolicyValidation, ProposedDecision, UserInstructionProfile } from "@/agent/types";

const HIGH_RISK_THRESHOLD = 65;

export function validatePolicy(
  decision: ProposedDecision,
  profile: UserInstructionProfile,
  maxHighRiskTxSizeSol: number
): PolicyValidation {
  if (profile.blockedProtocols.includes(decision.protocol)) {
    return {
      approved: false,
      reason: `Protocol ${decision.protocol} is blocked by policy`,
      decision
    };
  }

  if (!profile.allowedProtocols.includes(decision.protocol)) {
    return {
      approved: false,
      reason: `Protocol ${decision.protocol} is not allowed`,
      decision
    };
  }

  if (decision.amountSol > profile.maxTransactionSol) {
    return {
      approved: false,
      reason: `Decision exceeds max transaction size (${decision.amountSol.toFixed(2)} SOL > ${profile.maxTransactionSol.toFixed(2)} SOL)`,
      decision
    };
  }

  if (decision.riskScore >= HIGH_RISK_THRESHOLD && decision.amountSol > maxHighRiskTxSizeSol) {
    return {
      approved: false,
      reason: `High-risk decision amount exceeds cap (${maxHighRiskTxSizeSol.toFixed(2)} SOL)`,
      decision
    };
  }

  if (profile.humanConfirmation && decision.requiresConfirmation) {
    return {
      approved: false,
      reason: "Decision requires explicit user confirmation",
      decision
    };
  }

  return {
    approved: true,
    decision
  };
}
