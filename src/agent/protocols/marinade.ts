import { PortfolioState, ProtocolOpportunity } from "@/agent/types";
import { ProtocolAdapter } from "@/agent/protocols/base";

type MarinadeMetrics = {
  msol_price?: number;
  msol_apy?: number;
  apy?: number;
  tvl?: number;
};

async function fetchMarinadeMetrics(): Promise<MarinadeMetrics | null> {
  const urls = [
    "https://api.marinade.finance/metrics_json",
    "https://api.marinade.finance/msol/metrics"
  ];

  for (const url of urls) {
    try {
      const resp = await fetch(url, { next: { revalidate: 120 } });
      if (!resp.ok) continue;
      return (await resp.json()) as MarinadeMetrics;
    } catch {
      // continue fallback sequence
    }
  }

  return null;
}

export class MarinadeAdapter implements ProtocolAdapter {
  readonly name = "marinade" as const;

  async fetchOpportunities(portfolio: PortfolioState): Promise<ProtocolOpportunity[]> {
    const metrics = await fetchMarinadeMetrics();
    const amount = Math.max(0, Math.min(portfolio.solBalance * 0.35, 2.5));

    const apy = Number(metrics?.msol_apy ?? metrics?.apy ?? 7.9);
    const tvl = Number(metrics?.tvl ?? 80_000_000);

    return [
      {
        id: `marinade-stake-sol-${Date.now()}`,
        protocol: "marinade",
        actionType: "stake",
        inputSymbol: "SOL",
        outputSymbol: "MSOL",
        estimatedApy: Number.isFinite(apy) ? Number(apy.toFixed(2)) : 7.9,
        estimatedFeesBps: 18,
        estimatedRiskScore: 22,
        confidence: metrics ? 0.86 : 0.7,
        liquidityUsd: Number.isFinite(tvl) ? tvl : 80_000_000,
        dataSource: metrics ? "marinade-live" : "marinade-fallback",
        minAmountSol: 0.05,
        maxAmountSol: Math.max(0.1, amount),
        note: "Stake SOL to mSOL to earn native staking yield with liquid staking flexibility."
      },
      {
        id: `marinade-unstake-msol-${Date.now()}`,
        protocol: "marinade",
        actionType: "unstake",
        inputSymbol: "MSOL",
        outputSymbol: "SOL",
        estimatedApy: 0,
        estimatedFeesBps: 35,
        estimatedRiskScore: 29,
        confidence: metrics ? 0.78 : 0.62,
        liquidityUsd: Number.isFinite(tvl) ? tvl : 80_000_000,
        dataSource: metrics ? "marinade-live" : "marinade-fallback",
        minAmountSol: 0.03,
        maxAmountSol: 1.5,
        note: "Exit liquid staking position when risk conditions deteriorate."
      }
    ];
  }
}
