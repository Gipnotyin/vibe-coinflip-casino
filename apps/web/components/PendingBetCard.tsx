"use client";

import { useEffect, useMemo, useState } from "react";
import { sideLabels, useCasinoBalance } from "@/hooks/useCasinoBalance";
import { useRefundExpiredBet } from "@/hooks/useRefundExpiredBet";
import { formatEth } from "@/lib/amounts";
import { isLocalAnvilEnabled } from "@/lib/contracts/config";
import { TransactionStatus } from "@/components/TransactionStatus";

function formatTimestamp(seconds?: bigint) {
  if (seconds === undefined) return "Not available";

  return new Date(Number(seconds) * 1000).toLocaleString();
}

function BetStat({
  label,
  tone = "slate",
  value,
}: {
  label: string;
  tone?: "amber" | "emerald" | "red" | "slate";
  value: string;
}) {
  const colorClass =
    tone === "amber"
      ? "border-amber-400/20 text-amber-200"
      : tone === "emerald"
        ? "border-emerald-400/20 text-emerald-200"
        : tone === "red"
          ? "border-red-400/20 text-red-200"
          : "border-slate-700 text-slate-400";

  return (
    <div className={`rounded-md border bg-slate-950/60 p-4 ${colorClass}`}>
      <p className="text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className="mt-2 break-words font-mono text-sm text-white">{value}</p>
    </div>
  );
}

function RefreshButton({
  disabled,
  isRefreshing,
  onRefresh,
}: {
  disabled: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <button
      className="inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled || isRefreshing}
      type="button"
      onClick={onRefresh}
    >
      {isRefreshing ? "Refreshing" : "Refresh contract state"}
    </button>
  );
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
  const canReadContract = casino.canReadContract;
  const pendingRequestId = casino.pendingBet?.requestId;
  const refetchContractState = casino.refetchContractState;
  const refundPending = refundTx.isAwaitingWallet || refundTx.isConfirming;
  const refundDisabled =
    !casino.isConnected ||
    !casino.isTargetChain ||
    casino.contractAddressStatus !== "valid" ||
    !casino.isContractReadReady ||
    !casino.hasPendingBet ||
    !canRefund ||
    refundPending;
  const refreshDisabled = !canReadContract || casino.contractAddressStatus !== "valid";

  useEffect(() => {
    if (!canReadContract || pendingRequestId === undefined) return undefined;

    const timer = window.setInterval(() => {
      refetchContractState();
    }, 1500);

    return () => window.clearInterval(timer);
  }, [canReadContract, pendingRequestId, refetchContractState]);

  if (!casino.hasPendingBet || !casino.pendingBet) {
    if (casino.resolvedBet) {
      const won = casino.resolvedBet.side === casino.resolvedBet.result;
      const payoutLabel = won
        ? formatEth(casino.resolvedBet.maxPayout)
        : `0 ETH, lost stake ${formatEth(casino.resolvedBet.amount)}`;

      return (
        <section
          className={`rounded-lg border p-5 ${
            won ? "border-emerald-500/40 bg-emerald-950/20" : "border-red-500/40 bg-red-950/20"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p
                className={`text-xs font-medium uppercase tracking-wider ${
                  won ? "text-emerald-200" : "text-red-200"
                }`}
              >
                Latest bet result
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">{won ? "Win confirmed" : "Loss confirmed"}</h2>
              <p className={`mt-2 text-sm ${won ? "text-emerald-100" : "text-red-100"}`}>
                State is RESOLVED. The result below is loaded from contract state after VRF fulfillment.
              </p>
            </div>
            <RefreshButton
              disabled={refreshDisabled}
              isRefreshing={casino.isContractStateRefreshing}
              onRefresh={refetchContractState}
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <BetStat label="State" tone={won ? "emerald" : "red"} value="RESOLVED" />
            <BetStat label="Selected side" tone={won ? "emerald" : "red"} value={sideLabels[casino.resolvedBet.side]} />
            <BetStat label="Result side" tone={won ? "emerald" : "red"} value={sideLabels[casino.resolvedBet.result]} />
            <BetStat label="Outcome" tone={won ? "emerald" : "red"} value={won ? "WIN" : "LOSS"} />
            <BetStat label="Stake" tone={won ? "emerald" : "red"} value={formatEth(casino.resolvedBet.amount)} />
            <BetStat label="Payout" tone={won ? "emerald" : "red"} value={payoutLabel} />
            <BetStat label="Request ID" tone={won ? "emerald" : "red"} value={casino.resolvedBet.requestId.toString()} />
          </div>
        </section>
      );
    }

    if (casino.refundedBet) {
      return (
        <section className="rounded-lg border border-slate-700 bg-slate-950 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Latest bet result</p>
              <h2 className="mt-2 text-lg font-semibold text-white">Bet refunded</h2>
              <p className="mt-2 text-sm text-slate-400">
                State is REFUNDED. The original stake was returned after the refund timeout.
              </p>
            </div>
            <RefreshButton
              disabled={refreshDisabled}
              isRefreshing={casino.isContractStateRefreshing}
              onRefresh={refetchContractState}
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <BetStat label="State" value="REFUNDED" />
            <BetStat label="Selected side" value={sideLabels[casino.refundedBet.side]} />
            <BetStat label="Stake returned" value={formatEth(casino.refundedBet.amount)} />
            <BetStat label="Request ID" value={casino.refundedBet.requestId.toString()} />
          </div>
        </section>
      );
    }

    return (
      <section className="rounded-lg border border-slate-800 bg-slate-950 p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Pending bet</p>
        <h2 className="mt-2 text-lg font-semibold text-white">No active bet</h2>
        <p className="mt-2 text-sm text-slate-400">
          Placed bets will appear here while {isLocalAnvilEnabled ? "mock VRF" : "Chainlink VRF"} randomness is pending.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-amber-400/40 bg-amber-950/20 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-amber-200">Pending bet</p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Waiting for {isLocalAnvilEnabled ? "mock VRF" : "Chainlink VRF"}
          </h2>
          <p className="mt-2 text-sm text-amber-100">
            The result is not calculated in the browser. Contract reads refresh automatically while this bet is pending.
          </p>
        </div>
        <RefreshButton
          disabled={refreshDisabled}
          isRefreshing={casino.isContractStateRefreshing}
          onRefresh={refetchContractState}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BetStat label="State" tone="amber" value="PENDING" />
        <BetStat label="Selected side" tone="amber" value={sideLabels[casino.pendingBet.side]} />
        <BetStat label="Stake" tone="amber" value={formatEth(casino.pendingBet.amount)} />
        <BetStat label="Possible payout" tone="amber" value={formatEth(casino.pendingBet.maxPayout)} />
        <BetStat label="Request ID" tone="amber" value={casino.pendingBet.requestId.toString()} />
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
