# Phase 7 Pre-Deployment QA Checklist

Use this checklist before a Sepolia demo or public testnet submission. This is
for testnet only, is not production-ready, and must not be used with real money.

## 1. Local Build And Test

- [ ] Install dependencies from the repo root:

```bash
pnpm install
```

- [ ] Validate contracts:

```bash
cd packages/contracts
forge fmt --check
forge build
forge test -vvv
```

- [ ] Validate frontend:

```bash
pnpm --filter web lint
pnpm --filter web build
pnpm --filter web typecheck
```

## 2. Required Environment Variables

Contracts and deployment:

- [ ] `SEPOLIA_CHAIN_ID=11155111`
- [ ] `SEPOLIA_RPC_URL`
- [ ] `PRIVATE_KEY` using a Sepolia-only deployer key
- [ ] `ETHERSCAN_API_KEY`
- [ ] `VRF_COORDINATOR=0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B`
- [ ] `VRF_KEY_HASH=0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae`
- [ ] `VRF_SUBSCRIPTION_ID`
- [ ] `VRF_CALLBACK_GAS_LIMIT=250000`
- [ ] `VRF_REQUEST_CONFIRMATIONS=3`
- [ ] `VRF_NATIVE_PAYMENT=false`
- [ ] `INITIAL_BANKROLL_WEI`

Frontend:

- [ ] `NEXT_PUBLIC_CHAIN_ID=11155111`
- [ ] `NEXT_PUBLIC_SEPOLIA_RPC_URL`
- [ ] `NEXT_PUBLIC_COIN_FLIP_CASINO_ADDRESS`
- [ ] `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` if a WalletConnect connector is added later

## 3. Chainlink VRF v2.5 Setup

- [ ] Open `https://vrf.chain.link`.
- [ ] Select Ethereum Sepolia.
- [ ] Create or select a VRF v2.5 subscription.
- [ ] Fund the subscription with the payment asset matching `VRF_NATIVE_PAYMENT`.
- [ ] Copy the subscription id into `VRF_SUBSCRIPTION_ID`.
- [ ] Confirm Sepolia coordinator and key hash match `.env.example`.

## 4. Dry-Run Deploy

- [ ] Load `.env` and run the non-broadcast dry-run:

```bash
cd packages/contracts
source ../../.env
pnpm deploy:sepolia:dry
```

- [ ] Confirm the script logs the expected owner, chain id, VRF coordinator, subscription id, and initial bankroll.
- [ ] Confirm the script does not revert with `WrongChain`.

## 5. Broadcast Deploy

- [ ] Confirm dry-run passed.
- [ ] Confirm deployer wallet has Sepolia ETH for gas and any `INITIAL_BANKROLL_WEI`.
- [ ] Run broadcast only intentionally:

```bash
cd packages/contracts
source ../../.env
pnpm deploy:sepolia:broadcast
```

- [ ] Save the deployed `CoinFlipCasino` address.
- [ ] Confirm Etherscan verification succeeds or follow the manual verification notes in `docs/deployment.md`.

## 6. Add VRF Consumer

- [ ] Return to `https://vrf.chain.link`.
- [ ] Open the Sepolia VRF subscription.
- [ ] Add the deployed `CoinFlipCasino` address as an authorized consumer.
- [ ] Confirm the subscription remains funded after adding the consumer.

## 7. Configure Frontend Env

- [ ] Set `NEXT_PUBLIC_COIN_FLIP_CASINO_ADDRESS` to the deployed contract address.
- [ ] Set `NEXT_PUBLIC_SEPOLIA_RPC_URL` to a Sepolia RPC endpoint.
- [ ] Restart the frontend dev server after changing env vars:

```bash
pnpm --filter web dev
```

- [ ] Confirm the UI no longer shows the missing contract address state.
- [ ] Confirm the wallet network guard shows Sepolia when connected to chain id `11155111`.

