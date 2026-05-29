"use client";

import { getFriendlyError } from "@/lib/amounts";
import { sepoliaExplorerBaseUrl } from "@/lib/contracts/config";

export function TransactionStatus({
  error,
  hash,
  isAwaitingWallet,
  isConfirming,
  isSuccess,
  successMessage,
}: {
  error?: unknown;
  hash?: `0x${string}`;
  isAwaitingWallet: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  successMessage: string;
}) {
  const errorMessage = getFriendlyError(error);

  if (!errorMessage && !hash && !isAwaitingWallet && !isConfirming && !isSuccess) return null;

  return (
    <div className="mt-4 rounded-md border border-slate-800 bg-slate-900/70 p-3 text-sm">
      {isAwaitingWallet ? <p className="text-slate-200">Waiting for wallet confirmation.</p> : null}
      {isConfirming ? <p className="text-slate-200">Transaction submitted. Waiting for Sepolia confirmation.</p> : null}
      {isSuccess ? <p className="text-emerald-300">{successMessage}</p> : null}
      {errorMessage ? <p className="text-red-300">{errorMessage}</p> : null}
      {hash ? (
        <a
          className="mt-2 inline-flex text-emerald-300 underline-offset-4 hover:underline"
          href={`${sepoliaExplorerBaseUrl}/tx/${hash}`}
          rel="noreferrer"
          target="_blank"
        >
          View transaction
        </a>
      ) : null}
    </div>
  );
}
