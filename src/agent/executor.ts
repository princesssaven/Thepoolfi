import bs58 from "bs58";
import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";

import { getTokenPricesUsd } from "@/agent/market/prices";
import { getToken } from "@/agent/solana/tokens";
import { ExecutionResult, ProposedDecision } from "@/agent/types";
import { env } from "@/lib/env";

type ExecutorInput = {
  dryRun: boolean;
  decisions: ProposedDecision[];
};

type JupiterQuote = {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
};

function parseSignerKeypair(raw: string): Keypair {
  if (!raw.trim()) {
    throw new Error("JUPITER_EXECUTION_WALLET_PRIVATE_KEY is not configured");
  }

  if (raw.trim().startsWith("[")) {
    const arr = JSON.parse(raw) as number[];
    const secret = Uint8Array.from(arr);
    return Keypair.fromSecretKey(secret);
  }

  const secret = bs58.decode(raw.trim());
  return Keypair.fromSecretKey(secret);
}

async function fetchJupiterQuote(inputMint: string, outputMint: string, amount: string): Promise<JupiterQuote> {
  const url =
    `https://quote-api.jup.ag/v6/quote?inputMint=${encodeURIComponent(inputMint)}` +
    `&outputMint=${encodeURIComponent(outputMint)}` +
    `&amount=${encodeURIComponent(amount)}` +
    `&slippageBps=${encodeURIComponent(String(env.jupiterSlippageBps))}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Jupiter quote failed (${resp.status})`);
  }

  return (await resp.json()) as JupiterQuote;
}

async function fetchJupiterSwapTx(quote: JupiterQuote, userPublicKey: string): Promise<string> {
  const resp = await fetch("https://quote-api.jup.ag/v6/swap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto"
    })
  });

  if (!resp.ok) {
    throw new Error(`Jupiter swap build failed (${resp.status})`);
  }

  const json = (await resp.json()) as { swapTransaction?: string };
  if (!json.swapTransaction) {
    throw new Error("Jupiter swap response missing transaction payload");
  }

  return json.swapTransaction;
}

async function amountSolToInputUnits(decision: ProposedDecision): Promise<{ inputAmount: number; units: string }> {
  const inputSymbol = decision.inputSymbol?.toUpperCase() ?? "SOL";
  const inputToken = getToken(inputSymbol);
  if (!inputToken) {
    throw new Error(`Input token not configured: ${inputSymbol}`);
  }

  let inputAmount = decision.amountSol;

  if (inputSymbol !== "SOL") {
    const prices = await getTokenPricesUsd(["SOL", inputSymbol]);
    const solPrice = prices.SOL;
    const inputPrice = prices[inputSymbol];

    if (!solPrice || !inputPrice) {
      throw new Error(`Missing price to convert SOL amount into ${inputSymbol}`);
    }

    inputAmount = (decision.amountSol * solPrice) / inputPrice;
  }

  const unitsNumber = Math.max(1, Math.floor(inputAmount * 10 ** inputToken.decimals));

  return {
    inputAmount,
    units: String(unitsNumber)
  };
}

async function executeJupiterSwap(decision: ProposedDecision): Promise<ExecutionResult> {
  const inputSymbol = decision.inputSymbol?.toUpperCase() ?? "SOL";
  const outputSymbol = decision.outputSymbol?.toUpperCase() ?? "USDC";

  const inputToken = getToken(inputSymbol);
  const outputToken = getToken(outputSymbol);

  if (!inputToken || !outputToken) {
    throw new Error(`Swap token mapping missing for ${inputSymbol} -> ${outputSymbol}`);
  }

  const signer = parseSignerKeypair(env.jupiterExecutionWalletPrivateKey);
  const connection = new Connection(env.solanaRpcUrl, "confirmed");

  const { units, inputAmount } = await amountSolToInputUnits(decision);
  const quote = await fetchJupiterQuote(inputToken.mint, outputToken.mint, units);
  const serialized = await fetchJupiterSwapTx(quote, signer.publicKey.toBase58());

  const txBuffer = Buffer.from(serialized, "base64");
  const tx = VersionedTransaction.deserialize(txBuffer);
  tx.sign([signer]);

  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 3
  });

  await connection.confirmTransaction(signature, "confirmed");

  return {
    status: "executed",
    protocol: decision.protocol,
    actionType: decision.actionType,
    inputSymbol,
    outputSymbol,
    txSignature: signature,
    details: `Executed Jupiter swap ${inputAmount.toFixed(6)} ${inputSymbol} -> ${outputSymbol}`
  };
}

async function executeReal(decision: ProposedDecision): Promise<ExecutionResult> {
  if (decision.protocol === "jupiter" && decision.actionType === "swap") {
    return executeJupiterSwap(decision);
  }

  return {
    status: "failed",
    protocol: decision.protocol,
    actionType: decision.actionType,
    inputSymbol: decision.inputSymbol,
    outputSymbol: decision.outputSymbol,
    details:
      "Real on-chain execution is implemented only for Jupiter swap in this version. Other protocol actions still require transaction adapters."
  };
}

export async function executeDecisions(input: ExecutorInput): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  for (const decision of input.decisions) {
    if (input.dryRun) {
      results.push({
        status: "simulated",
        protocol: decision.protocol,
        actionType: decision.actionType,
        inputSymbol: decision.inputSymbol,
        outputSymbol: decision.outputSymbol,
        txSignature: `sim-${decision.protocol}-${Date.now()}`,
        details: `Dry-run: would execute ${decision.actionType} on ${decision.protocol} for ${decision.amountSol} SOL.`
      });
      continue;
    }

    try {
      const real = await executeReal(decision);
      results.push(real);
    } catch (error) {
      results.push({
        status: "failed",
        protocol: decision.protocol,
        actionType: decision.actionType,
        inputSymbol: decision.inputSymbol,
        outputSymbol: decision.outputSymbol,
        details: error instanceof Error ? error.message : "Execution failed"
      });
    }
  }

  return results;
}
