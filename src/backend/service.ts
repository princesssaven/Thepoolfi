import { executeDecisions } from "@/agent/executor";
import { buildProfile, runAgentCycle } from "@/agent/index";
import { validatePolicy } from "@/agent/policy";
import { fetchPortfolioState } from "@/agent/solana/portfolio";
import { ActionType, PendingApproval, ProposedDecision, ProtocolName } from "@/agent/types";
import {
  addRunReport,
  addTransactionLog,
  createPendingApproval,
  getApproval,
  getApprovals,
  getAutopilotWallets,
  getOrCreatePolicy,
  getOrCreateStrategy,
  getRunReports,
  getSession,
  getTransactionLogs,
  parseProtocols,
  parseRisk,
  setPolicy,
  setStrategy,
  updateApprovalStatus,
  upsertSession
} from "@/backend/state";
import { env } from "@/lib/env";

const CONFIRMATION_REASON = "Decision requires explicit user confirmation";

const schedulerTimers = new Map<string, NodeJS.Timeout>();
const schedulerInFlight = new Set<string>();
let schedulerBootstrapped = false;

function nowIso() {
  return new Date().toISOString();
}

function nextRunAt(intervalSec: number): string {
  return new Date(Date.now() + Math.max(30, intervalSec) * 1000).toISOString();
}

function shouldQueueForApproval(reason?: string): boolean {
  if (!reason) return false;
  return reason.toLowerCase().includes("explicit user confirmation");
}

function ensureSchedulerBootstrapped() {
  if (schedulerBootstrapped) return;
  schedulerBootstrapped = true;

  const wallets = getAutopilotWallets();
  for (const { walletAddress, policy } of wallets) {
    if (schedulerTimers.has(walletAddress)) continue;

    const timer = setInterval(() => {
      void runScheduledCycle(walletAddress);
    }, Math.max(30, policy.autopilotIntervalSec) * 1000);

    schedulerTimers.set(walletAddress, timer);
  }
}

function decisionFingerprint(decision: ProposedDecision): string {
  return [
    decision.protocol,
    decision.actionType,
    decision.inputSymbol ?? "",
    decision.outputSymbol ?? "",
    decision.amountSol.toFixed(6)
  ].join("|");
}

function mapExecutionToTxLogs(
  walletAddress: string,
  decision: ProposedDecision,
  execution: Awaited<ReturnType<typeof executeDecisions>>
) {
  for (const result of execution) {
    addTransactionLog({
      id: crypto.randomUUID(),
      walletAddress,
      protocol: result.protocol,
      actionType: result.actionType,
      amountSol: decision.amountSol,
      status: result.status,
      txSignature: result.txSignature,
      details: result.details,
      createdAt: nowIso()
    });
  }
}

export async function connectWalletSession(walletAddress: string) {
  const session = upsertSession(walletAddress);
  const portfolio = await fetchPortfolioState(walletAddress, env.solanaRpcUrl);
  const strategy = getOrCreateStrategy(walletAddress);
  const policy = getOrCreatePolicy(walletAddress);

  return {
    session,
    portfolio,
    strategy,
    policy,
    approvals: getApprovals(walletAddress, "pending")
  };
}

export function updateStrategyForWallet(input: {
  walletAddress: string;
  instruction?: string;
  objective?: string;
  tags?: string[];
}) {
  return setStrategy(input.walletAddress, {
    instruction: input.instruction,
    objective: input.objective,
    tags: input.tags
  });
}

export function updatePolicyForWallet(input: {
  walletAddress: string;
  riskTolerance?: string;
  maxTransactionSol?: number;
  maxHighRiskTxSizeSol?: number;
  maxDailyLossPct?: number;
  nftApprovalThresholdSol?: number;
  humanConfirmation?: boolean;
  allowedProtocols?: string[];
  blockedProtocols?: string[];
  autopilotEnabled?: boolean;
  autopilotIntervalSec?: number;
}) {
  const policy = setPolicy(input.walletAddress, {
    riskTolerance: input.riskTolerance ? parseRisk(input.riskTolerance) : undefined,
    maxTransactionSol: input.maxTransactionSol,
    maxHighRiskTxSizeSol: input.maxHighRiskTxSizeSol,
    maxDailyLossPct: input.maxDailyLossPct,
    nftApprovalThresholdSol: input.nftApprovalThresholdSol,
    humanConfirmation: input.humanConfirmation,
    allowedProtocols: input.allowedProtocols ? parseProtocols(input.allowedProtocols) : undefined,
    blockedProtocols: input.blockedProtocols ? parseProtocols(input.blockedProtocols) : undefined,
    autopilotEnabled: input.autopilotEnabled,
    autopilotIntervalSec: input.autopilotIntervalSec
  });

  return policy;
}

