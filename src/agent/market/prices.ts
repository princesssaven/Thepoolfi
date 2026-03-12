const DEFAULT_PRICES_USD: Record<string, number> = {
  SOL: 180,
  USDC: 1,
  USDT: 1,
  MSOL: 183,
  RAY: 2.1
};

const BINANCE_PAIRS: Record<string, string> = {
  SOL: "SOLUSDT",
  USDC: "USDCUSDT",
  USDT: "USDTUSDT",
  RAY: "RAYUSDT"
};

const CMC_SYMBOLS: Record<string, string> = {
  SOL: "SOL",
  USDC: "USDC",
  USDT: "USDT",
  MSOL: "MSOL",
  RAY: "RAY"
};

type PriceMap = Record<string, number>;

type CacheEntry = {
  atMs: number;
  prices: PriceMap;
};

let cache: CacheEntry | null = null;

function nowMs() {
  return Date.now();
}

function priceProvider(): string {
  return (process.env.PRICE_PROVIDER ?? "binance").toLowerCase();
}

function cacheTtlMs(): number {
  const raw = Number(process.env.PRICE_CACHE_TTL_SECONDS ?? "30");
  const sec = Number.isFinite(raw) && raw > 0 ? raw : 30;
  return sec * 1000;
}

function parseCustomPrices(): PriceMap {
  const raw = process.env.TOKEN_PRICES_JSON;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    const out: PriceMap = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) continue;
      out[key.toUpperCase()] = value;
    }

    return out;
  } catch {
    return {};
  }
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBinancePrices(symbols: string[]): Promise<PriceMap> {
  const out: PriceMap = {};
  const pairs = symbols
    .map((symbol) => ({ symbol, pair: BINANCE_PAIRS[symbol] }))
    .filter((x) => Boolean(x.pair));

  await Promise.all(
    pairs.map(async ({ symbol, pair }) => {
      try {
        const resp = await fetchWithTimeout(
          `https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(pair as string)}`
        );
        if (!resp.ok) return;

        const json = (await resp.json()) as { price?: string };
        const price = Number(json.price);
        if (Number.isFinite(price) && price > 0) {
          out[symbol] = price;
        }
      } catch {
        // ignore and fall back
      }
    })
  );

  return out;
}

async function fetchCoinMarketCapPrices(symbols: string[], apiKey: string): Promise<PriceMap> {
  const out: PriceMap = {};
  if (!apiKey) return out;

  const cmcSymbols = symbols
    .map((symbol) => CMC_SYMBOLS[symbol])
    .filter(Boolean)
    .join(",");

  if (!cmcSymbols) return out;

  try {
    const resp = await fetchWithTimeout(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${encodeURIComponent(cmcSymbols)}`,
      {
        headers: {
          Accept: "application/json",
          "X-CMC_PRO_API_KEY": apiKey
        }
      }
    );

    if (!resp.ok) return out;

    const json = (await resp.json()) as {
      data?: Record<string, Array<{ quote?: { USD?: { price?: number } } }>>;
    };

    const data = json.data ?? {};
    for (const symbol of symbols) {
      const lookup = CMC_SYMBOLS[symbol];
      if (!lookup) continue;
      const row = data[lookup]?.[0];
      const price = Number(row?.quote?.USD?.price);
      if (Number.isFinite(price) && price > 0) {
        out[symbol] = price;
      }
    }
  } catch {
    // ignore and fall back
  }

  return out;
}

function withFallbacks(symbols: string[], base: PriceMap): PriceMap {
  const out: PriceMap = { ...base };

  for (const symbol of symbols) {
    if (out[symbol] && out[symbol] > 0) continue;

    if (symbol === "MSOL" && out.SOL) {
      out.MSOL = Number((out.SOL * 1.01).toFixed(6));
      continue;
    }

    const fallback = DEFAULT_PRICES_USD[symbol];
    if (fallback) out[symbol] = fallback;
  }

  return out;
}

function readFromCache(symbols: string[]): PriceMap | null {
  if (!cache) return null;
  if (nowMs() - cache.atMs > cacheTtlMs()) return null;

  for (const symbol of symbols) {
    if (!cache.prices[symbol]) {
      return null;
    }
  }

  return { ...cache.prices };
}

function writeCache(prices: PriceMap) {
  cache = {
    atMs: nowMs(),
    prices: { ...(cache?.prices ?? {}), ...prices }
  };
}

export async function getTokenPricesUsd(inputSymbols: string[]): Promise<PriceMap> {
  const symbols = [...new Set(inputSymbols.map((x) => x.toUpperCase()).filter(Boolean))];
  if (!symbols.length) return {};

  const cached = readFromCache(symbols);
  if (cached) {
    return symbols.reduce<PriceMap>((acc, symbol) => {
      acc[symbol] = cached[symbol];
      return acc;
    }, {});
  }

  const custom = parseCustomPrices();
  const missing = symbols.filter((symbol) => !custom[symbol]);

  let remote: PriceMap = {};
  const provider = priceProvider();

  if (missing.length) {
    if (provider === "coinmarketcap") {
      remote = await fetchCoinMarketCapPrices(missing, process.env.COINMARKETCAP_API_KEY ?? "");

      if (Object.keys(remote).length < missing.length) {
        const remaining = missing.filter((symbol) => !remote[symbol]);
        const fallbackRemote = await fetchBinancePrices(remaining);
        remote = { ...remote, ...fallbackRemote };
      }
    } else {
      remote = await fetchBinancePrices(missing);

      if (Object.keys(remote).length < missing.length && process.env.COINMARKETCAP_API_KEY) {
        const remaining = missing.filter((symbol) => !remote[symbol]);
        const fallbackRemote = await fetchCoinMarketCapPrices(
          remaining,
          process.env.COINMARKETCAP_API_KEY
        );
        remote = { ...remote, ...fallbackRemote };
      }
    }
  }

  const resolved = withFallbacks(symbols, { ...custom, ...remote });
  writeCache(resolved);

  return symbols.reduce<PriceMap>((acc, symbol) => {
    acc[symbol] = resolved[symbol] ?? 0;
    return acc;
  }, {});
}
