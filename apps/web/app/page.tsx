import { CasinoStatus } from "@/components/CasinoStatus";
import { CoinFlipCard } from "@/components/CoinFlipCard";
import { DepositCard } from "@/components/DepositCard";
import { NetworkGuard } from "@/components/NetworkGuard";
import { PendingBetCard } from "@/components/PendingBetCard";
import { WalletConnect } from "@/components/WalletConnect";
import { WithdrawCard } from "@/components/WithdrawCard";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-2 border-b border-slate-800 pb-5">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-300">Sepolia MVP</p>
          <h1 className="text-3xl font-semibold text-white">CoinFlip Casino Console</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-400">
            Wallet connection and read-only contract status for the Sepolia deployment.
          </p>
        </header>

        <WalletConnect />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)]">
          <NetworkGuard />
          <CasinoStatus />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <DepositCard />
          <WithdrawCard />
          <CoinFlipCard />
        </div>

        <PendingBetCard />
      </div>
    </main>
  );
}
