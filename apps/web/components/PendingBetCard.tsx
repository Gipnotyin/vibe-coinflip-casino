"use client";

import { useEffect, useMemo, useState } from "react";
import { sideLabels, useCasinoBalance } from "@/hooks/useCasinoBalance";
import { useRefundExpiredBet } from "@/hooks/useRefundExpiredBet";
import { formatEth } from "@/lib/amounts";
import { TransactionStatus } from "@/components/TransactionStatus";

function formatTimestamp(seconds?: bigint) {
  if (seconds === undefined) return "Not available";

  return new Date(Number(seconds) * 1000).toLocaleString();
}

export function PendingBetCard() {
  const casino = useCasinoBalance();
  const refundTx = useRefundExpiredBet();
  const [nowSeconds, setNowSeconds] = useState(() => BigInt(Math.floor(Date.now() / 1000)));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowSeconds(BigInt(Math.floor(Date.now() / 1000)));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const secondsUntilRefund = useMemo(() => {
    if (!casino.refundAvailableAt) return undefined;
    if (nowSeconds >= casino.refundAvailableAt) return 0n;

    return casino.refundAvailableAt - nowSeconds;
  }, [casino.refundAvailableAt, nowSeconds]);
  const canRefund = secondsUntilRefund === 0n;
  const refundPending = refundTx.isAwaitingWallet || refundTx.isConfirming;
  const refundDisabled =
    !casino.isConnected ||
    !casino.isSepolia ||
    casino.contractAddressStatus !== "valid" ||
    !casino.isContractReadReady ||
    !casino.hasPendingBet ||
    !canRefund ||
    refundPending;

  if (!casino.hasPendingBet || !casino.pendingBet) {
    return (
      <section className="rounded-lg border border-slate-800 bg-slate-950 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Pending bet</p>
        <h2 className="mt-2 text-lg font-semibold text-white">No active bet</h2>
        <p className="mt-2 text-sm text-slate-400">
          Placed bets will appear here while Chainlink VRF randomness is pending.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-amber-400/40 bg-amber-950/20 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-amber-200">Pending bet</p>
      <h2 className="mt-2 text-lg font-semibold text-white">Waiting for Chainlink VRF</h2>
      <p className="mt-2 text-sm text-amber-100">
        The result is not calculated in the browser. It will appear only after the contract receives VRF fulfillment.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-amber-400/20 bg-slate-950/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-200">Selected side</p>
          <p className="mt-2 font-mono text-sm text-white">{sideLabels[casino.pendingBet.side]}</p>
        </div>
        <div className="rounded-md border border-amber-400/20 bg-slate-950/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-200">Stake</p>
          <p className="mt-2 font-mono text-sm text-white">{formatEth(casino.pendingBet.amount)}</p>
        </div>
        <div className="rounded-md border border-amber-400/20 bg-slate-950/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-200">Possible payout</p>
          <p className="mt-2 font-mono text-sm text-white">{formatEth(casino.pendingBet.maxPayout)}</p>
        </div>
        <div className="rounded-md border border-amber-400/20 bg-slate-950/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-200">Request ID</p>
          <p className="mt-2 break-words font-mono text-sm text-white">{casino.pendingBet.requestId.toString()}</p>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
        <p>Placed at: {formatTimestamp(casino.pendingBet.placedAt)}</p>
        <p>Refund available at: {formatTimestamp(casino.refundAvailableAt)}</p>
        <p>
          {secondsUntilRefund === undefined
            ? "Refund timer unavailable."
            : secondsUntilRefund === 0n
              ? "Refund timeout has passed."
              : `Refund available in ${secondsUntilRefund.toString()} seconds.`}
        </p>
        <button
          className="mt-4 inline-flex items-center justify-center rounded-md border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={refundDisabled}
          type="button"
          onClick={() => refundTx.refundExpiredBet()}
        >
          {refundPending ? "Refunding" : "Refund expired bet"}
        </button>
      </div>

      <TransactionStatus
        error={refundTx.error}
        hash={refundTx.hash}
        isAwaitingWallet={refundTx.isAwaitingWallet}
        isConfirming={refundTx.isConfirming}
        isSuccess={refundTx.isSuccess}
        successMessage="Refund confirmed. Casino balance is refreshing."
      />
    </section>
  );
}
