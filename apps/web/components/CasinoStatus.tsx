"use client";

import { useCasinoBalance } from "@/hooks/useCasinoBalance";
import { sepoliaExplorerBaseUrl } from "@/lib/contracts/config";

function formatAddress(address?: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not available";
}

function formatEth(value?: string) {
  if (!value) return "Not available";

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return `${value} ETH`;

  return `${numericValue.toLocaleString("en-US", {
    maximumFractionDigits: 6,
  })} ETH`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 break-words font-mono text-sm text-slate-100">{value}</p>
    </div>
  );
}

export function CasinoStatus() {
  const casino = useCasinoBalance();
  const walletBalanceLabel = casino.isWalletBalanceLoading
    ? "Loading"
    : casino.walletBalanceFormatted
      ? `${casino.walletBalanceFormatted} ${casino.walletBalanceSymbol ?? "ETH"}`
      : "Not available";

  if (!casino.isConnected) {
    return (
      <section className="rounded-lg border border-slate-800 bg-slate-950 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Casino reads</p>
        <h2 className="mt-2 text-lg font-semibold text-white">Disconnected</h2>
        <p className="mt-2 text-sm text-slate-400">Connect a wallet to load Sepolia balances.</p>
      </section>
    );
  }

  if (!casino.isSepolia) {
    return (
      <section className="rounded-lg border border-slate-800 bg-slate-950 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Casino reads</p>
        <h2 className="mt-2 text-lg font-semibold text-white">Waiting for Sepolia</h2>
        <p className="mt-2 text-sm text-slate-400">Read-only contract data is paused until Sepolia is selected.</p>
      </section>
    );
  }

  if (casino.contractAddressStatus === "missing") {
    return (
      <section className="rounded-lg border border-slate-800 bg-slate-950 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Casino reads</p>
        <h2 className="mt-2 text-lg font-semibold text-white">Contract address missing</h2>
        <p className="mt-2 text-sm text-slate-400">
          Set NEXT_PUBLIC_COIN_FLIP_CASINO_ADDRESS to enable contract reads.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Stat label="Wallet ETH balance" value={walletBalanceLabel} />
          <Stat label="Connected chain" value={`Sepolia (${casino.chainId})`} />
        </div>
      </section>
    );
  }

  if (casino.contractAddressStatus === "invalid") {
    return (
      <section className="rounded-lg border border-red-500/40 bg-red-950/20 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-red-200">Config error</p>
        <h2 className="mt-2 text-lg font-semibold text-white">Invalid contract address</h2>
        <p className="mt-2 text-sm text-red-100">
          NEXT_PUBLIC_COIN_FLIP_CASINO_ADDRESS must be a valid Ethereum address.
        </p>
      </section>
    );
  }

  if (casino.criticalReadError || casino.contractReadError || casino.walletBalanceError) {
    return (
      <section className="rounded-lg border border-red-500/40 bg-red-950/20 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-red-200">Read error</p>
        <h2 className="mt-2 text-lg font-semibold text-white">Unable to load all data</h2>
        <p className="mt-2 text-sm text-red-100">
          {casino.criticalReadError ?? casino.contractReadError?.message ?? casino.walletBalanceError?.message}
        </p>
      </section>
    );
  }

  const isLoading = casino.isContractReadLoading || casino.isWalletBalanceLoading;
  const contractExplorerUrl = `${sepoliaExplorerBaseUrl}/address/${casino.contractAddress}`;

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-300">
            {isLoading ? "Loading" : "Ready"}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">Read-only casino status</h2>
        </div>
        <a
          className="font-mono text-sm text-emerald-300 underline-offset-4 hover:underline"
          href={contractExplorerUrl}
          rel="noreferrer"
          target="_blank"
        >
          {formatAddress(casino.contractAddress)}
        </a>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Wallet ETH balance" value={walletBalanceLabel} />
        <Stat label="Casino internal balance" value={formatEth(casino.internalBalanceFormatted)} />
        <Stat label="Casino paused" value={casino.status.paused === undefined ? "Loading" : String(casino.status.paused)} />
        <Stat label="Total bankroll" value={formatEth(casino.status.totalBankrollFormatted)} />
        <Stat label="Available bankroll" value={formatEth(casino.status.availableBankrollFormatted)} />
        <Stat label="Reserved payouts" value={formatEth(casino.status.reservedMaximumPayoutsFormatted)} />
        <Stat label="Total player balances" value={formatEth(casino.status.totalPlayerBalancesFormatted)} />
        <Stat label="Withdrawable bankroll" value={formatEth(casino.status.withdrawableBankrollFormatted)} />
        <Stat
          label="Refund timeout"
          value={
            casino.status.betRefundTimeout === undefined
              ? "Loading"
              : `${casino.status.betRefundTimeout.toString()} seconds`
          }
        />
        <Stat label="Owner" value={formatAddress(casino.status.owner)} />
        <Stat label="VRF coordinator" value={formatAddress(casino.status.vrfCoordinator)} />
        <Stat label="Connected chain" value={`Sepolia (${casino.chainId})`} />
      </div>
    </section>
  );
}
