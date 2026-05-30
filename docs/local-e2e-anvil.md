# Local E2E With Anvil And Mock VRF

This flow lets you test the full UI locally without Sepolia ETH, faucets, or a
Chainlink VRF subscription. It does not replace the Sepolia Chainlink VRF path.

Warning: Anvil private keys are public local-dev keys only. Never use them for
real funds, Sepolia deployment wallets, mainnet wallets, or any account with
value outside local development.

## 1. Start Anvil

In one terminal:

```bash
anvil --chain-id 31337
```

Keep this terminal running. Copy one of Anvil's printed private keys into your
local shell or a local-only env file as `LOCAL_ANVIL_PRIVATE_KEY`.

Example local env file name:

```bash
.env.local-anvil
```

Do not commit that file.

## 2. Add Anvil To MetaMask

Add a custom network:

- Network name: `Local Anvil`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency symbol: `ETH`

Import one Anvil test account into MetaMask using one of the private keys
printed by Anvil. Use this account only for local development.

## 3. Deploy Local Mock Casino

In another terminal, from the repo root:

```bash
source .env.local-anvil
pnpm --filter @crypto-casino/contracts local:deploy
```

The `local:deploy` script is hardcoded to `http://127.0.0.1:8545` and the
deployment script reverts unless `block.chainid == 31337`.

The script deploys:

- `MockVRFCoordinatorV2Plus`
- `CoinFlipCasino` configured to use the mock coordinator
- `100 ETH` local casino bankroll

Copy the printed values:

- `NEXT_PUBLIC_COIN_FLIP_CASINO_ADDRESS`
- `LOCAL_MOCK_VRF_COORDINATOR`

## 4. Configure Frontend Local Env

Create or update `apps/web/.env.local`:

```bash
NEXT_PUBLIC_ENABLE_LOCAL_ANVIL=true
NEXT_PUBLIC_COIN_FLIP_CASINO_ADDRESS=<local CoinFlipCasino address>
```

`NEXT_PUBLIC_COIN_FLIP_CASINO_ADDRESS` must be the local deployed address from
the deploy script output. Local mode uses `http://127.0.0.1:8545` for chain ID
`31337`. Do not hardcode the deployed contract address in source code.

## 5. Run Frontend

From the repo root:

```bash
pnpm --filter web dev:local
```

Open the local Next.js URL printed by the dev server.

The UI should show that Local Anvil mode is enabled and should expect chain ID
`31337`.

## 6. Local UI E2E Flow

1. Connect MetaMask.
2. Switch MetaMask to Local Anvil.
3. Confirm the app shows ready state.
4. Deposit a small local ETH amount, for example `1`.
5. Confirm the casino internal balance increases.
6. Choose HEADS or TAILS.
7. Place a small bet, for example `0.1`.
8. Confirm the pending bet panel appears.
9. Copy the pending bet request ID from the UI.
10. Trigger mock VRF fulfillment from the terminal.
11. Confirm the result updates in the UI from contract state/events.
12. Withdraw remaining internal balance.

## 7. Trigger Mock VRF Fulfillment

Set the mock coordinator address and request id:

```bash
export LOCAL_MOCK_VRF_COORDINATOR=<local MockVRFCoordinatorV2Plus address>
export LOCAL_VRF_REQUEST_ID=<request id from pending bet UI>
export LOCAL_RANDOM_WORD=2
```

Then run:

```bash
pnpm --filter @crypto-casino/contracts local:fulfill
```

`LOCAL_RANDOM_WORD` controls the local result:

- even value, such as `2`: HEADS
- odd value, such as `1`: TAILS

This calls the mock coordinator on local Anvil, which then calls
`rawFulfillRandomWords()` on the local casino contract. The browser does not
fake the result.

## 8. Troubleshooting

- UI still expects Sepolia: confirm `NEXT_PUBLIC_ENABLE_LOCAL_ANVIL=true` is in
  `apps/web/.env.local`, then restart the dev server.
- Wallet on wrong network: switch MetaMask to chain ID `31337`.
- Missing contract address: set `NEXT_PUBLIC_COIN_FLIP_CASINO_ADDRESS` to the
  local deployed casino address and restart the frontend.
- Deploy script reverts with `WrongChain`: confirm Anvil is running on chain ID
  `31337` and the package script is using `http://127.0.0.1:8545`.
- Fulfill script reverts with `UnknownRequest`: confirm the request ID matches
  the pending bet in the UI and that the bet was placed against the same local
  casino deployment.
- Bet cannot be placed: confirm the casino has local bankroll and the wallet has
  deposited enough internal balance.
- UI does not refresh after fulfillment: refresh the page and confirm the
  pending bet panel no longer shows an active bet.

## 9. Safety Notes

- Sepolia deployment scripts remain separate.
- Production-like Chainlink VRF integration remains unchanged.
- Local scripts are for Anvil only and guard on chain ID `31337`.
- Do not use Anvil keys for real funds.
