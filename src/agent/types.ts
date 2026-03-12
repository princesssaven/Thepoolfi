export type RiskTolerance = "low" | "medium" | "high";
export type ProtocolName = "jupiter" | "marinade" | "raydium";
export type ActionType = "swap" | "stake" | "farm" | "claim" | "unstake" | "rebalance" | "exit";

export type PortfolioAsset = {
  symbol: string;
  mint?: string;
  amount: number;
  usdValue: number;
};

export type PortfolioState = {
  walletAddress: string;
  totalUsdValue: number;
  solBalance: number;
  assets: PortfolioAsset[];
  fetchedAt: string;
};

export type UserInstructionProfile = {
  instruction: string;
  riskTolerance: RiskTolerance;
  maxTransactionSol: number;
  allowedProtocols: ProtocolName[];
  blockedProtocols: ProtocolName[];
  humanConfirmation: boolean;
};

export type ProtocolOpportunity = {
  id: string;
  protocol: ProtocolName;
  actionType: ActionType;
  inputSymbol: string;
  outputSymbol?: string;
  estimatedApy: number;
  estimatedFeesBps: number;
  estimatedRiskScore: number;
  confidence: number;
  priceImpactPct?: number;
  liquidityUsd?: number;
  dataSource?: string;
  minAmountSol: number;
  maxAmountSol: number;
  note: string;
};

export type RiskAssessment = {
  opportunityId?: string;
  protocol: ProtocolName;
  riskScore: number;
  warnings: string[];
  approvedByRisk: boolean;
};

export type ProposedDecision = {
  opportunityId: string;
  protocol: ProtocolName;
  actionType: ActionType;
  inputSymbol?: string;
  outputSymbol?: string;
  amountSol: number;
  reason: string;
  riskScore: number;
  requiresConfirmation: boolean;
};

export type PolicyValidation = {
  approved: boolean;
  reason?: string;
  decision: ProposedDecision;
};

export type ExecutionResult = {
  status: "executed" | "simulated" | "skipped" | "failed";
  protocol: ProtocolName;
  actionType: ActionType;
  inputSymbol?: string;
  outputSymbol?: string;
  txSignature?: string;
  details: string;
};

export type PendingApproval = {
  id: string;
  walletAddress: string;
  decision: ProposedDecision;
  reason: string;
  status: "pending" | "approved" | "rejected" | "executed" | "expired";
  createdAt: string;
  updatedAt: string;
};

export type AgentRunReport = {
  profile: UserInstructionProfile;
  portfolio: PortfolioState;
  opportunities: ProtocolOpportunity[];
  riskAssessments: RiskAssessment[];
  proposedDecisions: ProposedDecision[];
  policyChecks: PolicyValidation[];
  execution: ExecutionResult[];
  pendingApprovals?: PendingApproval[];
  timestamp: string;
};
