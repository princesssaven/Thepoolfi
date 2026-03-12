# Backend Architecture Overview

## Runtime

- Next.js API routes on Vercel-style serverless runtime (`runtime = "nodejs"`).
- API routes orchestrate AI planning, policy checks, risk filtering, and transaction dispatching.

## API Layer

Implemented routes:

- `POST /api/auth/challenge`
  - Issues wallet challenge message with nonce and expiration.

- `POST /api/auth/verify`
  - Verifies signed challenge and returns bearer auth token.

- `POST /api/connect-wallet`
  - Validates wallet input.
  - Creates or refreshes backend wallet session (auth-required).
  - Returns session metadata, live portfolio, strategy, and policy.

- `POST /api/set-strategy`
  - Stores user strategy instruction/objective/tags.

- `POST /api/set-policy`
  - Stores risk tolerance, max tx size, daily-loss settings, allowed/blocked protocols, and confirmation rules.

- `POST /api/agent/run`
  - Loads wallet strategy + policy context.
  - Runs AI cycle and policy-gated execution.
  - Returns cycle report + risk alerts + history counters.

- `POST /api/execute-transaction`
  - Executes direct user-requested transaction through the same policy gates.

- `GET /api/approvals?wallet=<address>`
  - Lists pending human-approval actions.

- `POST /api/approvals/decision`
  - Approves/rejects pending decisions and executes approved actions.

- `POST /api/agent/scheduler/start`
- `POST /api/agent/scheduler/stop`
- `GET /api/agent/scheduler/status`
- `POST /api/agent/cron`
  - In-process scheduler control + cron sweep for due autopilot wallets.

- `GET /api/portfolio?wallet=<address>`
  - Returns current on-chain portfolio + backend context (strategy/policy/history).

## Agent Layer

- `src/agent/` handles autonomous logic:
  - protocol opportunity adapters (`jupiter`, `marinade`, `raydium`)
  - risk scoring and tolerance filtering
  - planner (LLM or fallback heuristics)
  - policy validation
  - execution layer
  - memory store (in-memory or Pinecone)

## Smart Contract / Chain Layer

- `src/agent/solana/portfolio.ts` fetches SOL + SPL balances through `@solana/web3.js`.
- `src/agent/market/prices.ts` fetches token USD prices from Binance or CoinMarketCap.
- `src/agent/executor.ts` executes real Jupiter swaps when dry-run is disabled and signer key is configured.
- Marinade and Raydium execution adapters remain pluggable scaffolds.

## Backend State Layer

- `src/backend/state.ts` persists backend state in `.data/backend-state.json`:
  - wallet sessions
  - auth challenges/tokens
  - strategies
  - policies
  - pending approvals
  - run reports
  - transaction logs

Replace with managed DB/queue for horizontally-scaled production deployments.

## Risk & Security Controls

- Allowed/blocked protocol checks.
- Max transaction size and high-risk transaction cap.
- Human confirmation queue and explicit approve/reject workflow.
- Wallet signed-message authentication for protected routes.
- Risk alert generation after each run.
- Market-signal-aware volatility penalty in risk scoring.
- Dry-run default (`AGENT_DRY_RUN=true`).

## Memory Layer

- Pinecone support exists via `src/agent/memory/store.ts`.
- Decisions are embedded and stored when Pinecone is configured.

## Data Flow

1. Frontend authenticates wallet via challenge/verify signature.
2. Frontend connects wallet -> `POST /api/connect-wallet`.
3. User sets strategy/policy -> `POST /api/set-strategy`, `POST /api/set-policy`.
4. User or scheduler runs autonomous cycle -> `POST /api/agent/run`.
5. Backend pulls opportunities, applies market-aware risk scoring, validates policy, executes allowed actions, and queues approvals.
6. User approves/rejects queued decisions -> `POST /api/approvals/decision`.
7. State/history remains persisted across process restarts.
