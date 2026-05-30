"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { targetChainId, targetChainName } from "@/lib/contracts/config";

export function NetworkGuard() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { error, isPending, switchChain } = useSwitchChain();

  if (!isConnected) {
    return (
      <section className="rounded-lg border border-slate-800 bg-slate-950 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Network</p>
        <h2 className="mt-2 text-lg font-semibold text-white">No wallet connected</h2>
        <p className="mt-2 text-sm text-slate-400">{targetChainName} status appears after wallet connection.</p>
      </section>
    );
  }

  if (chainId === targetChainId) {
    return (
      <section className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-emerald-300">Network ready</p>
        <h2 className="mt-2 text-lg font-semibold text-white">{targetChainName} connected</h2>
        <p className="mt-2 font-mono text-sm text-emerald-100">Chain ID {chainId}</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-amber-400/40 bg-amber-950/20 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-amber-200">Wrong network</p>
      <h2 className="mt-2 text-lg font-semibold text-white">Switch to {targetChainName}</h2>
      <p className="mt-2 text-sm text-amber-100">
        Connected chain ID {chainId}. This app reads the casino contract on {targetChainName} only.
      </p>
      <button
        className="mt-4 inline-flex items-center justify-center rounded-md bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="button"
        onClick={() => switchChain({ chainId: targetChainId })}
      >
        {isPending ? "Switching" : `Switch to ${targetChainName}`}
      </button>
      {error ? <p className="mt-3 text-sm text-red-200">{error.message}</p> : null}
    </section>
  );
}
