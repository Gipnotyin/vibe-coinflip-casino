"use client";

import { FormEvent, useMemo, useState } from "react";
import { useCasinoBalance } from "@/hooks/useCasinoBalance";
import { useWithdraw } from "@/hooks/useWithdraw";
import { formatEth, validateEthAmount } from "@/lib/amounts";
import { TransactionStatus } from "@/components/TransactionStatus";

export function WithdrawCard() {
  const casino = useCasinoBalance();
  const withdrawTx = useWithdraw();
  const [amount, setAmount] = useState("");
  const validation = useMemo(
    () =>
      validateEthAmount(amount, {
        maxWei: casino.internalBalance,
        maxLabel: "casino balance",
      }),
    [amount, casino.internalBalance],
  );
  const isPending = withdrawTx.isAwaitingWallet || withdrawTx.isConfirming;
  const blockedReason =
    !casino.isConnected
      ? "Connect a wallet first."
      : !casino.isSepolia
        ? "Switch to Sepolia."
        : casino.contractAddressStatus !== "valid"
          ? "Configure a valid contract address."
          : !casino.isContractReadReady
            ? "Waiting for contract reads."
            : validation.error;
  const isDisabled = Boolean(blockedReason || isPending || !validation.wei);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validation.wei || isDisabled) return;

    withdrawTx.withdraw(validation.wei);
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-emerald-300">Withdraw</p>
      <h2 className="mt-2 text-lg font-semibold text-white">Return casino balance</h2>
      <p className="mt-2 text-sm text-slate-400">Withdrawals remain available even if deposits and bets are paused.</p>

      <form className="mt-5 flex flex-col gap-3" onSubmit={submit}>
        <label className="text-sm font-medium text-slate-200" htmlFor="withdraw-amount">
          Amount in ETH
        </label>
        <input
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
          id="withdraw-amount"
          inputMode="decimal"
          placeholder="0.05"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <div className="flex flex-col gap-1 text-xs text-slate-500">
          <span>Casino balance: {formatEth(casino.internalBalance)}</span>
          {blockedReason ? <span className="text-amber-200">{blockedReason}</span> : null}
        </div>
        <button
          className="inline-flex items-center justify-center rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isDisabled}
          type="submit"
        >
          {isPending ? "Withdrawing" : "Withdraw"}
        </button>
      </form>

      <TransactionStatus
        error={withdrawTx.error}
        hash={withdrawTx.hash}
        isAwaitingWallet={withdrawTx.isAwaitingWallet}
        isConfirming={withdrawTx.isConfirming}
        isSuccess={withdrawTx.isSuccess}
        successMessage="Withdrawal confirmed. Balances are refreshing."
      />
    </section>
  );
}
