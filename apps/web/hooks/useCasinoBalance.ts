"use client";

import { formatEther } from "viem";
import { useAccount, useBalance, useChainId, useReadContracts } from "wagmi";
import {
  coinFlipCasinoAbi,
  coinFlipCasinoAddress,
  coinFlipCasinoAddressStatus,
  sepoliaChainId,
} from "@/lib/contracts/config";

const contractReads = [
  { functionName: "balanceOf", args: [] },
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

function formatWei(value?: bigint) {
  return value === undefined ? undefined : formatEther(value);
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
      enabled: Boolean(isConnected && address),
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
            ...contractReads.slice(1).map((read) => ({
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
  const totalBankroll = successfulValue<bigint>(results[1]);
  const availableBankroll = successfulValue<bigint>(results[2]);
  const reservedMaximumPayouts = successfulValue<bigint>(results[3]);
  const totalPlayerBalances = successfulValue<bigint>(results[4]);
  const withdrawableBankroll = successfulValue<bigint>(results[5]);
  const paused = successfulValue<boolean>(results[6]);
  const owner = successfulValue<`0x${string}`>(results[7]);
  const vrfCoordinator = successfulValue<`0x${string}`>(results[8]);
  const betRefundTimeout = successfulValue<bigint>(results[9]);

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
    contractReadError: casinoReads.error,
    internalBalance,
    internalBalanceFormatted: formatWei(internalBalance),
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