function buildRiskAlerts(report: Awaited<ReturnType<typeof runAgentCycle>>, maxDailyLossPct: number): string[] {
  const alerts: string[] = [];

  const rejectedHighRisk = report.policyChecks.filter(
    (check) => !check.approved && (check.reason ?? "").toLowerCase().includes("high-risk")
  ).length;

  if (rejectedHighRisk > 0) {
    alerts.push(`${rejectedHighRisk} high-risk decisions were blocked by policy.`);
  }

  const queuedApprovals = (report.pendingApprovals ?? []).length;
  if (queuedApprovals > 0) {
    alerts.push(`${queuedApprovals} decision(s) waiting for human approval.`);
  }

  const failedExecutions = report.execution.filter((x) => x.status === "failed").length;
  if (failedExecutions > 0) {
    alerts.push(`${failedExecutions} execution attempts failed; review protocol adapters.`);
  }

  const severeRisk = report.proposedDecisions.filter((d) => d.riskScore >= 80).length;
  if (severeRisk > 0) {
    alerts.push(`Detected ${severeRisk} severe-risk opportunities; confirmation is recommended.`);
  }

  if (maxDailyLossPct <= 3) {
    alerts.push("Strict daily loss policy configured; agent operates in conservative mode.");
  }

  return alerts;
}

function asActionType(value: string): ActionType {
  const v = value.toLowerCase();
  if (
    v === "swap" ||
    v === "stake" ||
    v === "farm" ||
    v === "claim" ||
    v === "unstake" ||
    v === "rebalance" ||
    v === "exit"
  ) {
    return v;
  }

  throw new Error(`Unsupported actionType: ${value}`);
}

function asProtocolName(value: string): ProtocolName {
  const v = value.toLowerCase();
  if (v === "jupiter" || v === "marinade" || v === "raydium") return v;
  throw new Error(`Unsupported protocol: ${value}`);
}

function mergeOrCreateApprovals(walletAddress: string, proposed: ProposedDecision[], policyReasons: Map<string, string>): PendingApproval[] {
  const existingPending = getApprovals(walletAddress, "pending");
  const byFingerprint = new Map(existingPending.map((item) => [decisionFingerprint(item.decision), item]));

  const created: PendingApproval[] = [];

  for (const decision of proposed) {
    const key = decisionFingerprint(decision);
    if (byFingerprint.has(key)) {
      created.push(byFingerprint.get(key)!);
      continue;
    }

    const reason = policyReasons.get(key) ?? CONFIRMATION_REASON;
    const approval = createPendingApproval(walletAddress, decision, reason);
    created.push(approval);
  }

  return created;
}

export async function runManagedAgentCycle(input: {
  walletAddress: string;
  instruction?: string;
  riskTolerance?: string;
  maxTransactionSol?: number;
  humanConfirmation?: boolean;
  allowedProtocols?: string[];
  blockedProtocols?: string[];
  source?: "manual" | "scheduler" | "cron";
}) {
  const strategy = input.instruction
    ? updateStrategyForWallet({
        walletAddress: input.walletAddress,
        instruction: input.instruction
      })
    : getOrCreateStrategy(input.walletAddress);

  const policy =
    input.riskTolerance ||
    input.maxTransactionSol !== undefined ||
    input.humanConfirmation !== undefined ||
    input.allowedProtocols ||
    input.blockedProtocols
      ? updatePolicyForWallet({
          walletAddress: input.walletAddress,
          riskTolerance: input.riskTolerance,
          maxTransactionSol: input.maxTransactionSol,
          humanConfirmation: input.humanConfirmation,
          allowedProtocols: input.allowedProtocols,
          blockedProtocols: input.blockedProtocols
        })
      : getOrCreatePolicy(input.walletAddress);

  const portfolio = await fetchPortfolioState(input.walletAddress, env.solanaRpcUrl);

  const profile = buildProfile({
    instruction: strategy.instruction,
    riskTolerance: policy.riskTolerance,
    maxTransactionSol: policy.maxTransactionSol,
    allowedProtocols: policy.allowedProtocols,
    blockedProtocols: policy.blockedProtocols,
    humanConfirmation: policy.humanConfirmation
  });

  const report = await runAgentCycle({ profile, portfolio });

  const confirmationPolicyChecks = report.policyChecks.filter(
    (check) => !check.approved && shouldQueueForApproval(check.reason)
  );

  const decisionReasonMap = new Map<string, string>();
  for (const check of confirmationPolicyChecks) {
    decisionReasonMap.set(decisionFingerprint(check.decision), check.reason ?? CONFIRMATION_REASON);
  }

  const decisionsToApprove = confirmationPolicyChecks.map((x) => x.decision);
  const pendingApprovals = mergeOrCreateApprovals(input.walletAddress, decisionsToApprove, decisionReasonMap);
  report.pendingApprovals = pendingApprovals;

  addRunReport(input.walletAddress, report);

  if (policy.autopilotEnabled) {
    setPolicy(input.walletAddress, {
      lastAutopilotRunAt: nowIso(),
      nextAutopilotRunAt: nextRunAt(policy.autopilotIntervalSec)
    });
  }

  const riskAlerts = buildRiskAlerts(report, policy.maxDailyLossPct);

  return {
    report,
    strategy,
    policy: getOrCreatePolicy(input.walletAddress),
    riskAlerts,
    approvals: pendingApprovals,
    history: {
      runs: getRunReports(input.walletAddress).length,
      transactions: getTransactionLogs(input.walletAddress).length
    }
  };
}

