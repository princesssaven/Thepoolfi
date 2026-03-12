import { afterEach, describe, expect, it, vi } from "vitest";

import { applyRiskTolerance } from "@/agent/risk";
import { ProtocolOpportunity } from "@/agent/types";

const base: ProtocolOpportunity = {
  id: "1",
  protocol: "raydium",
  actionType: "farm",
  inputSymbol: "SOL",
  outputSymbol: "LP",
  estimatedApy: 19,
  estimatedFeesBps: 25,
  estimatedRiskScore: 72,
  confidence: 0.6,
  minAmountSol: 0.1,
  maxAmountSol: 1,
  note: "test"
};

describe("applyRiskTolerance", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("filters risky opportunities at low tolerance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch
    );

    const { filtered } = await applyRiskTolerance([base], "low");
    expect(filtered).toHaveLength(0);
  });

  it("allows more opportunities at high tolerance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch
    );

    const { filtered } = await applyRiskTolerance([base], "high");
    expect(filtered).toHaveLength(1);
  });
});
