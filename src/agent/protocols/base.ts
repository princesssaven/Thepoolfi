import { PortfolioState, ProtocolOpportunity } from "@/agent/types";

export interface ProtocolAdapter {
  readonly name: "jupiter" | "marinade" | "raydium";
  fetchOpportunities(portfolio: PortfolioState): Promise<ProtocolOpportunity[]>;
}