export async function getWalletPortfolio(walletAddress: string) {
  return fetchPortfolioState(walletAddress, env.solanaRpcUrl);
}

export async function executeManualTransaction(input: {
  walletAddress: string;
  protocol: string;
  actionType: string;
  amountSol: number;
  reason: string;
  riskScore?: number;
  requiresConfirmation?: boolean;
  inputSymbol?: string;
  outputSymbol?: string;
}) {
  const policy = getOrCreatePolicy(input.walletAddress);
  const strategy = getOrCreateStrategy(input.walletAddress);

  const profile = buildProfile({
    instruction: strategy.instruction,
    riskTolerance: policy.riskTolerance,
    maxTransactionSol: policy.maxTransactionSol,
    allowedProtocols: policy.allowedProtocols,
    blockedProtocols: policy.blockedProtocols,
    humanConfirmation: policy.humanConfirmation
  });

  const decision: ProposedDecision = {
    opportunityId: crypto.randomUUID(),
    protocol: asProtocolName(input.protocol),
    actionType: asActionType(input.actionType),
    inputSymbol: input.inputSymbol,
    outputSymbol: input.outputSymbol,
    amountSol: input.amountSol,
    reason: input.reason,
    riskScore: Math.max(0, Math.min(100, Math.round(input.riskScore ?? 50))),
    requiresConfirmation: Boolean(input.requiresConfirmation)
  };

  const policyCheck = validatePolicy(decision, profile, policy.maxHighRiskTxSizeSol);
  if (!policyCheck.approved) {
    if (shouldQueueForApproval(policyCheck.reason)) {
      const approval = createPendingApproval(
        input.walletAddress,
        decision,
        policyCheck.reason ?? CONFIRMATION_REASON
      );

      return {
        policyCheck,
        approval,
        execution: [
          {
            status: "skipped" as const,
            protocol: decision.protocol,
            actionType: decision.actionType,
            inputSymbol: decision.inputSymbol,
            outputSymbol: decision.outputSymbol,
            details: "Queued for human approval"
          }
        ]
      };
    }

    return {
      policyCheck,
      execution: [
        {
          status: "skipped" as const,
          protocol: decision.protocol,
          actionType: decision.actionType,
          inputSymbol: decision.inputSymbol,
          outputSymbol: decision.outputSymbol,
          details: policyCheck.reason ?? "Blocked by policy"
        }
      ]
    };
  }

  const execution = await executeDecisions({
    dryRun: env.agentDryRun,
    decisions: [decision]
  });

  mapExecutionToTxLogs(input.walletAddress, decision, execution);

  return {
    policyCheck,
    execution
  };
}

export function listPendingApprovals(walletAddress: string) {
  return getApprovals(walletAddress, "pending");
}

export async function decideApproval(input: {
  walletAddress: string;
  approvalId: string;
  decision: "approve" | "reject";
}) {
  const approval = getApproval(input.approvalId);
  if (!approval || approval.walletAddress !== input.walletAddress) {
    throw new Error("Approval not found");
  }

  if (approval.status !== "pending") {
    throw new Error(`Approval is already ${approval.status}`);
  }

  if (input.decision === "reject") {
    const rejected = updateApprovalStatus(input.approvalId, "rejected");
    return {
      approval: rejected,
      execution: []
    };
  }

  const approved = updateApprovalStatus(input.approvalId, "approved");
  if (!approved) {
    throw new Error("Failed to approve decision");
  }

  const execution = await executeDecisions({
    dryRun: env.agentDryRun,
    decisions: [approved.decision]
  });

  mapExecutionToTxLogs(input.walletAddress, approved.decision, execution);
  const finalStatus = execution.some((x) => x.status === "failed") ? "approved" : "executed";
  const finalApproval = updateApprovalStatus(input.approvalId, finalStatus);

  return {
    approval: finalApproval,
    execution
  };
}

