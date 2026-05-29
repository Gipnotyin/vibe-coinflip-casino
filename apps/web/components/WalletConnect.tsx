"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletConnect() {
  const { address, connector, isConnected } = useAccount();
  const { connect, connectors, error, isPending, variables } = useConnect();
  const { disconnect, isPending: isDisconnecting } = useDisconnect();

  if (isConnected && address) {
    return (
      <section className="rounded-lg border border-slate-800 bg-slate-950 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-300">Wallet connected</p>
            <p className="mt-2 font-mono text-lg text-white">{formatAddress(address)}</p>
            <p className="mt-1 text-sm text-slate-400">{connector?.name ?? "Connected wallet"}</p>
          </div>
          <button
            className="inline-flex items-center justify-center rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDisconnecting}
            type="button"
            onClick={() => disconnect()}
          >
            {isDisconnecting ? "Disconnecting" : "Disconnect"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Wallet disconnected</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Connect a wallet</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {connectors.map((walletConnector, index) => (
            <button
              className="inline-flex items-center justify-center rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              key={`${walletConnector.name}-${index}`}
              type="button"
              onClick={() => connect({ connector: walletConnector })}
            >
              {isPending && variables?.connector === walletConnector ? "Connecting" : walletConnector.name}
            </button>
          ))}
        </div>
      </div>
      {error ? <p className="mt-4 text-sm text-red-300">{error.message}</p> : null}
    </section>
  );
}
