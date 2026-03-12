import fs from "fs";
import path from "path";

import { AgentRunReport, PendingApproval, ProtocolName, ProposedDecision, RiskTolerance } from "@/agent/types";
import { env } from "@/lib/env";

export type WalletSession = {
  sessionId: string;
  walletAddress: string;
  connectedAt: string;
  lastSeenAt: string;
  authToken?: string;
};

export type WalletAuthChallenge = {
  id: string;
  walletAddress: string;
  message: string;
  nonce: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
};

export type WalletAuthToken = {
  token: string;
  walletAddress: string;
  createdAt: string;
  expiresAt: string;
};

export type WalletStrategy = {
  walletAddress: string;
  instruction: string;
  objective?: string;
  tags: string[];
  updatedAt: string;
};

export type WalletPolicy = {
  walletAddress: string;
  riskTolerance: RiskTolerance;
  maxTransactionSol: number;
  maxHighRiskTxSizeSol: number;
  maxDailyLossPct: number;
  nftApprovalThresholdSol: number;
  humanConfirmation: boolean;
  allowedProtocols: ProtocolName[];
  blockedProtocols: ProtocolName[];
  autopilotEnabled: boolean;
  autopilotIntervalSec: number;
  lastAutopilotRunAt?: string;
  nextAutopilotRunAt?: string;
  updatedAt: string;
};

export type TransactionLogEntry = {
  id: string;
  walletAddress: string;
  protocol: ProtocolName;
  actionType: string;
  amountSol: number;
  status: "executed" | "simulated" | "skipped" | "failed";
  txSignature?: string;
  details: string;
  createdAt: string;
};

