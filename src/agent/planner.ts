import { env } from "@/lib/env";
import {
  PortfolioState,
  ProposedDecision,
  ProtocolOpportunity,
  RiskTolerance,
  UserInstructionProfile
} from "@/agent/types";

type PlannerInput = {
  profile: UserInstructionProfile;
  portfolio: PortfolioState;
  opportunities: ProtocolOpportunity[];
  relatedMemories: string[];
};

type RawDecision = {
  opportunityId: string;
  amountSol: number;
  reason: string;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function scoreOpportunity(opportunity: ProtocolOpportunity, tolerance: RiskTolerance): number {
  const riskPenalty = tolerance === "low" ? 0.45 : tolerance === "medium" ? 0.3 : 0.18;
  return opportunity.estimatedApy * 1.3 + opportunity.confidence * 20 - opportunity.estimatedRiskScore * riskPenalty;
}

function fallbackPlanner(input: PlannerInput): ProposedDecision[] {
  const ranked = [...input.opportunities].sort(
    (a, b) => scoreOpportunity(b, input.profile.riskTolerance) - scoreOpportunity(a, input.profile.riskTolerance)
  );

  const sizeFactor = input.profile.riskTolerance === "low" ? 0.25 : input.profile.riskTolerance === "medium" ? 0.4 : 0.55;
  const maxPerDecision = input.profile.maxTransactionSol * sizeFactor;

  return ranked.slice(0, 2).map((opp) => {
    const amount = clamp(maxPerDecision, opp.minAmountSol, opp.maxAmountSol);
    const requiresConfirmation = opp.estimatedRiskScore >= 70 || (opp.actionType === "farm" && amount > 0.8);

    return {
      opportunityId: opp.id,
      protocol: opp.protocol,
      actionType: opp.actionType,
      inputSymbol: opp.inputSymbol,
      outputSymbol: opp.outputSymbol,
      amountSol: Number(amount.toFixed(4)),
      reason: `Fallback heuristic selected ${opp.protocol} (${opp.actionType}) due to best risk-adjusted yield score.`,
      riskScore: opp.estimatedRiskScore,
      requiresConfirmation
    };
  });
}

function getProviderEndpoint(provider: string): string {
  if (provider === "groq") return "https://api.groq.com/openai/v1/chat/completions";
  if (provider === "together") return "https://api.together.xyz/v1/chat/completions";
  return "https://api.openai.com/v1/chat/completions";
}

async function callLlmPlanner(input: PlannerInput): Promise<RawDecision[]> {
  const apiKey = env.llmApiKey || env.openAiApiKey;
  if (!apiKey) return [];

  const endpoint = getProviderEndpoint(env.llmProvider);
  const system =
    "You are an autonomous Solana portfolio agent. Return strict JSON: {\"decisions\":[{\"opportunityId\":string,\"amountSol\":number,\"reason\":string}]}. Keep at most 3 decisions.";

  const user = JSON.stringify(
    {
      instruction: input.profile.instruction,
      riskTolerance: input.profile.riskTolerance,
      maxTransactionSol: input.profile.maxTransactionSol,
      opportunities: input.opportunities,
      portfolio: input.portfolio,
      relatedMemories: input.relatedMemories
    },
    null,
    2
  );

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: env.llmModel,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });

  if (!response.ok) return [];
  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return [];

  try {
    const parsed = JSON.parse(content);
    const decisions = Array.isArray(parsed?.decisions)
      ? (parsed.decisions as Array<Record<string, unknown>>)
      : [];
    return decisions
      .slice(0, 3)
      .filter(
        (
          x
        ): x is {
          opportunityId: string;
          amountSol?: number;
          reason?: string;
        } => typeof x?.opportunityId === "string"
      )
      .map((x) => ({
        opportunityId: x.opportunityId,
        amountSol: Number(x.amountSol ?? 0),
        reason: String(x.reason ?? "LLM-selected opportunity")
      }));
  } catch {
    return [];
  }
}

export async function proposeDecisions(input: PlannerInput): Promise<ProposedDecision[]> {
  const fallback = fallbackPlanner(input);

  const raw = await callLlmPlanner(input);
  if (!raw.length) return fallback;

  const byId = new Map(input.opportunities.map((opp) => [opp.id, opp]));
  const decisions: ProposedDecision[] = [];

  for (const row of raw) {
    const opportunity = byId.get(row.opportunityId);
    if (!opportunity) continue;

    const amount = clamp(
      Number.isFinite(row.amountSol) ? row.amountSol : opportunity.minAmountSol,
      opportunity.minAmountSol,
      Math.min(opportunity.maxAmountSol, input.profile.maxTransactionSol)
    );

    const requiresConfirmation =
      opportunity.estimatedRiskScore >= 70 || (opportunity.actionType === "farm" && amount > 0.8);

    decisions.push({
      opportunityId: opportunity.id,
      protocol: opportunity.protocol,
      actionType: opportunity.actionType,
      inputSymbol: opportunity.inputSymbol,
      outputSymbol: opportunity.outputSymbol,
      amountSol: Number(amount.toFixed(4)),
      reason: row.reason,
      riskScore: opportunity.estimatedRiskScore,
      requiresConfirmation
    });
  }

  return decisions.length ? decisions : fallback;
}
