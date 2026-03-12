import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

import { getTokenPricesUsd } from "@/agent/market/prices";
import { PortfolioAsset, PortfolioState } from "@/agent/types";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

const KNOWN_MINTS: Record<string, string> = {
  So11111111111111111111111111111111111111112: "SOL",
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  mSoLzYCxHdYgdzU8Y3eJQ7Jj6f9w6w7nJrV4WgbyfHk: "MSOL",
  "4k3Dyjzvzp8eMZWUXbDR2iA8u3nJ5FA8gA4Y5P4v6kg": "RAY"
};

export async function fetchPortfolioState(
  walletAddress: string,
  rpcUrl: string
): Promise<PortfolioState> {
  const connection = new Connection(rpcUrl, "confirmed");
  const owner = new PublicKey(walletAddress);

  const [lamports, tokenAccounts] = await Promise.all([
    connection.getBalance(owner),
    connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID })
  ]);

  const solBalance = lamports / LAMPORTS_PER_SOL;

  const assets: PortfolioAsset[] = [
    {
      symbol: "SOL",
      mint: "So11111111111111111111111111111111111111112",
      amount: Number(solBalance.toFixed(6)),
      usdValue: 0
    }
  ];

  for (const tokenAccount of tokenAccounts.value) {
    const parsedInfo = tokenAccount.account.data.parsed?.info;
    if (!parsedInfo) continue;

    const mint = String(parsedInfo.mint);
    const amountUi = Number(parsedInfo.tokenAmount?.uiAmount ?? 0);
    if (!amountUi || amountUi <= 0) continue;

    const symbol = (KNOWN_MINTS[mint] ?? `${mint.slice(0, 4)}...${mint.slice(-4)}`).toUpperCase();

    assets.push({
      symbol,
      mint,
      amount: Number(amountUi.toFixed(6)),
      usdValue: 0
    });
  }

  const symbols = [...new Set(assets.map((asset) => asset.symbol.toUpperCase()))];
  const prices = await getTokenPricesUsd(symbols);

  for (const asset of assets) {
    const price = prices[asset.symbol] ?? 0;
    asset.usdValue = Number((asset.amount * price).toFixed(2));
  }

  const totalUsdValue = Number(assets.reduce((sum, asset) => sum + asset.usdValue, 0).toFixed(2));

  return {
    walletAddress,
    totalUsdValue,
    solBalance: Number(solBalance.toFixed(6)),
    assets,
    fetchedAt: new Date().toISOString()
  };
}
