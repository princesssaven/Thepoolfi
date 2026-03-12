import { getMarketSignals } from "@/agent/market/signals";
import { ProtocolOpportunity, RiskAssessment, RiskTolerance } from "@/agent/types";

const PROTOCOL_BASE_RISK: Record<string, number> = {
  jupiter: 26,
  marinade: 23,
  raydium: 44
};

const RISK_LIMITS: Record<RiskTolerance, number> = {
  low: 38,
  medium: 62,
  high: 82
};

type AssessmentContext = {
  inputVolatility: number;
  outputVolatility: number;
  protocolPenalty: number;
  protocolWarnings: string[];
};

function getVolatilityPenalty(inputVolatility: number, outputVolatility: number): number {
  const maxVol = Math.max(inputVolatility, outputVolatility);
  return Math.round(maxVol * 0.22);
}

export function assessOpportunityRisk(
  opportunity: ProtocolOpportunity,
  context: AssessmentContext
): RiskAssessment {
  const protocolBase = PROTOCOL_BASE_RISK[opportunity.protocol] ?? 50;

  const structuralRisk =
    protocolBase * 0.35 +
    opportunity.estimatedRiskScore * 0.35 +
    Math.max(0, 100 - opportunity.confidence * 100) * 0.15;

  const volatilityPenalty = getVolatilityPenalty(context.inputVolatility, context.outputVolatility);

  const liquidityPenalty =
    opportunity.liquidityUsd && opportunity.liquidityUsd > 0
      ? opportunity.liquidityUsd < 1_000_000
        ? 10
        : opportunity.liquidityUsd < 5_000_000
          ? 5
          : 0
      : 6;

  const apyPenalty = opportunity.estimatedApy > 40 ? 10 : opportunity.estimatedApy > 25 ? 5 : 0;

  const score = Math.min(
    100,
    Math.round(structuralRisk + volatilityPenalty + liquidityPenalty + apyPenalty + context.protocolPenalty)
  );

  const warnings: string[] = [];
  if (opportunity.estimatedApy > 40) warnings.push("Very high APY can indicate unstable incentives.");
  if (opportunity.protocol === "raydium" && opportunity.actionType === "farm") {
    warnings.push("Liquidity farming may incur impermanent loss.");
  }
  if (opportunity.confidence < 0.55) warnings.push("Low confidence in market signal quality.");
  if (context.inputVolatility >= 22 || context.outputVolatility >= 22) {
    warnings.push("Elevated 24h market volatility detected.");
  }
  if (liquidityPenalty >= 6) {
    warnings.push("Limited liquidity signal detected for this route/pool.");
  }
  warnings.push(...context.protocolWarnings);

  return {
    opportunityId: opportunity.id,
    protocol: opportunity.protocol,
    riskScore: score,
    warnings,
    approvedByRisk: true
  };
}

export async function applyRiskTolerance(
  opportunities: ProtocolOpportunity[],
  tolerance: RiskTolerance
): Promise<{ filtered: ProtocolOpportunity[]; assessments: RiskAssessment[] }> {
  if (!opportunities.length) {
    return {
      filtered: [],
      assessments: []
    };
  }

  const limit = RISK_LIMITS[tolerance];

  const symbols = opportunities
    .flatMap((opportunity) => [opportunity.inputSymbol, opportunity.outputSymbol ?? ""])
    .filter(Boolean);

  const market = await getMarketSignals(symbols);

  const assessments = opportunities.map((opportunity) => {
    const input = market.symbols[opportunity.inputSymbol.toUpperCase()];
    const output = opportunity.outputSymbol
      ? market.symbols[opportunity.outputSymbol.toUpperCase()]
      : undefined;

    const protocolSignal = market.protocols[opportunity.protocol];

    return assessOpportunityRisk(opportunity, {
      inputVolatility: input?.volatilityScore ?? 0,
      outputVolatility: output?.volatilityScore ?? 0,
      protocolPenalty: protocolSignal?.riskPenalty ?? 0,
      protocolWarnings: protocolSignal?.warnings ?? []
    });
  });

  const assessmentByOpportunity = new Map(
    opportunities.map((opportunity, idx) => [opportunity.id, assessments[idx]])
  );

  const filtered = opportunities.filter((opportunity) => {
    const assessment = assessmentByOpportunity.get(opportunity.id);
    if (!assessment) return false;
    return assessment.riskScore <= limit;
  });

  const normalized = assessments.map((assessment) => ({
    ...assessment,
    approvedByRisk: assessment.riskScore <= limit
  }));

  return {
    filtered,
    assessments: normalized
  };
}
