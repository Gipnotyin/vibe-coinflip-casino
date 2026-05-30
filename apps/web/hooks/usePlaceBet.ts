"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import type { CoinSide } from "@/hooks/useCasinoBalance";
import { coinFlipCasinoAbi, coinFlipCasinoAddress, targetChainId } from "@/lib/contracts/config";

export function usePlaceBet() {
  const queryClient = useQueryClient();
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    chainId: targetChainId,
    hash: write.data,
    query: {
      enabled: Boolean(write.data),
    },
  });

  useEffect(() => {
    if (receipt.isSuccess) {
      void queryClient.invalidateQueries();
    }
  }, [queryClient, receipt.isSuccess]);

  function placeBet(side: CoinSide, amount: bigint) {
    if (!coinFlipCasinoAddress) return;

    write.writeContract({
      address: coinFlipCasinoAddress,
      abi: coinFlipCasinoAbi,
      chainId: targetChainId,
      functionName: "placeBet",
      args: [side, amount],
    });
  }

  return {
    placeBet,
    hash: write.data,
    error: write.error ?? receipt.error,
    isAwaitingWallet: write.isPending,
    isConfirming: receipt.isLoading,
    isSuccess: receipt.isSuccess,
    reset: write.reset,
  };
}
