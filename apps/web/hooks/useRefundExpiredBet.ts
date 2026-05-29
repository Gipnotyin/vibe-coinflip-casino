"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { coinFlipCasinoAbi, coinFlipCasinoAddress, sepoliaChainId } from "@/lib/contracts/config";

export function useRefundExpiredBet() {
  const queryClient = useQueryClient();
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    chainId: sepoliaChainId,
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

  function refundExpiredBet() {
    if (!coinFlipCasinoAddress) return;

    write.writeContract({
      address: coinFlipCasinoAddress,
      abi: coinFlipCasinoAbi,
      chainId: sepoliaChainId,
      functionName: "refundExpiredBet",
    });
  }

  return {
    refundExpiredBet,
    hash: write.data,
    error: write.error ?? receipt.error,
    isAwaitingWallet: write.isPending,
    isConfirming: receipt.isLoading,
    isSuccess: receipt.isSuccess,
    reset: write.reset,
  };
}
