import { PortfolioState, ProtocolOpportunity } from "@/agent/types";
import { ProtocolAdapter } from "@/agent/protocols/base";
import { getToken } from "@/agent/solana/tokens";

type JupiterQuote = {
  outAmount?: string;
  priceImpactPct?: string;
};

async function fetchQuote(inputMint: string, outputMint: string, amount: string): Promise<JupiterQuote | null> {
  try {
    const url =
      `https://quote-api.jup.ag/v6/quote?inputMint=${encodeURIComponent(inputMint)}` +
      `&outputMint=${encodeURIComponent(outputMint)}` +
      `&amount=${encodeURIComponent(amount)}` +
      "&slippageBps=50";

    const resp = await fetch(url, { next: { revalidate: 15 } });
    if (!resp.ok) return null;
    return (await resp.json()) as JupiterQuote;
  } catch {
    return null;
  }
}

function parsePct(input: string | undefined, fallback: number): number {
  const num = Number(input ?? "");
  return Number.isFinite(num) ? num : fallback;
}

export class JupiterAdapter implements ProtocolAdapter {
  readonly name = "jupiter" as const;

  async fetchOpportunities(portfolio: PortfolioState): Promise<ProtocolOpportunity[]> {
    const sol = getToken("SOL");
    const usdc = getToken("USDC");

    if (!sol || !usdc) return [];

    const solAmount = Math.max(0, Math.min(1.2, portfolio.solBalance * 0.2));
    const usdcApprox = Math.max(0, Math.min(300, portfolio.totalUsdValue * 0.1));

    const solLamports = BigInt(Math.max(1, Math.round(solAmount * 10 ** sol.decimals))).toString();
    const usdcUnits = BigInt(Math.max(1, Math.round(usdcApprox * 10 ** usdc.decimals))).toString();

    const [solToUsdc, usdcToSol] = await Promise.all([
      fetchQuote(sol.mint, usdc.mint, solLamports),
      fetchQuote(usdc.mint, sol.mint, usdcUnits)
    ]);

    const quote1Impact = parsePct(solToUsdc?.priceImpactPct, 0.0012);
    const quote2Impact = parsePct(usdcToSol?.priceImpactPct, 0.0016);

    const opportunities: ProtocolOpportunity[] = [
      {
        id: `jup-swap-sol-usdc-${Date.now()}`,
        protocol: "jupiter",
        actionType: "swap",
        inputSymbol: "SOL",
        outputSymbol: "USDC",
        estimatedApy: 0,
        estimatedFeesBps: Math.max(5, Math.round(quote1Impact * 10_000)),
        estimatedRiskScore: Math.min(60, 18 + Math.round(quote1Impact * 1000)),
        confidence: solToUsdc ? 0.87 : 0.7,
        priceImpactPct: Number((quote1Impact * 100).toFixed(4)),
        liquidityUsd: solToUsdc ? 30_000_000 : 5_000_000,
        dataSource: solToUsdc ? "jupiter-live" : "jupiter-fallback",
        minAmountSol: 0.05,
        maxAmountSol: Math.max(0.1, solAmount),
        note: "Use Jupiter route for quick portfolio rebalancing into stablecoins."
      },
      {
        id: `jup-swap-usdc-sol-${Date.now()}`,
        protocol: "jupiter",
        actionType: "swap",
        inputSymbol: "USDC",
        outputSymbol: "SOL",
        estimatedApy: 4.8,
        estimatedFeesBps: Math.max(8, Math.round(quote2Impact * 10_000)),
        estimatedRiskScore: Math.min(64, 26 + Math.round(quote2Impact * 1200)),
        confidence: usdcToSol ? 0.83 : 0.68,
        priceImpactPct: Number((quote2Impact * 100).toFixed(4)),
        liquidityUsd: usdcToSol ? 30_000_000 : 5_000_000,
        dataSource: usdcToSol ? "jupiter-live" : "jupiter-fallback",
        minAmountSol: 0.03,
        maxAmountSol: Math.max(0.08, usdcApprox / 180),
        note: "Build SOL exposure through DCA-like swap using aggregator routing."
      }
    ];

    return opportunities;
  }
}
