"use client";

import { FormEvent, useMemo, useState } from "react";
import type { CoinSide } from "@/hooks/useCasinoBalance";
import { sideLabels, useCasinoBalance } from "@/hooks/useCasinoBalance";
import { usePlaceBet } from "@/hooks/usePlaceBet";
import { calculatePayoutWei, formatEth, validateEthAmount } from "@/lib/amounts";
import { TransactionStatus } from "@/components/TransactionStatus";

export function CoinFlipCard() {
  const casino = useCasinoBalance();
  const placeBetTx = usePlaceBet();
  const [side, setSide] = useState<CoinSide>(0);
  const [amount, setAmount] = useState("");
  const validation = useMemo(
    () =>
      validateEthAmount(amount, {
        maxWei: casino.internalBalance,
        maxLabel: "casino balance",
      }),
    [amount, casino.internalBalance],
  );
  const estimatedPayout = validation.wei ? calculatePayoutWei(validation.wei) : undefined;
  const bankrollError =
    estimatedPayout !== undefined &&
    casino.status.availableBankroll !== undefined &&
    estimatedPayout > casino.status.availableBankroll
      ? "Casino bankroll cannot cover the maximum payout."
      : undefined;
  const isPending = placeBetTx.isAwaitingWallet || placeBetTx.isConfirming;
  const blockedReason =
    !casino.isConnected
      ? "Connect a wallet first."
      : !casino.isSepolia
        ? "Switch to Sepolia."
        : casino.contractAddressStatus !== "valid"
          ? "Configure a valid contract address."
          : !casino.isContractReadReady
            ? "Waiting for contract reads."
            : casino.status.paused
              ? "New bets are paused by the contract."
              : casino.hasPendingBet
                ? "Resolve or refund the pending bet before placing another."
                : validation.error ?? bankrollError;
  const isDisabled = Boolean(blockedReason || isPending || !validation.wei);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validation.wei || isDisabled) return;

    placeBetTx.placeBet(side, validation.wei);
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-emerald-300">Coin flip</p>
      <h2 className="mt-2 text-lg font-semibold text-white">Place a bet</h2>
      <p className="mt-2 text-sm text-slate-400">
        Winning pays 1.9x the stake. The 5% house edge is the difference between fair 2x odds and the 1.9x payout.
      </p>

      <form className="mt-5 flex flex-col gap-4" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-2">
          {sideLabels.map((label, index) => (
            <button
              className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
                side === index
                  ? "border-emerald-300 bg-emerald-400 text-slate-950"
                  : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"
              }`}
              key={label}
              type="button"
              onClick={() => setSide(index as CoinSide)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-slate-200" htmlFor="bet-amount">
            Bet amount in ETH
          </label>
          <input
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
            id="bet-amount"
            inputMode="decimal"
            placeholder="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>

        <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
          <span>Casino balance: {formatEth(casino.internalBalance)}</span>
          <span>Estimated payout: {formatEth(estimatedPayout)}</span>
          <span>Available bankroll: {formatEth(casino.status.availableBankroll)}</span>
          <span>Selected side: {sideLabels[side]}</span>
        </div>
        {blockedReason ? <p className="text-xs text-amber-200">{blockedReason}</p> : null}

        <button
          className="inline-flex items-center justify-center rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isDisabled}
          type="submit"
        >
          {isPending ? "Placing bet" : "Place bet"}
        </button>
      </form>

      <TransactionStatus
        error={placeBetTx.error}
        hash={placeBetTx.hash}
        isAwaitingWallet={placeBetTx.isAwaitingWallet}
        isConfirming={placeBetTx.isConfirming}
        isSuccess={placeBetTx.isSuccess}
        successMessage="Bet transaction confirmed. Waiting for Chainlink VRF to resolve on-chain."
      />
    </section>
  );
}
