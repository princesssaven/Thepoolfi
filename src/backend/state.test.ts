import { describe, expect, it } from "vitest";

import { getOrCreatePolicy, parseProtocols, setPolicy, setStrategy, upsertSession } from "@/backend/state";

describe("backend state", () => {
  const wallet = "TestWallet1111111111111111111111111111111";

  it("creates and refreshes wallet sessions", () => {
    const first = upsertSession(wallet);
    const second = upsertSession(wallet);
    expect(first.sessionId).toBe(second.sessionId);
  });

  it("stores strategy updates", () => {
    const strategy = setStrategy(wallet, { instruction: "Grow SOL with low risk" });
    expect(strategy.instruction).toContain("Grow SOL");
  });

  it("stores policy updates", () => {
    const policy = setPolicy(wallet, {
      maxTransactionSol: 0.8,
      allowedProtocols: parseProtocols(["jupiter"])
    });

    expect(policy.maxTransactionSol).toBe(0.8);
    expect(policy.allowedProtocols).toEqual(["jupiter"]);
  });

  it("falls back to default policy", () => {
    const policy = getOrCreatePolicy("AnotherWallet11111111111111111111111111111");
    expect(policy.maxTransactionSol).toBeGreaterThan(0);
  });
});
