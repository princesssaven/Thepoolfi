# AI Autonomous Wallet Agent (Solana)

A full-stack MVP scaffold for an AI-driven autonomous Solana wallet manager.

## What is included

- Next.js dashboard with Solana wallet connection (Phantom/Solflare)
- Natural-language strategy input (`"Grow my SOL with moderate risk"`)
- Autonomous agent pipeline:
  - protocol opportunity collection (Jupiter, Marinade, Raydium adapters)
  - market-signal-aware risk assessment and filtering
  - policy enforcement (max tx size, allowed/blocked protocols, confirmation mode)
  - LLM decision planner (OpenAI-compatible API) with heuristic fallback
  - execution layer (real Jupiter swap + dry-run safety mode)
  - memory layer (in-memory or Pinecone)
- Live token pricing via Binance or CoinMarketCap provider with fallback defaults
- API routes:
  - `POST /api/auth/challenge`
  - `POST /api/auth/verify`
  - `POST /api/connect-wallet`
  - `POST /api/set-strategy`
  - `POST /api/set-policy`
  - `POST /api/execute-transaction`
  - `GET /api/approvals?wallet=<address>`
  - `POST /api/approvals/decision`
  - `POST /api/agent/scheduler/start`
  - `POST /api/agent/scheduler/stop`
  - `GET /api/agent/scheduler/status?wallet=<address>`
  - `POST /api/agent/cron`
  - `GET /api/portfolio?wallet=<address>`
  - `POST /api/agent/run`

## Architecture

- `app/` - Next.js App Router pages and API endpoints
- `src/components/` - UI and wallet provider components
- `src/agent/` - autonomous agent modules
  - `protocols/` opportunity adapters
  - `risk.ts` risk scoring + tolerance filtering
  - `policy.ts` hard safety constraints
  - `planner.ts` LLM planner + fallback heuristics
  - `executor.ts` transaction execution layer (dry-run by default)
  - `memory/` in-memory + Pinecone stores
  - `solana/portfolio.ts` on-chain portfolio fetcher
- `src/backend/` - API-facing backend service/state layer
  - wallet auth/session management
  - strategy and policy persistence (disk-backed JSON state)
  - transaction logs and run history
  - risk alert generation for run outputs
  - pending approval queue and scheduler control
- `docs/backend-architecture.md` - backend component and data flow reference

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env.local
```

3. Run development server:

```bash
npm run dev
```

4. Open `http://localhost:3000`, connect wallet, enter instruction, and run agent cycle.

## Backend flow implemented

1. `POST /api/auth/challenge` + `POST /api/auth/verify` authenticate wallet ownership via signed message.
2. `POST /api/connect-wallet` initializes wallet session + default strategy/policy.
3. `POST /api/set-strategy` and `POST /api/set-policy` update autonomous behavior and constraints.
4. `POST /api/agent/run` executes AI cycle with policy checks and approval queueing.
5. `POST /api/execute-transaction` executes direct actions through the same policy/approval gate.
6. `GET /api/approvals` and `POST /api/approvals/decision` handle human confirmation workflow.
7. Scheduler endpoints manage continuous autonomous runs, and `POST /api/agent/cron` runs due wallets.

## Safety defaults

- `AGENT_DRY_RUN=true` by default
- policy checks reject oversized/high-risk decisions
- human-confirmation decisions are queued for explicit approve/reject

## Token price provider

- `PRICE_PROVIDER=binance` (default, no key required for supported pairs)
- `PRICE_PROVIDER=coinmarketcap` + `COINMARKETCAP_API_KEY` for CMC quotes
- `PRICE_CACHE_TTL_SECONDS` controls backend price cache duration
- `TOKEN_PRICES_JSON` can override specific symbols manually

## Important implementation note

This MVP includes real orchestration logic and policy/risk controls.  
`src/agent/executor.ts` now supports **real Jupiter swap execution** when:

- `AGENT_DRY_RUN=false`
- `JUPITER_EXECUTION_WALLET_PRIVATE_KEY` is configured

Marinade and Raydium execution adapters are still scaffold-level and need full instruction builders.

To move to production execution, implement:

- Marinade stake/unstake instructions
- Raydium LP/farm/claim instructions
- delegated session key + spending limits
- transaction simulation before submit
- audit logs and rollback/exit workflows

## Suggested next build steps (matching your 14-day MVP)

1. Replace mock opportunity estimators with live protocol market data.
2. Implement real protocol transaction builders in the executor.
3. Add user profile persistence (DB) and strategy versioning.
4. Add confirmation workflow UI for high-risk actions.
5. Add historical analytics and profit/performance fee tracking.
