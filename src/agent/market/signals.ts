import { ProtocolName } from "@/agent/types";

type SymbolSignal = {
  symbol: string;
  change24hPct: number;
  volatilityScore: number;
};

type ProtocolSignal = {
  protocol: ProtocolName;
  riskPenalty: number;
  warnings: string[];
};

export type MarketSignals = {
  symbols: Record<string, SymbolSignal>;
  protocols: Record<ProtocolName, ProtocolSignal>;
  fetchedAt: string;
};

const BINANCE_PAIRS: Record<string, string> = {
  SOL: "SOLUSDT",
  RAY: "RAYUSDT",
  USDC: "USDCUSDT",
  USDT: "USDTUSDT",
  MSOL: "SOLUSDT"
};

let cache: { atMs: number; data: MarketSignals } | null = null;

function nowIso() {
  return new Date().toISOString();
}

function cacheTtlMs(): number {
  const raw = Number(process.env.MARKET_SIGNAL_CACHE_TTL_SECONDS ?? "45");
  return Math.max(10, Number.isFinite(raw) ? raw : 45) * 1000;
}

function parseProtocolPenaltyOverrides(): Partial<Record<ProtocolName, number>> {
  const raw = process.env.PROTOCOL_RISK_PENALTIES_JSON;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    return {
      jupiter: Number(parsed.jupiter ?? 0),
      marinade: Number(parsed.marinade ?? 0),
      raydium: Number(parsed.raydium ?? 0)
    };
  } catch {
    return {};
  }
}

function parseFlaggedProtocols(): Set<string> {
  const raw = process.env.FLAGGED_PROTOCOLS ?? "";
  return new Set(
    raw
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
  );
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSymbolSignal(symbol: string): Promise<SymbolSignal | null> {
  const pair = BINANCE_PAIRS[symbol.toUpperCase()];
  if (!pair) return null;

  try {
    const resp = await fetchWithTimeout(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(pair)}`
    );
    if (!resp.ok) return null;

    const json = (await resp.json()) as { priceChangePercent?: string };
    const change24hPct = Number(json.priceChangePercent ?? "0");
    if (!Number.isFinite(change24hPct)) return null;

    const volatilityScore = Math.min(100, Math.round(Math.abs(change24hPct) * 2.2));
    return {
      symbol,
      change24hPct,
      volatilityScore
    };
  } catch {
    return null;
  }
}

function buildProtocolSignals(): Record<ProtocolName, ProtocolSignal> {
  const overrides = parseProtocolPenaltyOverrides();
  const flagged = parseFlaggedProtocols();

  const base: Record<ProtocolName, ProtocolSignal> = {
    jupiter: {
      protocol: "jupiter",
      riskPenalty: 0,
      warnings: []
    },
    marinade: {
      protocol: "marinade",
      riskPenalty: 0,
      warnings: []
    },
    raydium: {
      protocol: "raydium",
      riskPenalty: 0,
      warnings: []
    }
  };

  for (const protocol of Object.keys(base) as ProtocolName[]) {
    const overridePenalty = Number(overrides[protocol] ?? 0);
    if (Number.isFinite(overridePenalty) && overridePenalty !== 0) {
      base[protocol].riskPenalty += overridePenalty;
      base[protocol].warnings.push(`Policy penalty applied: +${overridePenalty} risk points.`);
    }

    if (flagged.has(protocol)) {
      base[protocol].riskPenalty += 25;
      base[protocol].warnings.push("Protocol is flagged by external risk feed.");
    }
  }

  return base;
}

export async function getMarketSignals(symbols: string[]): Promise<MarketSignals> {
  if (cache && Date.now() - cache.atMs < cacheTtlMs()) {
    return cache.data;
  }

  const requested = [...new Set(symbols.map((x) => x.toUpperCase()).filter(Boolean))];
  const rows = await Promise.all(requested.map((symbol) => fetchSymbolSignal(symbol)));

  const symbolSignals: Record<string, SymbolSignal> = {};
  for (const row of rows) {
    if (!row) continue;
    symbolSignals[row.symbol] = row;
  }

  const data: MarketSignals = {
    symbols: symbolSignals,
    protocols: buildProtocolSignals(),
    fetchedAt: nowIso()
  };

  cache = {
    atMs: Date.now(),
    data
  };

  return data;
}
