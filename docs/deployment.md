# Sepolia Deployment

This document covers Phase 4 contract deployment, verification, and ABI export.
It does not cover frontend UI implementation.

## Install Dependencies

From the repository root:

```bash
npm install --prefix packages/contracts --package-lock=false --no-audit --no-fund --ignore-scripts
```

The contracts package uses npm dependencies for OpenZeppelin, Chainlink VRF v2.5,
and forge-std imports used by Foundry scripts.

## Validate Contracts

```bash
cd packages/contracts
forge fmt --check
forge build
forge test -vvv
```

`CoinFlipCasino` uses `block.timestamp` only as a timeout gate for refunding
stuck pending bets. It is not used for randomness. Foundry may warn about this
timestamp comparison during `forge build`; that warning is acceptable for this
testnet MVP timeout check.

## Configure Sepolia Environment

Copy `.env.example` to `.env` and fill in Sepolia values:

```bash
cp .env.example .env
```

Required variables for deployment:

```bash
PRIVATE_KEY=
SEPOLIA_RPC_URL=
ETHERSCAN_API_KEY=
VRF_COORDINATOR=
VRF_KEY_HASH=
VRF_SUBSCRIPTION_ID=
VRF_CALLBACK_GAS_LIMIT=250000
VRF_REQUEST_CONFIRMATIONS=3
VRF_NATIVE_PAYMENT=false
INITIAL_BANKROLL_WEI=0
```

Do not commit `.env`. Use a Sepolia-only deployer key.

## Chainlink VRF v2.5 Setup

Official Chainlink VRF v2.5 docs:

- `https://docs.chain.link/vrf/v2-5/subscription/get-a-random-number`
- `https://docs.chain.link/vrf/v2-5/supported-networks`

The contract imports official Chainlink VRF v2.5 types from `@chainlink/contracts`:

```solidity
@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol
@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol
```

It does not inherit `VRFConsumerBaseV2Plus` because that base also brings its
own ownership implementation, while this project standardizes on OpenZeppelin
`Ownable`. The contract still uses Chainlink's official coordinator interface
and client request struct, and gates `rawFulfillRandomWords()` so only the
configured coordinator can fulfill randomness.

Use the Chainlink VRF subscription UI at `https://vrf.chain.link`:

1. Select Ethereum Sepolia.
2. Create or select a VRF v2.5 subscription.
3. Fund the subscription with LINK or native ETH depending on your chosen
   `VRF_NATIVE_PAYMENT` setting.
4. Set `VRF_SUBSCRIPTION_ID`, `VRF_COORDINATOR`, and `VRF_KEY_HASH` in `.env`.
5. After deploying `CoinFlipCasino`, add the deployed contract address as a
   consumer on the subscription.

The deployer cannot receive fulfilled randomness until the deployed contract is
registered as an authorized consumer for the subscription.

## Deploy To Sepolia

Load env vars, then run:

```bash
cd packages/contracts
source ../../.env
npm run deploy:sepolia
```

This runs:

```bash
forge script script/DeployCoinFlipCasino.s.sol:DeployCoinFlipCasino \
  --rpc-url sepolia \
  --broadcast \
  --verify \
  -vvvv
```

The script:

- reads all constructor and bankroll settings from env vars;
- deploys `CoinFlipCasino`;
- calls `fundBankroll()` if `INITIAL_BANKROLL_WEI > 0`;
- logs the deployed address, owner, and VRF configuration.

Do not broadcast unless the env vars are complete and the deployer wallet has
enough Sepolia ETH for gas and any initial bankroll.

## Verify On Etherscan

The deploy script includes `--verify`, so Etherscan verification should run as
part of deployment when `ETHERSCAN_API_KEY` is set.

If separate verification is needed:

```bash
cd packages/contracts
source ../../.env
npm run verify:sepolia -- <DEPLOYED_CONTRACT_ADDRESS> src/CoinFlipCasino.sol:CoinFlipCasino
```

If Etherscan cannot infer constructor arguments, use the verified deployment
broadcast JSON under `packages/contracts/broadcast/` to recover constructor
arguments and pass them to `forge verify-contract --constructor-args`.

## Fund The Casino Bankroll

The deployment script can fund the initial bankroll:

```bash
INITIAL_BANKROLL_WEI=1000000000000000000
```

The owner can also fund later by sending ETH through `fundBankroll()` on
Etherscan or with `cast send`.

The contract reserves the full 1.9x maximum payout for each pending bet. This is
intentionally conservative: it simplifies solvency guarantees and makes the
accounting invariant easy to reason about. It is less capital-efficient than
reserving only net exposure.

## Confirm The Contract Is Usable

After deployment:

1. Confirm `owner()` returns the deployer address.
2. Confirm `vrfConfig()` values match the intended Sepolia subscription.
3. Confirm `availableBankroll()` is greater than or equal to the maximum payout
   for the first intended test bet.
4. Add the deployed contract as a Chainlink VRF subscription consumer.
5. Deposit Sepolia ETH through `deposit()`.
6. Place a small bet with `placeBet()`.
7. Confirm Chainlink VRF fulfills the request and `BetResolved` is emitted.

If VRF fulfillment does not arrive after `BET_REFUND_TIMEOUT`, the player can
call `refundExpiredBet()` to recover the original stake.

## Export ABI For Frontend

Run:

```bash
cd packages/contracts
npm run export:abi
```

This runs `forge build` and writes:

```text
apps/web/lib/contracts/CoinFlipCasino.json
```

The frontend placeholder config at `apps/web/lib/contracts/config.ts` imports
that ABI and reads the deployed address from:

```bash
NEXT_PUBLIC_COIN_FLIP_CASINO_ADDRESS=
```

No React UI or wallet flow is implemented in Phase 4.