type PersistedState = {
  sessions: Record<string, WalletSession>;
  strategies: Record<string, WalletStrategy>;
  policies: Record<string, WalletPolicy>;
  runReports: Record<string, AgentRunReport[]>;
  txLogs: Record<string, TransactionLogEntry[]>;
  authChallenges: Record<string, WalletAuthChallenge>;
  authTokens: Record<string, WalletAuthToken>;
  approvals: Record<string, PendingApproval>;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const STATE_PATH = path.join(DATA_DIR, "backend-state.json");

const EMPTY_STATE: PersistedState = {
  sessions: {},
  strategies: {},
  policies: {},
  runReports: {},
  txLogs: {},
  authChallenges: {},
  authTokens: {},
  approvals: {}
};

function nowIso() {
  return new Date().toISOString();
}

function plusSeconds(ts: string, seconds: number): string {
  return new Date(new Date(ts).getTime() + seconds * 1000).toISOString();
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadState(): PersistedState {
  try {
    ensureDataDir();
    if (!fs.existsSync(STATE_PATH)) return { ...EMPTY_STATE };

    const raw = fs.readFileSync(STATE_PATH, "utf8");
    if (!raw.trim()) return { ...EMPTY_STATE };

    const parsed = JSON.parse(raw) as Partial<PersistedState>;

    return {
      sessions: parsed.sessions ?? {},
      strategies: parsed.strategies ?? {},
      policies: parsed.policies ?? {},
      runReports: parsed.runReports ?? {},
      txLogs: parsed.txLogs ?? {},
      authChallenges: parsed.authChallenges ?? {},
      authTokens: parsed.authTokens ?? {},
      approvals: parsed.approvals ?? {}
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

let persisted: PersistedState = loadState();

function saveState() {
  ensureDataDir();
  const tmpPath = `${STATE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(persisted, null, 2), "utf8");
  fs.renameSync(tmpPath, STATE_PATH);
}

function normalizeProtocol(value: string): ProtocolName | null {
  const v = value.toLowerCase();
  if (v === "jupiter" || v === "marinade" || v === "raydium") return v;
  return null;
}

function normalizeProtocols(values: string[]): ProtocolName[] {
  const normalized = values.map(normalizeProtocol).filter((x): x is ProtocolName => Boolean(x));
  return [...new Set(normalized)];
}

function normalizeRisk(value: string): RiskTolerance {
  const v = value.toLowerCase();
  if (v === "low" || v === "high") return v;
  return "medium";
}

function pruneExpiredAuth() {
  const now = Date.now();

  for (const [id, challenge] of Object.entries(persisted.authChallenges)) {
    if (new Date(challenge.expiresAt).getTime() < now || challenge.used) {
      delete persisted.authChallenges[id];
    }
  }

  for (const [token, auth] of Object.entries(persisted.authTokens)) {
    if (new Date(auth.expiresAt).getTime() < now) {
      delete persisted.authTokens[token];
      const sess = persisted.sessions[auth.walletAddress];
      if (sess?.authToken === token) {
        persisted.sessions[auth.walletAddress] = {
          ...sess,
          authToken: undefined,
          lastSeenAt: nowIso()
        };
      }
    }
  }
}

export function defaultStrategy(walletAddress: string): WalletStrategy {
  return {
    walletAddress,
    instruction: "Grow my SOL with moderate risk and avoid unsafe protocols.",
    objective: "Yield optimization with downside protection",
    tags: ["yield", "risk-managed"],
    updatedAt: nowIso()
  };
}

export function defaultPolicy(walletAddress: string): WalletPolicy {
  return {
    walletAddress,
    riskTolerance: normalizeRisk(env.defaultRiskTolerance),
    maxTransactionSol: env.maxTxSizeSol,
    maxHighRiskTxSizeSol: env.maxHighRiskTxSizeSol,
    maxDailyLossPct: Number(process.env.MAX_DAILY_LOSS_PCT ?? "8"),
    nftApprovalThresholdSol: Number(process.env.NFT_CONFIRMATION_THRESHOLD_SOL ?? "3"),
    humanConfirmation: true,
    allowedProtocols: normalizeProtocols(env.allowedProtocols),
    blockedProtocols: normalizeProtocols(env.blockedProtocols),
    autopilotEnabled: false,
    autopilotIntervalSec: Math.max(30, env.schedulerDefaultIntervalSec),
    updatedAt: nowIso()
  };
}

export function upsertSession(walletAddress: string): WalletSession {
  pruneExpiredAuth();

  const current = persisted.sessions[walletAddress];
  const timestamp = nowIso();

  if (current) {
    const updated: WalletSession = {
      ...current,
      lastSeenAt: timestamp
    };
    persisted.sessions[walletAddress] = updated;
    saveState();
    return updated;
  }

  const created: WalletSession = {
    sessionId: crypto.randomUUID(),
    walletAddress,
    connectedAt: timestamp,
    lastSeenAt: timestamp
  };
  persisted.sessions[walletAddress] = created;
  saveState();
  return created;
}

export function attachTokenToSession(walletAddress: string, token: string) {
  const sess = upsertSession(walletAddress);
  persisted.sessions[walletAddress] = {
    ...sess,
    authToken: token,
    lastSeenAt: nowIso()
  };
  saveState();
}

export function getSession(walletAddress: string): WalletSession | null {
  return persisted.sessions[walletAddress] ?? null;
}

export function createAuthChallenge(walletAddress: string): WalletAuthChallenge {
  pruneExpiredAuth();

  const createdAt = nowIso();
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const challenge: WalletAuthChallenge = {
    id: crypto.randomUUID(),
    walletAddress,
    nonce,
    createdAt,
    expiresAt: plusSeconds(createdAt, env.authChallengeTtlSec),
    used: false,
    message: `AI Autonomous Wallet login\nwallet=${walletAddress}\nnonce=${nonce}\nts=${createdAt}`
  };

  persisted.authChallenges[challenge.id] = challenge;
  saveState();
  return challenge;
}

export function consumeAuthChallenge(challengeId: string, walletAddress: string): WalletAuthChallenge | null {
  pruneExpiredAuth();

  const challenge = persisted.authChallenges[challengeId];
  if (!challenge) return null;
  if (challenge.walletAddress !== walletAddress) return null;
  if (challenge.used) return null;
  if (new Date(challenge.expiresAt).getTime() < Date.now()) return null;

  persisted.authChallenges[challengeId] = {
    ...challenge,
    used: true
  };
  saveState();

  return challenge;
}

export function issueAuthToken(walletAddress: string): WalletAuthToken {
  pruneExpiredAuth();

  const createdAt = nowIso();
  const token = `${crypto.randomUUID().replaceAll("-", "")}.${crypto.randomUUID().replaceAll("-", "")}`;
  const auth: WalletAuthToken = {
    token,
    walletAddress,
    createdAt,
    expiresAt: plusSeconds(createdAt, env.authTokenTtlSec)
  };

  persisted.authTokens[token] = auth;
  attachTokenToSession(walletAddress, token);
  saveState();
  return auth;
}

export function getAuthToken(token: string): WalletAuthToken | null {
  pruneExpiredAuth();

  const found = persisted.authTokens[token] ?? null;
  if (!found) return null;
  if (new Date(found.expiresAt).getTime() < Date.now()) {
    delete persisted.authTokens[token];
    saveState();
    return null;
  }

  return found;
}

export function revokeAuthToken(token: string): void {
  const auth = persisted.authTokens[token];
  if (!auth) return;

  delete persisted.authTokens[token];
  const sess = persisted.sessions[auth.walletAddress];
  if (sess?.authToken === token) {
    persisted.sessions[auth.walletAddress] = {
      ...sess,
      authToken: undefined,
      lastSeenAt: nowIso()
    };
  }

  saveState();
}

export function getOrCreateStrategy(walletAddress: string): WalletStrategy {
  const existing = persisted.strategies[walletAddress];
  if (existing) return existing;

  const strategy = defaultStrategy(walletAddress);
  persisted.strategies[walletAddress] = strategy;
  saveState();
  return strategy;
}

export function setStrategy(
  walletAddress: string,
  patch: Partial<Pick<WalletStrategy, "instruction" | "objective" | "tags">>
): WalletStrategy {
  const current = getOrCreateStrategy(walletAddress);
  const updated: WalletStrategy = {
    ...current,
    instruction: patch.instruction ?? current.instruction,
    objective: patch.objective ?? current.objective,
    tags: patch.tags ?? current.tags,
    updatedAt: nowIso()
  };

  persisted.strategies[walletAddress] = updated;
  saveState();
  return updated;
}

export function getOrCreatePolicy(walletAddress: string): WalletPolicy {
  const existing = persisted.policies[walletAddress];
  if (existing) return existing;

  const policy = defaultPolicy(walletAddress);
  persisted.policies[walletAddress] = policy;
  saveState();
  return policy;
}

export function setPolicy(
  walletAddress: string,
  patch: Partial<
    Pick<
      WalletPolicy,
      | "riskTolerance"
      | "maxTransactionSol"
      | "maxHighRiskTxSizeSol"
      | "maxDailyLossPct"
      | "nftApprovalThresholdSol"
      | "humanConfirmation"
      | "allowedProtocols"
      | "blockedProtocols"
      | "autopilotEnabled"
      | "autopilotIntervalSec"
      | "lastAutopilotRunAt"
      | "nextAutopilotRunAt"
    >
  >
): WalletPolicy {
  const current = getOrCreatePolicy(walletAddress);
  const hasLast = Object.prototype.hasOwnProperty.call(patch, "lastAutopilotRunAt");
  const hasNext = Object.prototype.hasOwnProperty.call(patch, "nextAutopilotRunAt");

  const updated: WalletPolicy = {
    ...current,
    riskTolerance: patch.riskTolerance ?? current.riskTolerance,
    maxTransactionSol: patch.maxTransactionSol ?? current.maxTransactionSol,
    maxHighRiskTxSizeSol: patch.maxHighRiskTxSizeSol ?? current.maxHighRiskTxSizeSol,
    maxDailyLossPct: patch.maxDailyLossPct ?? current.maxDailyLossPct,
    nftApprovalThresholdSol: patch.nftApprovalThresholdSol ?? current.nftApprovalThresholdSol,
    humanConfirmation: patch.humanConfirmation ?? current.humanConfirmation,
    allowedProtocols: patch.allowedProtocols ?? current.allowedProtocols,
    blockedProtocols: patch.blockedProtocols ?? current.blockedProtocols,
    autopilotEnabled: patch.autopilotEnabled ?? current.autopilotEnabled,
    autopilotIntervalSec: Math.max(30, patch.autopilotIntervalSec ?? current.autopilotIntervalSec),
    lastAutopilotRunAt: hasLast ? patch.lastAutopilotRunAt : current.lastAutopilotRunAt,
    nextAutopilotRunAt: hasNext ? patch.nextAutopilotRunAt : current.nextAutopilotRunAt,
    updatedAt: nowIso()
  };

  persisted.policies[walletAddress] = updated;
  saveState();
  return updated;
}

export function addRunReport(walletAddress: string, report: AgentRunReport): void {
  const current = persisted.runReports[walletAddress] ?? [];
  current.unshift(report);
  persisted.runReports[walletAddress] = current.slice(0, 40);
  saveState();
}

export function getRunReports(walletAddress: string): AgentRunReport[] {
  return persisted.runReports[walletAddress] ?? [];
}

export function addTransactionLog(entry: TransactionLogEntry): void {
  const current = persisted.txLogs[entry.walletAddress] ?? [];
  current.unshift(entry);
  persisted.txLogs[entry.walletAddress] = current.slice(0, 250);
  saveState();
}

export function getTransactionLogs(walletAddress: string): TransactionLogEntry[] {
  return persisted.txLogs[walletAddress] ?? [];
}

export function createPendingApproval(
  walletAddress: string,
  decision: ProposedDecision,
  reason: string
): PendingApproval {
  const now = nowIso();

  const approval: PendingApproval = {
    id: crypto.randomUUID(),
    walletAddress,
    decision,
    reason,
    status: "pending",
    createdAt: now,
    updatedAt: now
  };

  persisted.approvals[approval.id] = approval;
  saveState();
  return approval;
}

export function updateApprovalStatus(
  approvalId: string,
  status: PendingApproval["status"]
): PendingApproval | null {
  const current = persisted.approvals[approvalId];
  if (!current) return null;

  const updated: PendingApproval = {
    ...current,
    status,
    updatedAt: nowIso()
  };

  persisted.approvals[approvalId] = updated;
  saveState();
  return updated;
}

export function getApproval(approvalId: string): PendingApproval | null {
  return persisted.approvals[approvalId] ?? null;
}

export function getApprovals(walletAddress: string, status?: PendingApproval["status"]): PendingApproval[] {
  const all = Object.values(persisted.approvals)
    .filter((approval) => approval.walletAddress === walletAddress)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (!status) return all;
  return all.filter((approval) => approval.status === status);
}

export function getAutopilotWallets(): Array<{ walletAddress: string; policy: WalletPolicy }> {
  return Object.entries(persisted.policies)
    .filter(([, policy]) => policy.autopilotEnabled)
    .map(([walletAddress, policy]) => ({ walletAddress, policy }));
}

export function parseProtocols(values: string[]): ProtocolName[] {
  return normalizeProtocols(values);
}

export function parseRisk(value: string): RiskTolerance {
  return normalizeRisk(value);
}

export function exportStateSnapshot() {
  pruneExpiredAuth();
  return {
    sessions: persisted.sessions,
    strategies: persisted.strategies,
    policies: persisted.policies,
    approvals: persisted.approvals
  };
}
