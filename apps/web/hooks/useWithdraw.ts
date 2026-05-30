"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { coinFlipCasinoAbi, coinFlipCasinoAddress, targetChainId } from "@/lib/contracts/config";

export function useWithdraw() {
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

  function withdraw(amount: bigint) {
    if (!coinFlipCasinoAddress) return;

    write.writeContract({
      address: coinFlipCasinoAddress,
      abi: coinFlipCasinoAbi,
      chainId: targetChainId,
      functionName: "withdraw",
      args: [amount],
    });
  }

  return {
    withdraw,
    hash: write.data,
    error: write.error ?? receipt.error,
    isAwaitingWallet: write.isPending,
    isConfirming: receipt.isLoading,
    isSuccess: receipt.isSuccess,
    reset: write.reset,
  };
}
