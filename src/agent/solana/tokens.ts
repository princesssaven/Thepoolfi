export type SolanaTokenMeta = {
  symbol: string;
  mint: string;
  decimals: number;
};

export const TOKENS: Record<string, SolanaTokenMeta> = {
  SOL: {
    symbol: "SOL",
    mint: "So11111111111111111111111111111111111111112",
    decimals: 9
  },
  USDC: {
    symbol: "USDC",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6
  },
  USDT: {
    symbol: "USDT",
    mint: "Es9vMFrzaCERmJfrY2xvPc4F86A4f8Y9N5Vf3L7hPwr",
    decimals: 6
  },
  MSOL: {
    symbol: "MSOL",
    mint: "mSoLzYCxHdYgdzU8Y3eJQ7Jj6f9w6w7nJrV4WgbyfHk",
    decimals: 9
  },
  RAY: {
    symbol: "RAY",
    mint: "4k3Dyjzvzp8eMZWUXbDR2iA8u3nJ5FA8gA4Y5P4v6kg",
    decimals: 6
  }
};

export function getToken(symbol: string): SolanaTokenMeta | null {
  return TOKENS[symbol.toUpperCase()] ?? null;
}