async function runScheduledCycle(walletAddress: string) {
  if (schedulerInFlight.has(walletAddress)) {
    return;
  }

  schedulerInFlight.add(walletAddress);
  try {
    await runManagedAgentCycle({
      walletAddress,
      source: "scheduler"
    });
  } finally {
    schedulerInFlight.delete(walletAddress);
  }
}

export function startAutopilot(input: { walletAddress: string; intervalSec?: number }) {
  ensureSchedulerBootstrapped();

  const policy = getOrCreatePolicy(input.walletAddress);
  const intervalSec = Math.max(30, input.intervalSec ?? policy.autopilotIntervalSec);

  if (schedulerTimers.has(input.walletAddress)) {
    clearInterval(schedulerTimers.get(input.walletAddress)!);
    schedulerTimers.delete(input.walletAddress);
  }

  const timer = setInterval(() => {
    void runScheduledCycle(input.walletAddress);
  }, intervalSec * 1000);

  schedulerTimers.set(input.walletAddress, timer);

  const updatedPolicy = setPolicy(input.walletAddress, {
    autopilotEnabled: true,
    autopilotIntervalSec: intervalSec,
    nextAutopilotRunAt: nextRunAt(intervalSec)
  });

  return {
    walletAddress: input.walletAddress,
    running: true,
    intervalSec,
    nextRunAt: updatedPolicy.nextAutopilotRunAt
  };
}

export function stopAutopilot(walletAddress: string) {
  ensureSchedulerBootstrapped();

  if (schedulerTimers.has(walletAddress)) {
    clearInterval(schedulerTimers.get(walletAddress)!);
    schedulerTimers.delete(walletAddress);
  }

  const updatedPolicy = setPolicy(walletAddress, {
    autopilotEnabled: false,
    nextAutopilotRunAt: undefined
  });

  return {
    walletAddress,
    running: false,
    intervalSec: updatedPolicy.autopilotIntervalSec
  };
}

export function getAutopilotStatus(walletAddress?: string) {
  ensureSchedulerBootstrapped();

  if (walletAddress) {
    const policy = getOrCreatePolicy(walletAddress);
    return {
      walletAddress,
      running: schedulerTimers.has(walletAddress),
      intervalSec: policy.autopilotIntervalSec,
      nextRunAt: policy.nextAutopilotRunAt,
      lastRunAt: policy.lastAutopilotRunAt
    };
  }

  return getAutopilotWallets().map(({ walletAddress, policy }) => ({
    walletAddress,
    running: schedulerTimers.has(walletAddress),
    intervalSec: policy.autopilotIntervalSec,
    nextRunAt: policy.nextAutopilotRunAt,
    lastRunAt: policy.lastAutopilotRunAt
  }));
}

export async function runAutopilotCronSweep() {
  ensureSchedulerBootstrapped();

  const wallets = getAutopilotWallets();
  const now = Date.now();

  const due = wallets.filter(({ policy }) => {
    if (!policy.nextAutopilotRunAt) return true;
    return new Date(policy.nextAutopilotRunAt).getTime() <= now;
  });

  const results: Array<{ walletAddress: string; status: string; message?: string }> = [];

  for (const row of due) {
    try {
      await runManagedAgentCycle({
        walletAddress: row.walletAddress,
        source: "cron"
      });
      results.push({ walletAddress: row.walletAddress, status: "ok" });
    } catch (error) {
      results.push({
        walletAddress: row.walletAddress,
        status: "failed",
        message: error instanceof Error ? error.message : "unknown error"
      });
    }
  }

  return {
    checked: wallets.length,
    due: due.length,
    results
  };
}

export function getWalletBackendState(walletAddress: string) {
  const session = getSession(walletAddress);

  return {
    session,
    strategy: getOrCreateStrategy(walletAddress),
    policy: getOrCreatePolicy(walletAddress),
    approvals: getApprovals(walletAddress),
    runs: getRunReports(walletAddress),
    transactions: getTransactionLogs(walletAddress),
    scheduler: getAutopilotStatus(walletAddress)
  };
}
