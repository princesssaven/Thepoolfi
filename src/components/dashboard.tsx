"use client";

/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

type Portfolio = {
  walletAddress: string;
  totalUsdValue: number;
  solBalance: number;
  assets: { symbol: string; amount: number; usdValue: number }[];
  fetchedAt: string;
};

type Approval = {
  id: string;
  reason: string;
  status: string;
  decision: {
    protocol: string;
    actionType: string;
    inputSymbol?: string;
    outputSymbol?: string;
    amountSol: number;
    riskScore: number;
  };
};

type AgentReport = {
  profile: {
    instruction: string;
    riskTolerance: "low" | "medium" | "high";
    maxTransactionSol: number;
    humanConfirmation: boolean;
  };
  opportunities: {
    id: string;
    protocol: string;
    actionType: string;
    estimatedApy: number;
    estimatedRiskScore: number;
  }[];
  proposedDecisions: {
    protocol: string;
    actionType: string;
    inputSymbol?: string;
    outputSymbol?: string;
    amountSol: number;
    reason: string;
    riskScore: number;
  }[];
  policyChecks: { approved: boolean; reason?: string }[];
  execution: {
    status: string;
    protocol: string;
    actionType: string;
    details: string;
    txSignature?: string;
  }[];
  timestamp: string;
};

type BackendContext = {
  runs: unknown[];
  transactions: unknown[];
  policy?: {
    autopilotEnabled?: boolean;
    autopilotIntervalSec?: number;
  };
  scheduler?: {
    running: boolean;
    intervalSec: number;
    nextRunAt?: string;
  };
};

const defaultInstruction = "Grow my SOL with moderate risk while avoiding risky protocols.";

