export const env = {
  solanaRpcUrl: process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com",
  authTokenSecret: process.env.AUTH_TOKEN_SECRET ?? "dev-auth-secret-change-me",
  authTokenTtlSec: Number(process.env.AUTH_TOKEN_TTL_SEC ?? "86400"),
  authChallengeTtlSec: Number(process.env.AUTH_CHALLENGE_TTL_SEC ?? "300"),
  requireWalletAuth: (process.env.REQUIRE_WALLET_AUTH ?? "true").toLowerCase() !== "false",
  llmProvider: (process.env.LLM_PROVIDER ?? "openai").toLowerCase(),
  llmModel: process.env.LLM_MODEL ?? "gpt-4.1-mini",
  llmApiKey: process.env.LLM_API_KEY ?? "",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  jupiterExecutionWalletPrivateKey: process.env.JUPITER_EXECUTION_WALLET_PRIVATE_KEY ?? "",
  jupiterSlippageBps: Number(process.env.JUPITER_SLIPPAGE_BPS ?? "50"),
  pineconeApiKey: process.env.PINECONE_API_KEY ?? "",
  pineconeIndex: process.env.PINECONE_INDEX ?? "",
  pineconeNamespace: process.env.PINECONE_NAMESPACE ?? "wallet-agent",
  agentDryRun: (process.env.AGENT_DRY_RUN ?? "true").toLowerCase() !== "false",
  maxTxSizeSol: Number(process.env.MAX_TX_SIZE_SOL ?? "2"),
  maxHighRiskTxSizeSol: Number(process.env.MAX_HIGH_RISK_TX_SIZE_SOL ?? "0.5"),
  defaultRiskTolerance: (process.env.DEFAULT_RISK_TOLERANCE ?? "medium").toLowerCase(),
  allowedProtocols: (process.env.ALLOWED_PROTOCOLS ?? "jupiter,marinade,raydium")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean),
  blockedProtocols: (process.env.BLOCKED_PROTOCOLS ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean),
  schedulerDefaultIntervalSec: Number(process.env.SCHEDULER_DEFAULT_INTERVAL_SEC ?? "300")
};