## 8. Local UI E2E Flow

- [ ] Connect wallet.
- [ ] Confirm wallet address and Sepolia chain id are visible.
- [ ] Confirm wallet ETH balance loads only on Sepolia.
- [ ] Deposit a small Sepolia ETH amount.
- [ ] Capture the deposit transaction hash and `Deposited` event.
- [ ] Confirm internal casino balance increases.
- [ ] Choose HEADS or TAILS.
- [ ] Enter a bet amount that is less than or equal to internal casino balance.
- [ ] Confirm the estimated payout is 1.9x and the house edge copy is visible.
- [ ] Place bet.
- [ ] Confirm pending bet state appears with side, stake, possible payout, request id, and VRF waiting message.
- [ ] Wait for Chainlink VRF fulfillment.
- [ ] Confirm result comes from contract state/events only.
- [ ] Capture `BetResolved` event and whether the bet won or lost.
- [ ] Confirm internal casino balance updates after resolution.
- [ ] Withdraw remaining internal balance.
- [ ] Capture the withdraw transaction hash and `Withdrawn` event.

## 9. Explorer Links To Capture For Loom/Notion

- [ ] Deployed contract address on Sepolia Etherscan.
- [ ] Contract verification page on Sepolia Etherscan.
- [ ] Deployment transaction.
- [ ] Initial bankroll funding transaction, if used.
- [ ] Chainlink VRF subscription page or subscription id.
- [ ] VRF consumer registration evidence.
- [ ] Deposit transaction and `Deposited` event.
- [ ] Bet transaction and `BetPlaced` event.
- [ ] VRF fulfillment transaction and `BetResolved` event.
- [ ] Withdraw transaction and `Withdrawn` event.
- [ ] Refund transaction and `BetRefunded` event, if the timeout path is demonstrated.
- [ ] GitHub PR or release commit used for the demo.
- [ ] Live frontend URL.

## 10. Common Troubleshooting

- Wrong chain: confirm `SEPOLIA_CHAIN_ID=11155111`, wallet network is Sepolia, and the deploy script dry-run does not revert with `WrongChain`.
- Missing contract reads: confirm `NEXT_PUBLIC_COIN_FLIP_CASINO_ADDRESS` is set, valid, and the frontend server was restarted.
- Failed wallet balance reads: confirm the wallet is connected to Sepolia; balance reads are intentionally disabled on other networks.
- Deposit or bet paused: check `paused()` on the contract. Withdrawals should still work while paused.
- Bet rejected for bankroll: fund the casino bankroll or lower the bet so `availableBankroll()` can cover the full 1.9x maximum payout.
- VRF not fulfilling: confirm the contract is added as a VRF consumer, the subscription is funded, `VRF_SUBSCRIPTION_ID` is correct, and request confirmations have passed.
- Etherscan verification failed: use the broadcast artifact under `packages/contracts/broadcast/` to recover constructor args and retry verification.
- Frontend stale after env changes: stop and restart `pnpm --filter web dev`.
- Transaction confirmed but UI stale: refresh the page and confirm the transaction events on Sepolia Etherscan.

## Final Submission Checklist

- [ ] GitHub repo link added to submission.
- [ ] Live URL added to submission.
- [ ] Sepolia contract address added to submission.
- [ ] README updated with current testnet status and no-real-money warning.
- [ ] Loom checklist completed:
  - [ ] Show repo and branch/commit.
  - [ ] Show live or local frontend.
  - [ ] Connect wallet on Sepolia.
  - [ ] Deposit.
  - [ ] Place bet.
  - [ ] Show pending VRF state.
  - [ ] Show resolved bet event.
  - [ ] Withdraw.
- [ ] Notion page checklist completed:
  - [ ] Architecture summary.
  - [ ] Contract address and explorer links.
  - [ ] VRF subscription notes.
  - [ ] E2E test evidence.
  - [ ] Known limitations and testnet-only disclaimer.
