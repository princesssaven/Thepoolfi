import { executeDecisions } from "@/agent/executor";
import { InMemoryStore, MemoryStore, PineconeStore } from "@/agent/memory/store";
import { proposeDecisions } from "@/agent/planner";
import { validatePolicy } from "@/agent/policy";
import { JupiterAdapter } from "@/agent/protocols/jupiter";
import { MarinadeAdapter } from "@/agent/protocols/marinade";
import { RaydiumAdapter } from "@/agent/protocols/raydium";
import { applyRiskTolerance } from "@/agent/risk";
import { AgentRunReport, PortfolioState, ProtocolName, UserInstructionProfile } from "@/agent/types";
import { env } from "@/lib/env";

const adapters = [new JupiterAdapter(), new MarinadeAdapter(), new RaydiumAdapter()];

let memoryStore: MemoryStore | null = null;

function getMemoryStore(): MemoryStore {
  if (memoryStore) return memoryStore;

  if (env.pineconeApiKey && env.pineconeIndex) {
    memoryStore = new PineconeStore(env.pineconeApiKey, env.pineconeIndex, env.pineconeNamespace);
  } else {
    memoryStore = new InMemoryStore();
  }

  return memoryStore;
}

function asProtocolName(value: string): ProtocolName | null {
  if (value === "jupiter" || value === "marinade" || value === "raydium") return value;
  return null;
}

export async function runAgentCycle(input: {
  profile: UserInstructionProfile;
  portfolio: PortfolioState;
}): Promise<AgentRunReport> {
  const allowedSet = new Set(input.profile.allowedProtocols);
  const opportunitiesByProtocol = await Promise.all(
    adapters
      .filter((adapter) => allowedSet.has(adapter.name))
      .map((adapter) => adapter.fetchOpportunities(input.portfolio))
  );

  const opportunities = opportunitiesByProtocol.flat();

  const { filtered, assessments } = await applyRiskTolerance(opportunities, input.profile.riskTolerance);

  const store = getMemoryStore();
  const past = await store.search(input.profile.instruction, 5);

  const relatedMemories = past.map((row) => row.text);
  const proposedDecisions = await proposeDecisions({
    profile: input.profile,
    opportunities: filtered,
    portfolio: input.portfolio,
    relatedMemories
  });

  const policyChecks = proposedDecisions.map((decision) =>
    validatePolicy(decision, input.profile, env.maxHighRiskTxSizeSol)
  );

  const approvedDecisions = policyChecks.filter((x) => x.approved).map((x) => x.decision);
  const execution = await executeDecisions({
    dryRun: env.agentDryRun,
    decisions: approvedDecisions
  });

  for (const decision of proposedDecisions) {
    await store.store({
      id: crypto.randomUUID(),
      text: JSON.stringify(decision),
      metadata: {
        instruction: input.profile.instruction,
        protocol: decision.protocol,
        actionType: decision.actionType,
        riskScore: decision.riskScore
      },
      timestamp: new Date().toISOString()
    });
  }

  return {
    profile: input.profile,
    portfolio: input.portfolio,
    opportunities,
    riskAssessments: assessments,
    proposedDecisions,
    policyChecks,
    execution,
    timestamp: new Date().toISOString()
  };
}

export function buildProfile(input: {
  instruction: string;
  riskTolerance?: string;
  maxTransactionSol?: number;
  allowedProtocols?: string[];
  blockedProtocols?: string[];
  humanConfirmation?: boolean;
}): UserInstructionProfile {
  const normalizedRisk = (input.riskTolerance ?? env.defaultRiskTolerance).toLowerCase();
  const riskTolerance =
    normalizedRisk === "low" || normalizedRisk === "high" ? normalizedRisk : "medium";

  const allowedProtocols = (input.allowedProtocols ?? env.allowedProtocols)
    .map((x) => asProtocolName(x.toLowerCase()))
    .filter((x): x is ProtocolName => Boolean(x));

  const blockedProtocols = (input.blockedProtocols ?? env.blockedProtocols)
    .map((x) => asProtocolName(x.toLowerCase()))
    .filter((x): x is ProtocolName => Boolean(x));

  return {
    instruction: input.instruction,
    riskTolerance,
    maxTransactionSol: Number(input.maxTransactionSol ?? env.maxTxSizeSol),
    allowedProtocols: allowedProtocols.length ? allowedProtocols : ["jupiter", "marinade", "raydium"],
    blockedProtocols,
    humanConfirmation: Boolean(input.humanConfirmation)
  };
}
