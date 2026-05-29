"use client";

import { formatEther, zeroAddress, type Address } from "viem";
import { useAccount, useBalance, useChainId, useReadContracts } from "wagmi";
import {
  coinFlipCasinoAbi,
  coinFlipCasinoAddress,
  coinFlipCasinoAddressStatus,
  sepoliaChainId,
} from "@/lib/contracts/config";

const contractReads = [
  { functionName: "balanceOf", args: [] },
  { functionName: "betOf", args: [] },
  { functionName: "totalBankroll", args: [] },
  { functionName: "availableBankroll", args: [] },
  { functionName: "reservedMaximumPayouts", args: [] },
  { functionName: "totalPlayerBalances", args: [] },
  { functionName: "withdrawableBankroll", args: [] },
  { functionName: "paused", args: [] },
  { functionName: "owner", args: [] },
  { functionName: "vrfCoordinator", args: [] },
  { functionName: "BET_REFUND_TIMEOUT", args: [] },
] as const;

export const sideLabels = ["HEADS", "TAILS"] as const;
export const betStateLabels = ["NONE", "PENDING", "RESOLVED", "REFUNDED"] as const;

export type CoinSide = 0 | 1;

export type CasinoBet = {
  player: Address;
  side: CoinSide;
  result: CoinSide;
  state: 0 | 1 | 2 | 3;
  amount: bigint;
  maxPayout: bigint;
  requestId: bigint;
  placedAt: bigint;
};

function successfulValue<T>(result: unknown): T | undefined {
  if (
    typeof result === "object" &&
    result !== null &&
    "status" in result &&
    result.status === "success" &&
    "result" in result
  ) {
    return result.result as T;
  }

  return undefined;
}

function failedCall(result: unknown) {
  return (
    typeof result === "object" &&
    result !== null &&
    "status" in result &&
    result.status === "failure"
  );
}

function formatWei(value?: bigint) {
  return value === undefined ? undefined : formatEther(value);
}

function normalizeBet(value: CasinoBet | readonly unknown[] | undefined): CasinoBet | undefined {
  if (!value) return undefined;

  if (Array.isArray(value)) {
    const betTuple = value as readonly unknown[];

    return {
      player: betTuple[0] as Address,
      side: Number(betTuple[1]) as CoinSide,
      result: Number(betTuple[2]) as CoinSide,
      state: Number(betTuple[3]) as CasinoBet["state"],
      amount: betTuple[4] as bigint,
      maxPayout: betTuple[5] as bigint,
      requestId: betTuple[6] as bigint,
      placedAt: betTuple[7] as bigint,
    };
  }

  return value as CasinoBet;
}

export function useCasinoBalance() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isSepolia = chainId === sepoliaChainId;
  const canReadContract = Boolean(isConnected && isSepolia && address && coinFlipCasinoAddress);

  const walletBalance = useBalance({
    address,
    chainId: sepoliaChainId,
    query: {
      enabled: Boolean(isConnected && address && isSepolia),
    },
  });

  const casinoReads = useReadContracts({
    allowFailure: true,
    contracts:
      canReadContract && address && coinFlipCasinoAddress
        ? [
            {
              address: coinFlipCasinoAddress,
              abi: coinFlipCasinoAbi,
              functionName: contractReads[0].functionName,
              args: [address],
              chainId: sepoliaChainId,
            },
            {
              address: coinFlipCasinoAddress,
              abi: coinFlipCasinoAbi,
              functionName: contractReads[1].functionName,
              args: [address],
              chainId: sepoliaChainId,
            },
            ...contractReads.slice(2).map((read) => ({
              address: coinFlipCasinoAddress,
              abi: coinFlipCasinoAbi,
              functionName: read.functionName,
              args: read.args,
              chainId: sepoliaChainId,
            })),
          ]
        : [],
    query: {
      enabled: canReadContract,
    },
  });

  const results = casinoReads.data ?? [];
  const internalBalance = successfulValue<bigint>(results[0]);
  const latestBet = normalizeBet(successfulValue<CasinoBet | readonly unknown[]>(results[1]));
  const totalBankroll = successfulValue<bigint>(results[2]);
  const availableBankroll = successfulValue<bigint>(results[3]);
  const reservedMaximumPayouts = successfulValue<bigint>(results[4]);
  const totalPlayerBalances = successfulValue<bigint>(results[5]);
  const withdrawableBankroll = successfulValue<bigint>(results[6]);
  const paused = successfulValue<boolean>(results[7]);
  const owner = successfulValue<`0x${string}`>(results[8]);
  const vrfCoordinator = successfulValue<`0x${string}`>(results[9]);
  const betRefundTimeout = successfulValue<bigint>(results[10]);
  const criticalReadLabels = [
    "internal balance",
    "latest bet",
    "total bankroll",
    "available bankroll",
    "reserved payouts",
    "total player balances",
    "withdrawable bankroll",
    "pause status",
  ];
  const failedCriticalRead = results
    .slice(0, criticalReadLabels.length)
    .findIndex((result) => failedCall(result));
  const criticalReadError =
    canReadContract && failedCriticalRead >= 0
      ? `Failed to read ${criticalReadLabels[failedCriticalRead]}.`
      : undefined;
  const isContractReadReady =
    canReadContract && !casinoReads.isLoading && !casinoReads.isPending && !criticalReadError;
  const pendingBet = latestBet?.state === 1 && latestBet.player !== zeroAddress ? latestBet : undefined;
  const refundAvailableAt =
    pendingBet && betRefundTimeout !== undefined ? pendingBet.placedAt + betRefundTimeout : undefined;

  return {
    address,
    chainId,
    isConnected,
    isSepolia,
    contractAddress: coinFlipCasinoAddress,
    contractAddressStatus: coinFlipCasinoAddressStatus,
    canReadContract,
    walletBalance: walletBalance.data?.value,
    walletBalanceFormatted: formatWei(walletBalance.data?.value),
    walletBalanceSymbol: walletBalance.data?.symbol,
    walletBalanceError: walletBalance.error,
    isWalletBalanceLoading: walletBalance.isLoading,
    isContractReadLoading: casinoReads.isLoading,
    isContractReadReady,
    contractReadError: casinoReads.error,
    criticalReadError,
    internalBalance,
    internalBalanceFormatted: formatWei(internalBalance),
    latestBet,
    pendingBet,
    hasPendingBet: Boolean(pendingBet),
    refundAvailableAt,
    status: {
      totalBankroll,
      totalBankrollFormatted: formatWei(totalBankroll),
      availableBankroll,
      availableBankrollFormatted: formatWei(availableBankroll),
      reservedMaximumPayouts,
      reservedMaximumPayoutsFormatted: formatWei(reservedMaximumPayouts),
      totalPlayerBalances,
      totalPlayerBalancesFormatted: formatWei(totalPlayerBalances),
      withdrawableBankroll,
      withdrawableBankrollFormatted: formatWei(withdrawableBankroll),
      paused,
      owner,
      vrfCoordinator,
      betRefundTimeout,
    },
  };
}