export function Dashboard() {
  const { publicKey, connected, signMessage } = useWallet();

  const [instruction, setInstruction] = useState(defaultInstruction);
  const [riskTolerance, setRiskTolerance] = useState<"low" | "medium" | "high">("medium");
  const [maxTxSize, setMaxTxSize] = useState(1.5);
  const [humanConfirmation, setHumanConfirmation] = useState(true);
  const [autopilotIntervalSec, setAutopilotIntervalSec] = useState(300);

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [context, setContext] = useState<BackendContext | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [riskAlerts, setRiskAlerts] = useState<string[]>([]);

  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<AgentReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const walletAddress = publicKey?.toBase58() ?? "";

  function getTokenOrThrow(override?: string): string {
    const token = override ?? authToken;
    if (!token) throw new Error("Wallet auth token missing. Please reconnect and sign again.");
    return token;
  }

  async function authedFetch(
    url: string,
    init: RequestInit = {},
    tokenOverride?: string
  ): Promise<Response> {
    const token = getTokenOrThrow(tokenOverride);

    return fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`
      }
    });
  }

  async function authenticateWallet(): Promise<string> {
    if (!walletAddress) throw new Error("Wallet address unavailable");
    if (!signMessage) throw new Error("This wallet does not support signMessage");

    setAuthenticating(true);
    try {
      const challengeResp = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress })
      });
      const challengeJson = await challengeResp.json();
      if (!challengeResp.ok) {
        throw new Error(challengeJson?.error ?? "Failed to request auth challenge");
      }

      const message = String(challengeJson.message);
      const signature = await signMessage(new TextEncoder().encode(message));
      const signatureBase64 = btoa(String.fromCharCode(...signature));

      const verifyResp = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          challengeId: challengeJson.challengeId,
          signatureBase64
        })
      });
      const verifyJson = await verifyResp.json();
      if (!verifyResp.ok) {
        throw new Error(verifyJson?.error ?? "Wallet auth verification failed");
      }

      const token = String(verifyJson.token);
      setAuthToken(token);
      return token;
    } finally {
      setAuthenticating(false);
    }
  }

  async function connectWallet(tokenOverride?: string) {
    if (!walletAddress) return;

    const resp = await authedFetch(
      "/api/connect-wallet",
      {
        method: "POST",
        body: JSON.stringify({ walletAddress })
      },
      tokenOverride
    );

    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.error ?? "Failed to connect wallet session");

    setSessionId(json?.session?.sessionId ?? null);
    setPortfolio(json?.portfolio ?? null);
    setApprovals(Array.isArray(json?.approvals) ? json.approvals : []);
  }

  async function loadPortfolio(tokenOverride?: string) {
    if (!walletAddress) return;

    setPortfolioLoading(true);
    setError(null);

    try {
      const resp = await authedFetch(`/api/portfolio?wallet=${walletAddress}`, {}, tokenOverride);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error ?? "Failed to fetch portfolio");
      setPortfolio(json.portfolio);
      setContext(json.context ?? null);
      setApprovals(Array.isArray(json?.context?.approvals) ? json.context.approvals : []);
      if (json?.context?.policy?.autopilotIntervalSec) {
        setAutopilotIntervalSec(Number(json.context.policy.autopilotIntervalSec));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch portfolio");
      setPortfolio(null);
      setContext(null);
    } finally {
      setPortfolioLoading(false);
    }
  }

  async function loadApprovals(tokenOverride?: string) {
    if (!walletAddress) return;

    const resp = await authedFetch(`/api/approvals?wallet=${walletAddress}`, {}, tokenOverride);
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.error ?? "Failed to load approvals");
    setApprovals(Array.isArray(json.approvals) ? json.approvals : []);
  }

  async function loadSchedulerStatus(tokenOverride?: string) {
    if (!walletAddress) return;

    const resp = await authedFetch(
      `/api/agent/scheduler/status?wallet=${walletAddress}`,
      {},
      tokenOverride
    );
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.error ?? "Failed to load scheduler status");

    setContext((prev) => ({
      ...(prev ?? { runs: [], transactions: [] }),
      scheduler: json.status
    }));

    if (json?.status?.intervalSec) {
      setAutopilotIntervalSec(Number(json.status.intervalSec));
    }
  }

  async function syncStrategyAndPolicy(tokenOverride?: string) {
    if (!walletAddress) return;

    const strategyResp = await authedFetch(
      "/api/set-strategy",
      {
        method: "POST",
        body: JSON.stringify({
          walletAddress,
          instruction,
          objective: "Yield optimization under policy constraints",
          tags: ["solana", "autonomous", "risk-aware"]
        })
      },
      tokenOverride
    );
    const strategyJson = await strategyResp.json();
    if (!strategyResp.ok) {
      throw new Error(strategyJson?.error ?? "Failed to set strategy");
    }

    const policyResp = await authedFetch(
      "/api/set-policy",
      {
        method: "POST",
        body: JSON.stringify({
          walletAddress,
          riskTolerance,
          maxTransactionSol: maxTxSize,
          humanConfirmation,
          allowedProtocols: ["jupiter", "marinade", "raydium"],
          blockedProtocols: []
        })
      },
      tokenOverride
    );
    const policyJson = await policyResp.json();
    if (!policyResp.ok) {
      throw new Error(policyJson?.error ?? "Failed to set policy");
    }
  }

  async function runAgent() {
    if (!walletAddress) return;
    setRunning(true);
    setError(null);

    try {
      await syncStrategyAndPolicy();

      const resp = await authedFetch("/api/agent/run", {
        method: "POST",
        body: JSON.stringify({
          walletAddress
        })
      });

      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error ?? "Agent execution failed");

      setReport(json.report);
      setRiskAlerts(Array.isArray(json.riskAlerts) ? json.riskAlerts : []);

      await Promise.all([loadPortfolio(), loadApprovals(), loadSchedulerStatus()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Agent execution failed");
    } finally {
      setRunning(false);
    }
  }

  async function decideApproval(approvalId: string, decision: "approve" | "reject") {
    if (!walletAddress) return;

    try {
      const resp = await authedFetch("/api/approvals/decision", {
        method: "POST",
        body: JSON.stringify({
          walletAddress,
          approvalId,
          decision
        })
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error ?? "Failed to process approval decision");

      await Promise.all([loadApprovals(), loadPortfolio()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process approval");
    }
  }

  async function startAutopilot() {
    if (!walletAddress) return;

    try {
      const resp = await authedFetch("/api/agent/scheduler/start", {
        method: "POST",
        body: JSON.stringify({
          walletAddress,
          intervalSec: autopilotIntervalSec
        })
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error ?? "Failed to start autopilot");

      await loadSchedulerStatus();
      await loadPortfolio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start autopilot");
    }
  }

  async function stopAutopilot() {
    if (!walletAddress) return;

    try {
      const resp = await authedFetch("/api/agent/scheduler/stop", {
        method: "POST",
        body: JSON.stringify({ walletAddress })
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error ?? "Failed to stop autopilot");

      await loadSchedulerStatus();
      await loadPortfolio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to stop autopilot");
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!connected || !walletAddress) {
      setAuthToken(null);
      setSessionId(null);
      setPortfolio(null);
      setReport(null);
      setContext(null);
      setRiskAlerts([]);
      setApprovals([]);
      return;
    }

    void (async () => {
      try {
        const token = await authenticateWallet();
        await connectWallet(token);
        await Promise.all([loadPortfolio(token), loadApprovals(token), loadSchedulerStatus(token)]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Wallet authentication failed");
        setAuthToken(null);
      }
    })();
  }, [connected, walletAddress]);

  const pnlHint = useMemo(() => {
    if (!portfolio) return "--";
    const projected = report?.execution?.length ? "active" : "idle";
    const runs = context?.runs?.length ?? 0;
    return `${projected.toUpperCase()} | ${portfolio.assets.length} assets | ${runs} stored runs`;
  }, [portfolio, report, context]);

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="kicker">AI AUTONOMOUS WALLET</p>
          <h1>Solana Agentic Portfolio Operator</h1>
          <p className="subcopy">
            Connect wallet, sign auth challenge, and run autonomous cycles with approvals and
            scheduler controls.
          </p>
          <div className="meta">
            <span>{pnlHint}</span>
            <span>{sessionId ? `Session ${sessionId.slice(0, 8)}...` : "No backend session"}</span>
            <span>{authToken ? "Authenticated" : authenticating ? "Authenticating..." : "Not authenticated"}</span>
          </div>
        </div>
        <WalletMultiButton />
      </section>

      <section className="grid">
        <article className="card controls">
          <h2>Agent Controls</h2>
          <label>
            Instruction
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={4}
              placeholder="Maximize my yield while avoiding risky protocols"
            />
          </label>

          <label>
            Risk Tolerance
            <select
              value={riskTolerance}
              onChange={(e) => setRiskTolerance(e.target.value as "low" | "medium" | "high")}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>

          <label>
            Max Transaction (SOL)
            <input
              type="number"
              value={maxTxSize}
              min={0.1}
              step={0.1}
              onChange={(e) => setMaxTxSize(Number(e.target.value))}
            />
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={humanConfirmation}
              onChange={(e) => setHumanConfirmation(e.target.checked)}
            />
            Require confirmation for high-risk actions
          </label>

          <div className="autopilot-box">
            <label>
              Autopilot Interval (sec)
              <input
                type="number"
                min={30}
                step={30}
                value={autopilotIntervalSec}
                onChange={(e) => setAutopilotIntervalSec(Number(e.target.value))}
              />
            </label>
            <div className="autopilot-actions">
              <button disabled={!walletAddress || !authToken} onClick={startAutopilot}>
                Start Autopilot
              </button>
              <button disabled={!walletAddress || !authToken} onClick={stopAutopilot}>
                Stop Autopilot
              </button>
            </div>
            <p className="meta-line">
              {context?.scheduler?.running ? "Scheduler running" : "Scheduler stopped"}
              {context?.scheduler?.nextRunAt ? ` | Next: ${new Date(context.scheduler.nextRunAt).toLocaleTimeString()}` : ""}
            </p>
          </div>

          <button disabled={!walletAddress || running || !authToken} onClick={runAgent}>
            {running ? "Running Agent..." : "Run Autonomous Cycle"}
          </button>

          {error ? <p className="error">{error}</p> : null}
        </article>

        <article className="card">
          <h2>Portfolio</h2>
          {portfolioLoading ? <p>Loading portfolio...</p> : null}
          {!walletAddress ? <p>Connect a wallet to view on-chain balances.</p> : null}
          {portfolio ? (
            <>
              <p className="metric">${portfolio.totalUsdValue.toLocaleString()}</p>
              <p className="meta-line">SOL Balance: {portfolio.solBalance}</p>
              <ul className="asset-list">
                {portfolio.assets.map((asset) => (
                  <li key={`${asset.symbol}-${asset.amount}`}>
                    <span>{asset.symbol}</span>
                    <span>{asset.amount}</span>
                    <span>${asset.usdValue}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </article>
      </section>

      <section className="card report">
        <h2>Pending Approvals</h2>
        {!approvals.length ? <p>No pending approvals.</p> : null}
        {approvals.length ? (
          <ul className="approval-list">
            {approvals.map((approval) => (
              <li key={approval.id}>
                <div>
                  <strong>
                    {approval.decision.protocol} {approval.decision.actionType}
                  </strong>
                  <p>
                    {approval.decision.amountSol} SOL
                    {approval.decision.inputSymbol ? ` | ${approval.decision.inputSymbol}` : ""}
                    {approval.decision.outputSymbol ? ` -> ${approval.decision.outputSymbol}` : ""}
                    {` | risk ${approval.decision.riskScore}`}
                  </p>
                  <p>{approval.reason}</p>
                </div>
                <div className="approval-actions">
                  <button onClick={() => decideApproval(approval.id, "approve")}>Approve</button>
                  <button onClick={() => decideApproval(approval.id, "reject")}>Reject</button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="card report">
        <h2>Latest Agent Report</h2>
        {riskAlerts.length ? (
          <ul className="alert-list">
            {riskAlerts.map((alert) => (
              <li key={alert}>{alert}</li>
            ))}
          </ul>
        ) : null}

        {!report ? (
          <p>No cycle run yet.</p>
        ) : (
          <>
            <p className="meta-line">{new Date(report.timestamp).toLocaleString()}</p>
            <div className="report-grid">
              <div>
                <h3>Opportunities</h3>
                <ul>
                  {report.opportunities.slice(0, 5).map((op) => (
                    <li key={op.id}>
                      {op.protocol} {op.actionType} | APY {op.estimatedApy}% | risk {op.estimatedRiskScore}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3>Decisions</h3>
                <ul>
                  {report.proposedDecisions.map((d, i) => (
                    <li key={`${d.protocol}-${i}`}>
                      {d.protocol} {d.actionType} {d.amountSol} SOL | risk {d.riskScore}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3>Execution</h3>
                <ul>
                  {report.execution.map((item, i) => (
                    <li key={`${item.protocol}-${i}`}>
                      {item.status} | {item.protocol} {item.actionType}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
