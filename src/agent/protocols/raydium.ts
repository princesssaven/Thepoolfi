import { PortfolioState, ProtocolOpportunity } from "@/agent/types";
import { ProtocolAdapter } from "@/agent/protocols/base";

type RaydiumFarm = {
  apr?: number;
  apr24h?: number;
  tvl?: number;
  mintA?: { symbol?: string };
  mintB?: { symbol?: string };
};

async function fetchRaydiumFarmSignal(): Promise<{ apy: number; tvl: number } | null> {
  const urls = [
    "https://api-v3.raydium.io/main/farms",
    "https://api-v3.raydium.io/main/pairs"
  ];

  for (const url of urls) {
    try {
      const resp = await fetch(url, { next: { revalidate: 120 } });
      if (!resp.ok) continue;
      const json = await resp.json();

      const list = Array.isArray(json?.data) ? (json.data as RaydiumFarm[]) : [];
      const solUsdc = list.find((row) => {
        const a = row?.mintA?.symbol?.toUpperCase() ?? "";
        const b = row?.mintB?.symbol?.toUpperCase() ?? "";
        return (a === "SOL" && b === "USDC") || (a === "USDC" && b === "SOL");
      });

      if (!solUsdc) {
        const candidate = list
          .map((x) => ({ apy: Number(x.apr ?? x.apr24h ?? 0), tvl: Number(x.tvl ?? 0) }))
          .filter((x) => Number.isFinite(x.apy) && x.apy > 0)
          .sort((a, b) => b.tvl - a.tvl)[0];

        if (candidate) {
          return {
            apy: candidate.apy,
            tvl: candidate.tvl
          };
        }

        continue;
      }

      return {
        apy: Number(solUsdc.apr ?? solUsdc.apr24h ?? 18.4),
        tvl: Number(solUsdc.tvl ?? 20_000_000)
      };
    } catch {
      // continue fallback sequence
    }
  }

  return null;
}

export class RaydiumAdapter implements ProtocolAdapter {
  readonly name = "raydium" as const;

  async fetchOpportunities(portfolio: PortfolioState): Promise<ProtocolOpportunity[]> {
    const market = await fetchRaydiumFarmSignal();
    const amount = Math.max(0, Math.min(portfolio.solBalance * 0.12, 1.2));

    const farmApy = Number.isFinite(market?.apy) ? Number((market?.apy ?? 18.4).toFixed(2)) : 18.4;
    const tvl = Number.isFinite(market?.tvl) ? Number(market?.tvl ?? 20_000_000) : 20_000_000;

    return [
      {
        id: `raydium-farm-sol-usdc-${Date.now()}`,
        protocol: "raydium",
        actionType: "farm",
        inputSymbol: "SOL",
        outputSymbol: "SOL-USDC-LP",
        estimatedApy: farmApy,
        estimatedFeesBps: 26,
        estimatedRiskScore: 57,
        confidence: market ? 0.72 : 0.62,
        liquidityUsd: tvl,
        dataSource: market ? "raydium-live" : "raydium-fallback",
        minAmountSol: 0.08,
        maxAmountSol: Math.max(0.12, amount),
        note: "Provide SOL-USDC liquidity to target higher yield with IL risk."
      },
      {
        id: `raydium-claim-rewards-${Date.now()}`,
        protocol: "raydium",
        actionType: "claim",
        inputSymbol: "RAY",
        outputSymbol: "RAY",
        estimatedApy: 0,
        estimatedFeesBps: 5,
        estimatedRiskScore: 35,
        confidence: market ? 0.76 : 0.68,
        liquidityUsd: tvl,
        dataSource: market ? "raydium-live" : "raydium-fallback",
        minAmountSol: 0.01,
        maxAmountSol: 0.5,
        note: "Claim pending farm rewards periodically to avoid unclaimed accrual risk."
      }
    ];
  }
}
